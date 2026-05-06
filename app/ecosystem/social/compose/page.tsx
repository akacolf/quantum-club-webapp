"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useForm, useStore } from "@tanstack/react-form";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { storage } from "@/app/(firebase)/client";
import { haptics } from "@/lib/haptics";
import { resizeToMaxEdgeJpeg } from "@/lib/image-resize";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useNow } from "@/app/(hooks)/useNow";
import {
  useSocialPost,
  useSocialProfile,
} from "@/app/(hooks)/queries/use-social";
import {
  publishSocialPostSchema,
  SOCIAL_POST_CONTENT_MAX,
} from "@/lib/validations";
import { publishSocialPost } from "../actions";
import { Avatar } from "../_components/Avatar";
import { RichContent } from "../_components/RichContent";
import { useEnsureSocialProfile } from "../_components/use-ensure-profile";

const MAX_IMAGES_PER_POST = 4;

export default function SocialComposerPage() {
  useTelegramBackButton("/ecosystem/social");
  const router = useRouter();
  const searchParams = useSearchParams();
  const replyTo = searchParams.get("replyTo");
  const tokenId = searchParams.get("token");

  const [parentAuthorQcId, parentPostId] = replyTo
    ? (replyTo.split(":") as [string, string])
    : [null, null];

  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;

  const { data: profile } = useSocialProfile(qcId);
  const { data: parentPost } = useSocialPost(parentAuthorQcId, parentPostId);

  // Auto-onboard on direct visits to /compose so users without a profile yet
  // get one minted from their QC username + photo before posting.
  const { missingQcUsername } = useEnsureSocialProfile(qcId, profile);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const now = useNow();

  const isPro =
    profile?.proExpiresAt != null && profile.proExpiresAt.toMillis() > now;

  const form = useForm({
    defaultValues: {
      content: "",
      media: [] as string[],
      parentAuthorQcId,
      parentPostId,
      attachedTokenId: tokenId,
      gated: false,
      unlockPriceTon: null as number | null,
    },
    validators: { onSubmit: publishSocialPostSchema },
    onSubmit: async ({ value }) => {
      if (!profile) {
        toast.error("Setting up your profile — try again in a moment");
        return;
      }
      setSubmitting(true);
      haptics.medium();
      const res = await publishSocialPost(value);
      setSubmitting(false);
      if (res?.serverError) {
        toast.error(res.serverError);
        haptics.error();
        return;
      }
      if (res?.validationErrors) {
        toast.error("Please fix the errors and try again");
        return;
      }
      haptics.success();
      toast.success(value.parentPostId ? "Reply sent" : "Posted");
      if (value.parentPostId && parentPost) {
        router.replace(
          `/ecosystem/social/${parentPost.authorHandle}/${parentPost.id}` as Route,
        );
      } else if (res?.data?.postId && profile) {
        router.replace(
          `/ecosystem/social/${profile.handle}/${res.data.postId}` as Route,
        );
      } else {
        router.replace("/ecosystem/social");
      }
    },
  });

  const content = useStore(form.store, (s) => s.values.content);
  const media = useStore(form.store, (s) => s.values.media);
  const remaining = SOCIAL_POST_CONTENT_MAX - content.length;
  const canSubmit =
    (content.trim().length > 0 || media.length > 0) && remaining >= 0;

  const handleAddImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    appendMedia: (next: string[]) => void,
  ) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !qcId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    setUploadingMedia(true);
    try {
      const resized = await resizeToMaxEdgeJpeg(file, 1080, 0.85);
      const path = `social-posts/${qcId}/${Date.now()}.jpg`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, resized, { contentType: "image/jpeg" });
      const url = await getDownloadURL(ref);
      appendMedia([...media, url]);
      haptics.light();
    } catch (err) {
      console.error("[social compose] upload failed:", err);
      toast.error("Couldn't upload that image");
      haptics.error();
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMedia = async (
    url: string,
    setMedia: (next: string[]) => void,
  ) => {
    setMedia(media.filter((u) => u !== url));
    // Best-effort delete of the orphaned blob; server-side post doc never
    // referenced it, so a failure here is harmless.
    try {
      const decoded = decodeURIComponent(url);
      const match = decoded.match(/\/o\/(.+?)\?/);
      if (match) await deleteObject(storageRef(storage, match[1]));
    } catch {
      /* swallow */
    }
  };

  if (currentUser && profile === null) {
    if (missingQcUsername) {
      return (
        <div className="min-h-screen flex items-center justify-center pb-28 px-6 text-center">
          <div className="space-y-4 max-w-xs">
            <Icon
              icon="lucide:user-cog"
              className="w-12 h-12 text-muted-foreground mx-auto"
            />
            <div>
              <p className="font-semibold">Set up your QC profile first</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pick a QC username and add a photo. Your QC Social profile
                will use them automatically.
              </p>
            </div>
            <Link href={"/home/profile" as Route}>
              <Button className="rounded-full">Open profile</Button>
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center pb-28 px-6 text-center">
        <div className="space-y-3">
          <ButtonLoader size="md" />
          <p className="text-sm text-muted-foreground">
            Setting up your profile…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-muted-foreground"
        >
          Cancel
        </button>
        <Button
          type="button"
          onClick={() => form.handleSubmit()}
          disabled={!canSubmit || submitting}
          className="rounded-full h-9 px-4 text-sm font-semibold"
        >
          {submitting ? (
            <ButtonLoader size="sm" />
          ) : parentPostId ? (
            "Reply"
          ) : (
            "Post"
          )}
        </Button>
      </header>

      {parentPost && (
        <div className="px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Icon icon="solar:reply-linear" className="w-3.5 h-3.5" />
            Replying to @{parentPost.authorHandle}
          </div>
          <div className="flex gap-3 opacity-80">
            <Avatar
              src={parentPost.authorAvatar}
              name={parentPost.authorDisplayName}
              size={32}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">
                {parentPost.authorDisplayName}
              </p>
              <RichContent content={parentPost.content} size="sm" />
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 flex gap-3">
        <Avatar
          src={profile?.avatar ?? null}
          name={profile?.displayName ?? "?"}
          size={40}
        />
        <div className="flex-1">
          <form.Field name="content">
            {(field) => (
              <Textarea
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={parentPostId ? "Write a reply" : "What's on your mind?"}
                rows={6}
                maxLength={SOCIAL_POST_CONTENT_MAX}
                autoFocus
                className="resize-none text-base bg-transparent px-0 focus:outline-none"
              />
            )}
          </form.Field>
        </div>
      </div>

      {tokenId && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-2xl bg-secondary/50 text-xs flex items-center gap-2">
          <Icon
            icon="solar:graph-up-bold"
            className="w-4 h-4 text-primary"
          />
          <span className="text-muted-foreground">
            Sharing token —{" "}
            <span className="text-foreground font-mono">{tokenId.slice(0, 10)}…</span>
          </span>
        </div>
      )}

      {!parentPostId && isPro && (
        <form.Field name="gated">
          {(gatedField) => (
            <form.Field name="unlockPriceTon">
              {(priceField) => (
                <div className="mx-4 mb-3 rounded-2xl bg-secondary/40 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !gatedField.state.value;
                      gatedField.handleChange(next);
                      if (!next) priceField.handleChange(null);
                      else if (priceField.state.value === null)
                        priceField.handleChange(1);
                    }}
                    className="w-full flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Icon
                        icon="solar:lock-keyhole-minimalistic-bold"
                        className={
                          gatedField.state.value
                            ? "w-4 h-4 text-primary"
                            : "w-4 h-4 text-muted-foreground"
                        }
                      />
                      <span className="font-semibold">Lock this post</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {gatedField.state.value ? "On" : "Off"}
                    </span>
                  </button>
                  {gatedField.state.value && (
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={priceField.state.value ?? ""}
                        onChange={(e) =>
                          priceField.handleChange(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                          )
                        }
                        placeholder="Unlock price"
                        className="flex-1"
                      />
                      <span className="text-sm font-semibold text-muted-foreground">
                        TON
                      </span>
                    </div>
                  )}
                </div>
              )}
            </form.Field>
          )}
        </form.Field>
      )}

      <form.Field name="media">
        {(field) => (
          <>
            {field.state.value.length > 0 && (
              <div className="px-4 mb-3 grid grid-cols-2 gap-2">
                {field.state.value.map((url) => (
                  <div
                    key={url}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-secondary"
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="(max-width: 448px) 50vw, 220px"
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => removeMedia(url, (next) => field.handleChange(next))}
                      className="absolute top-1.5 right-1.5 size-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                      aria-label="Remove image"
                    >
                      <Icon icon="lucide:x" className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="px-4 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleAddImage(e, (next) => field.handleChange(next))
                  }
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={
                    uploadingMedia || field.state.value.length >= MAX_IMAGES_PER_POST
                  }
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Add image"
                >
                  {uploadingMedia ? (
                    <ButtonLoader size="sm" />
                  ) : (
                    <Icon icon="lucide:image-plus" className="w-5 h-5" />
                  )}
                </button>
                {field.state.value.length > 0 && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {field.state.value.length}/{MAX_IMAGES_PER_POST}
                  </span>
                )}
              </div>
              <span
                className={
                  remaining < 20
                    ? "text-xs font-semibold text-destructive tabular-nums"
                    : "text-xs text-muted-foreground tabular-nums"
                }
              >
                {remaining}
              </span>
            </div>
          </>
        )}
      </form.Field>
    </div>
  );
}
