"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useForm, useStore } from "@tanstack/react-form";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { storage } from "@/app/(firebase)/client";
import { haptics } from "@/lib/haptics";
import { resizeToMaxEdgeJpeg } from "@/lib/image-resize";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import {
  useBroadcastByHandle,
  useIsBroadcastAdmin,
} from "@/app/(hooks)/queries/use-broadcasts";
import { publishPost } from "../../actions";
import { BROADCAST_POST_CONTENT_MAX } from "@/lib/validations";

export default function BroadcastComposePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const router = useRouter();
  useTelegramBackButton(`/ecosystem/broadcasts/${handle}` as Route);

  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;

  const { data: broadcast } = useBroadcastByHandle(handle);
  const { data: isAdmin, isLoading: isAdminLoading } = useIsBroadcastAdmin(
    broadcast?.id ?? null,
    qcId,
  );

  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: { content: "" },
    onSubmit: async ({ value }) => {
      if (!broadcast) return;
      const content = value.content.trim();
      if (!content && !uploadedUrl) {
        toast.error("Write something or attach an image");
        return;
      }
      setSubmitting(true);
      haptics.medium();
      const res = await publishPost({
        broadcastId: broadcast.id,
        content,
        media: uploadedUrl ? [uploadedUrl] : [],
      });
      setSubmitting(false);
      if (res?.serverError) {
        toast.error(res.serverError);
        haptics.error();
        return;
      }
      haptics.success();
      toast.success("Posted");
      router.replace(`/ecosystem/broadcasts/${handle}` as Route);
    },
  });

  const content = useStore(form.store, (s) => s.values.content);
  const remaining = BROADCAST_POST_CONTENT_MAX - content.length;

  // Redirect non-admins once we know for sure
  useEffect(() => {
    if (broadcast && !isAdminLoading && isAdmin === false) {
      toast.error("You are not an admin of this broadcast");
      router.replace(`/ecosystem/broadcasts/${handle}` as Route);
    }
  }, [broadcast, isAdmin, isAdminLoading, handle, router]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !broadcast) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    setIsUploading(true);
    try {
      const resized = await resizeToMaxEdgeJpeg(file, 1080, 0.85);
      const path = `broadcasts/${broadcast.id}/posts/${Date.now()}.jpg`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, resized, { contentType: "image/jpeg" });
      const url = await getDownloadURL(ref);

      // If replacing a previous upload, try to delete the old blob
      if (uploadedPath) {
        try {
          await deleteObject(storageRef(storage, uploadedPath));
        } catch {
          /* best-effort cleanup */
        }
      }

      setUploadedUrl(url);
      setUploadedPath(path);
      setPreview(URL.createObjectURL(resized));
      haptics.light();
    } catch (err) {
      console.error("[compose] upload failed:", err);
      toast.error("Upload failed");
      haptics.error();
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (uploadedPath) {
      try {
        await deleteObject(storageRef(storage, uploadedPath));
      } catch {
        /* best-effort */
      }
    }
    setUploadedUrl(null);
    setUploadedPath(null);
    setPreview(null);
  };

  if (broadcast === undefined || isAdminLoading) {
    return (
      <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!broadcast || isAdmin === false) {
    return null; // Effect will redirect
  }

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#222] sticky top-0 bg-background/95 backdrop-blur-sm z-20">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Posting to</p>
          <p className="text-sm font-semibold text-white truncate">
            @{broadcast.handle}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => form.handleSubmit()}
          disabled={submitting || isUploading}
          className="h-9 px-5 rounded-full font-semibold"
        >
          {submitting ? <ButtonLoader size="sm" /> : "Post"}
        </Button>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4">
        <form.Field name="content">
          {(field) => (
            <Textarea
              id={field.name}
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="Share an update…"
              rows={8}
              maxLength={BROADCAST_POST_CONTENT_MAX}
              className="resize-none bg-[#111] border-[#222] focus-visible:ring-primary/40"
            />
          )}
        </form.Field>
        <p
          className={`text-[11px] text-right tabular-nums ${
            remaining < 100 ? "text-amber-500" : "text-muted-foreground"
          }`}
        >
          {remaining}
        </p>

        {/* Image preview / upload slot */}
        {preview ? (
          <div className="relative w-full rounded-2xl overflow-hidden border border-[#222] bg-[#0a0a0a]">
            <Image
              src={preview}
              alt="Post image"
              width={800}
              height={600}
              className="w-full h-auto object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              aria-label="Remove image"
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90"
            >
              <Icon icon="lucide:x" className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full h-24 rounded-2xl border border-dashed border-[#333] bg-[#0f0f0f] flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-white hover:border-[#444] transition-colors disabled:opacity-60"
          >
            {isUploading ? (
              <>
                <ButtonLoader size="sm" />
                <span className="text-xs">Uploading…</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:image-plus" className="w-5 h-5" />
                <span className="text-xs">Add image (optional)</span>
              </>
            )}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  );
}
