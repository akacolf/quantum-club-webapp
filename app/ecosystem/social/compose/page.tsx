"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useForm, useStore } from "@tanstack/react-form";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { haptics } from "@/lib/haptics";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
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

  const [submitting, setSubmitting] = useState(false);

  const isPro =
    profile?.proExpiresAt != null &&
    profile.proExpiresAt.toMillis() > Date.now();

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
        toast.error("Set up your social profile first");
        router.push("/ecosystem/social/onboarding" as Route);
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
  const remaining = SOCIAL_POST_CONTENT_MAX - content.length;
  const canSubmit = content.trim().length > 0 && remaining >= 0;

  if (currentUser && profile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-28 px-6 text-center">
        <div className="space-y-4">
          <Icon
            icon="solar:user-plus-rounded-linear"
            className="w-14 h-14 text-muted-foreground mx-auto"
          />
          <div>
            <p className="font-semibold">Claim your handle first</p>
            <p className="text-sm text-muted-foreground mt-1">
              You need a profile before you can post.
            </p>
          </div>
          <Button
            className="rounded-full"
            onClick={() => router.replace("/ecosystem/social/onboarding" as Route)}
          >
            Get started
          </Button>
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

      <div className="px-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Media uploads land in the next milestone — buttons reserved */}
          <button
            type="button"
            disabled
            className="p-2 text-muted-foreground/40 disabled:cursor-not-allowed"
            aria-label="Add image (coming soon)"
          >
            <Icon icon="solar:gallery-linear" className="w-5 h-5" />
          </button>
          <button
            type="button"
            disabled
            className="p-2 text-muted-foreground/40 disabled:cursor-not-allowed"
            aria-label="Add poll (coming soon)"
          >
            <Icon icon="solar:chart-square-linear" className="w-5 h-5" />
          </button>
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
    </div>
  );
}
