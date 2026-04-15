"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { storage } from "@/app/(firebase)/client";
import { haptics } from "@/lib/haptics";
import {
  resizeToAspectJpeg,
  resizeToSquareJpeg,
} from "@/lib/image-resize";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import {
  useBroadcastByHandle,
  useIsBroadcastAdmin,
} from "@/app/(hooks)/queries/use-broadcasts";
import { z } from "zod";
import { updateBroadcast } from "../../actions";
import {
  BROADCAST_BIO_MAX,
  BROADCAST_NAME_MAX,
} from "@/lib/validations";

const metaSchema = z.object({
  name: z.string().min(1, "Name is required").max(BROADCAST_NAME_MAX),
  bio: z.string().max(BROADCAST_BIO_MAX),
});

export default function BroadcastManagePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  useTelegramBackButton(`/ecosystem/broadcasts/${handle}` as Route);

  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;

  const { data: broadcast } = useBroadcastByHandle(handle);
  const { data: isAdmin, isLoading: isAdminLoading } = useIsBroadcastAdmin(
    broadcast?.id ?? null,
    qcId,
  );

  const [savingMeta, setSavingMeta] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: { name: "", bio: "" },
    validators: { onSubmit: metaSchema },
    onSubmit: async ({ value }) => {
      if (!broadcast) return;
      const patch: { broadcastId: string; name?: string; bio?: string } = {
        broadcastId: broadcast.id,
      };
      if (value.name !== broadcast.name) patch.name = value.name;
      if (value.bio !== broadcast.bio) patch.bio = value.bio;
      if (patch.name === undefined && patch.bio === undefined) {
        toast.info("No changes to save");
        return;
      }
      setSavingMeta(true);
      haptics.medium();
      const res = await updateBroadcast(patch);
      setSavingMeta(false);
      if (res?.serverError) {
        toast.error(res.serverError);
        haptics.error();
        return;
      }
      haptics.success();
      toast.success("Saved");
    },
  });

  // Hydrate form once the broadcast arrives
  useEffect(() => {
    if (!broadcast) return;
    form.setFieldValue("name", broadcast.name);
    form.setFieldValue("bio", broadcast.bio ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcast?.id]);

  // Redirect non-admins
  useEffect(() => {
    if (broadcast && !isAdminLoading && isAdmin === false) {
      toast.error("You are not an admin of this broadcast");
      router.replace(`/ecosystem/broadcasts/${handle}` as Route);
    }
  }, [broadcast, isAdmin, isAdminLoading, handle, router]);

  const uploadImage = async (
    file: File,
    kind: "avatar" | "cover",
  ): Promise<string | null> => {
    if (!broadcast) return null;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return null;
    }
    const resized =
      kind === "avatar"
        ? await resizeToSquareJpeg(file, 512)
        : await resizeToAspectJpeg(file, 1200, 450);
    const path = `broadcasts/${broadcast.id}/${kind}/${Date.now()}.jpg`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, resized, { contentType: "image/jpeg" });
    return await getDownloadURL(ref);
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    if (!file || !broadcast) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(file, "avatar");
      if (!url) return;
      const res = await updateBroadcast({
        broadcastId: broadcast.id,
        avatar: url,
      });
      if (res?.serverError) throw new Error(res.serverError);
      queryClient.invalidateQueries({
        queryKey: ["broadcasts", "byHandle", handle],
      });
      haptics.success();
      toast.success("Avatar updated");
    } catch (err) {
      console.error("[manage] avatar upload failed:", err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
      haptics.error();
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (!file || !broadcast) return;
    setUploadingCover(true);
    try {
      const url = await uploadImage(file, "cover");
      if (!url) return;
      const res = await updateBroadcast({
        broadcastId: broadcast.id,
        coverImage: url,
      });
      if (res?.serverError) throw new Error(res.serverError);
      queryClient.invalidateQueries({
        queryKey: ["broadcasts", "byHandle", handle],
      });
      haptics.success();
      toast.success("Cover updated");
    } catch (err) {
      console.error("[manage] cover upload failed:", err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
      haptics.error();
    } finally {
      setUploadingCover(false);
    }
  };

  if (broadcast === undefined || isAdminLoading) {
    return (
      <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!broadcast || isAdmin === false) return null;

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:settings" className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Manage broadcast</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          @{broadcast.handle}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Handle can&apos;t be changed
        </p>
      </header>

      {/* Cover with upload overlay */}
      <section className="mb-5">
        <p className="text-sm font-semibold text-white mb-2">Cover</p>
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          className="relative block w-full h-36 rounded-2xl overflow-hidden bg-[#111] border border-[#222] hover:border-[#333] disabled:opacity-60"
        >
          {broadcast.coverImage ? (
            <Image
              src={broadcast.coverImage}
              alt="Cover"
              fill
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Icon icon="lucide:image" className="w-8 h-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-semibold gap-1.5">
            {uploadingCover ? (
              <ButtonLoader size="sm" />
            ) : (
              <>
                <Icon icon="lucide:upload" className="w-4 h-4" />
                Change cover
              </>
            )}
          </div>
        </button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCover}
          className="hidden"
        />
      </section>

      {/* Avatar with upload overlay */}
      <section className="mb-5">
        <p className="text-sm font-semibold text-white mb-2">Avatar</p>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="relative w-24 h-24 rounded-2xl overflow-hidden bg-[#111] border border-[#222] hover:border-[#333] disabled:opacity-60"
        >
          {broadcast.avatar ? (
            <Image
              src={broadcast.avatar}
              alt="Avatar"
              fill
              sizes="96px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Icon icon="lucide:user" className="w-8 h-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
            {uploadingAvatar ? (
              <ButtonLoader size="sm" />
            ) : (
              <Icon icon="lucide:upload" className="w-4 h-4" />
            )}
          </div>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatar}
          className="hidden"
        />
      </section>

      {/* Metadata form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field name="name">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Display name</FieldLabel>
                <FieldContent>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="bio">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Bio</FieldLabel>
                <FieldContent>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    rows={3}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <Button
            type="submit"
            disabled={savingMeta}
            className="w-full h-11 rounded-full font-semibold mt-2"
          >
            {savingMeta ? <ButtonLoader size="sm" /> : "Save changes"}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
