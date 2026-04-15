"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  useTelegramBackButton(`/ecosystem/broadcasts/${handle}` as Route);

  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;

  const { data: broadcast } = useBroadcastByHandle(handle);
  const { data: isAdmin, isLoading: isAdminLoading } = useIsBroadcastAdmin(
    broadcast?.id ?? null,
    qcId,
  );

  // Pending image selections — staged in memory until Save is clicked.
  // We store the resized Blob (not the raw File) so the Save path doesn't
  // have to re-resize and we can preview the exact bytes that will upload.
  const [pendingAvatar, setPendingAvatar] = useState<Blob | null>(null);
  const [pendingCover, setPendingCover] = useState<Blob | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Once we've seen a valid broadcast, a later transient null means the
  // cache was briefly cleared (e.g. a listener hiccup) — not a real
  // "not found". Treat it as loading instead of blanking the page.
  const hasSeenBroadcast = useRef(false);
  useEffect(() => {
    if (broadcast) hasSeenBroadcast.current = true;
  }, [broadcast]);

  // Revoke object URLs on unmount / replacement to avoid leaks.
  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm({
    defaultValues: { name: "", bio: "" },
    validators: { onSubmit: metaSchema },
    onSubmit: async ({ value }) => {
      if (!broadcast) return;

      const nameChanged = value.name !== broadcast.name;
      const bioChanged = value.bio !== (broadcast.bio ?? "");
      const hasPendingAvatar = pendingAvatar !== null;
      const hasPendingCover = pendingCover !== null;

      if (
        !nameChanged &&
        !bioChanged &&
        !hasPendingAvatar &&
        !hasPendingCover
      ) {
        toast.info("No changes to save");
        return;
      }

      setSaving(true);
      haptics.medium();
      try {
        // Upload any pending images first, then patch the broadcast doc in
        // a single atomic update. If an upload fails, no Firestore write
        // happens and the local previews stay so the user can retry.
        const patch: {
          broadcastId: string;
          name?: string;
          bio?: string;
          avatar?: string;
          coverImage?: string;
        } = { broadcastId: broadcast.id };

        if (hasPendingAvatar) {
          const path = `broadcasts/${broadcast.id}/avatar/${Date.now()}.jpg`;
          const ref = storageRef(storage, path);
          await uploadBytes(ref, pendingAvatar, {
            contentType: "image/jpeg",
          });
          patch.avatar = await getDownloadURL(ref);
        }
        if (hasPendingCover) {
          const path = `broadcasts/${broadcast.id}/cover/${Date.now()}.jpg`;
          const ref = storageRef(storage, path);
          await uploadBytes(ref, pendingCover, {
            contentType: "image/jpeg",
          });
          patch.coverImage = await getDownloadURL(ref);
        }
        if (nameChanged) patch.name = value.name;
        if (bioChanged) patch.bio = value.bio;

        const res = await updateBroadcast(patch);
        if (res?.serverError) throw new Error(res.serverError);

        // Clear pending state now that the doc has the canonical URLs.
        // The onSnapshot listener will repaint the previews from the
        // saved broadcast doc.
        if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
        if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
        setPendingAvatar(null);
        setPendingCover(null);
        setAvatarPreviewUrl(null);
        setCoverPreviewUrl(null);

        haptics.success();
        toast.success("Saved");
        router.replace(`/ecosystem/broadcasts/${handle}` as Route);
      } catch (err) {
        console.error("[manage] save failed:", err);
        toast.error(err instanceof Error ? err.message : "Save failed");
        haptics.error();
      } finally {
        setSaving(false);
      }
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

  const stageImage = async (
    file: File,
    kind: "avatar" | "cover",
  ): Promise<{ blob: Blob; previewUrl: string } | null> => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return null;
    }
    try {
      const blob =
        kind === "avatar"
          ? await resizeToSquareJpeg(file, 512)
          : await resizeToAspectJpeg(file, 1200, 450);
      return { blob, previewUrl: URL.createObjectURL(blob) };
    } catch (err) {
      console.error("[manage] resize failed:", err);
      toast.error("Couldn't process image");
      return null;
    }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    if (!file) return;
    const staged = await stageImage(file, "avatar");
    if (!staged) return;
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setPendingAvatar(staged.blob);
    setAvatarPreviewUrl(staged.previewUrl);
    haptics.light();
  };

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (!file) return;
    const staged = await stageImage(file, "cover");
    if (!staged) return;
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setPendingCover(staged.blob);
    setCoverPreviewUrl(staged.previewUrl);
    haptics.light();
  };

  const stillLoading =
    broadcast === undefined ||
    isAdminLoading ||
    (broadcast === null && hasSeenBroadcast.current);

  if (stillLoading) {
    return (
      <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!broadcast || isAdmin === false) return null;

  const displayedAvatar = avatarPreviewUrl ?? broadcast.avatar;
  const displayedCover = coverPreviewUrl ?? broadcast.coverImage;

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
        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm font-semibold text-white">Cover</p>
          {pendingCover && (
            <Badge className="h-4 px-1.5 text-[9px] font-semibold bg-primary/15 text-primary border-0 leading-none">
              Unsaved
            </Badge>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground/70 tabular-nums">
            1200 × 450
          </span>
        </div>
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={saving}
          className="relative block w-full h-36 rounded-2xl overflow-hidden bg-[#111] border border-[#222] hover:border-[#333] disabled:opacity-60"
        >
          {displayedCover ? (
            <Image
              src={displayedCover}
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
            <Icon icon="lucide:upload" className="w-4 h-4" />
            Change cover
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
        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm font-semibold text-white">Avatar</p>
          {pendingAvatar && (
            <Badge className="h-4 px-1.5 text-[9px] font-semibold bg-primary/15 text-primary border-0 leading-none">
              Unsaved
            </Badge>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground/70 tabular-nums">
            512 × 512
          </span>
        </div>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={saving}
          className="relative w-24 h-24 rounded-2xl overflow-hidden bg-[#111] border border-[#222] hover:border-[#333] disabled:opacity-60"
        >
          {displayedAvatar ? (
            <Image
              src={displayedAvatar}
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
            <Icon icon="lucide:upload" className="w-4 h-4" />
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
            disabled={saving}
            className="w-full h-11 rounded-full font-semibold mt-2"
          >
            {saving ? <ButtonLoader size="sm" /> : "Save changes"}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
