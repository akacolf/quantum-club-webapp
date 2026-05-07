"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import type { SocialPost } from "@/lib/social-types";
import { Avatar } from "./Avatar";
import { RichContent } from "./RichContent";
import { PostActions } from "./PostActions";
import { formatRelative } from "./format";
import { VerifiedBadge, getVerificationKind } from "./VerifiedBadge";
import { LockedPost } from "./LockedPost";
import { useSocialPost, usePostUnlock } from "@/app/(hooks)/queries/use-social";

interface Props {
  post: SocialPost;
  qcId: string | null;
  /** Hides the bottom action bar — used in compact contexts */
  compact?: boolean;
  /** Indicates this card is being shown in a thread (single-post detail) */
  inThread?: boolean;
}

/**
 * Twitter-style post rendering.
 *
 * - Plain repost (no commentary): shows a "X reposted" header, then renders
 *   the *original* post body in full so the original content stays visible
 *   in the timeline. Actions and click navigation target the original.
 * - Quote repost (with commentary): renders the reposter's card normally
 *   with their comment, plus an embedded preview of the original below.
 * - Reply / regular post: renders as-is.
 */
export function PostCard({ post, qcId, compact, inThread }: Props) {
  const router = useRouter();
  const isRepost = post.repostOfPostId !== null;
  const isQuote = isRepost && post.content.trim().length > 0;
  const isPlainRepost = isRepost && !isQuote;

  const { data: originalPost } = useSocialPost(
    isRepost ? post.repostOfAuthorQcId : null,
    isRepost ? post.repostOfPostId : null,
  );

  if (isPlainRepost) {
    if (originalPost === undefined) {
      return (
        <article className="px-4 py-3 bg-background">
          <div className="h-16 animate-pulse rounded-xl bg-secondary/40" />
        </article>
      );
    }
    if (originalPost === null) {
      // Original was deleted — fall through to the legacy render so we
      // don't show an empty card.
      return (
        <article className="px-4 py-3 bg-background">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Icon icon="hugeicons:repost" className="w-3 h-3" />
            <span>
              {post.authorDisplayName || post.authorHandle} reposted a post
              that&apos;s no longer available
            </span>
          </div>
        </article>
      );
    }
    return (
      <article className="bg-background">
        <div className="px-4 pt-3 pb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon icon="hugeicons:repost" className="w-3 h-3" />
          <Link
            href={`/ecosystem/social/${post.authorHandle}` as Route}
            onClick={(e) => e.stopPropagation()}
            className="hover:text-foreground transition-colors"
            prefetch={false}
          >
            {post.authorDisplayName || post.authorHandle} reposted
          </Link>
        </div>
        <PostBody
          post={originalPost}
          qcId={qcId}
          compact={compact}
          inThread={inThread}
          router={router}
        />
      </article>
    );
  }

  return (
    <PostBody
      post={post}
      qcId={qcId}
      compact={compact}
      inThread={inThread}
      router={router}
      quoted={isQuote ? originalPost ?? undefined : undefined}
    />
  );
}

interface BodyProps {
  post: SocialPost;
  qcId: string | null;
  compact?: boolean;
  inThread?: boolean;
  router: ReturnType<typeof useRouter>;
  /** When set, render this post as an embedded card under the body */
  quoted?: SocialPost;
}

function PostBody({
  post,
  qcId,
  compact,
  inThread,
  router,
  quoted,
}: BodyProps) {
  const profileHref = `/ecosystem/social/${post.authorHandle}` as Route;
  const postHref =
    `/ecosystem/social/${post.authorHandle}/${post.id}` as Route;

  const isOwner = qcId !== null && qcId === post.authorQcId;
  const { data: hasUnlocked } = usePostUnlock(
    post.gated ? post.authorQcId : null,
    post.gated ? post.id : null,
    post.gated ? qcId : null,
  );
  const showLocked = post.gated && !isOwner && !hasUnlocked;

  const handleCardClick = (e: React.MouseEvent) => {
    if (inThread) return;
    const target = e.target as HTMLElement;
    if (target.closest("a, button")) return;
    router.push(postHref);
  };

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        "px-4 py-3 bg-background",
        !inThread && "active:bg-secondary/30 transition-colors cursor-pointer",
      )}
    >
      <div className="flex gap-3">
        <Link
          href={profileHref}
          onClick={(e) => e.stopPropagation()}
          prefetch={false}
        >
          <Avatar
            src={post.authorAvatar}
            name={post.authorDisplayName}
            size={40}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm">
            <Link
              href={profileHref}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold truncate inline-flex items-center gap-1"
              prefetch={false}
            >
              <span className="truncate">
                {post.authorDisplayName || post.authorHandle}
              </span>
              {(() => {
                const kind = getVerificationKind({
                  handle: post.authorHandle,
                  isPro: post.authorIsPro,
                });
                return kind ? <VerifiedBadge size={14} tone={kind} /> : null;
              })()}
            </Link>
            <span className="text-muted-foreground truncate">
              @{post.authorHandle}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground shrink-0">
              {formatRelative(post.createdAt)}
            </span>
            {post.editedAt && (
              <span className="text-muted-foreground text-xs">· edited</span>
            )}
          </div>

          {showLocked ? (
            <LockedPost
              authorQcId={post.authorQcId}
              postId={post.id}
              priceTon={post.unlockPriceTon ?? 0}
            />
          ) : post.content ? (
            <div className="mt-1">
              <RichContent content={post.content} />
            </div>
          ) : null}

          {!showLocked && post.media.length > 0 && (
            <div
              className={cn(
                "mt-2 grid gap-1 rounded-2xl overflow-hidden",
                post.media.length === 1 && "grid-cols-1",
                post.media.length === 2 && "grid-cols-2",
                post.media.length === 3 &&
                  "grid-cols-2 [&>:first-child]:row-span-2",
                post.media.length === 4 && "grid-cols-2",
              )}
            >
              {post.media.map((url) => (
                <div
                  key={url}
                  className="relative w-full aspect-video bg-secondary"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="(max-width: 448px) 100vw, 448px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}

          {quoted && (
            <Link
              href={
                `/ecosystem/social/${quoted.authorHandle}/${quoted.id}` as Route
              }
              onClick={(e) => e.stopPropagation()}
              prefetch={false}
              className="mt-3 block rounded-2xl border border-border/60 bg-secondary/20 px-3 py-2.5 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs">
                <Avatar
                  src={quoted.authorAvatar}
                  name={quoted.authorDisplayName}
                  size={20}
                />
                <span className="font-semibold truncate inline-flex items-center gap-1">
                  <span className="truncate">
                    {quoted.authorDisplayName || quoted.authorHandle}
                  </span>
                  {(() => {
                    const kind = getVerificationKind({
                      handle: quoted.authorHandle,
                      isPro: quoted.authorIsPro,
                    });
                    return kind ? <VerifiedBadge size={12} tone={kind} /> : null;
                  })()}
                </span>
                <span className="text-muted-foreground truncate">
                  @{quoted.authorHandle}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground shrink-0">
                  {formatRelative(quoted.createdAt)}
                </span>
              </div>
              {quoted.content && (
                <div className="mt-1.5">
                  <RichContent content={quoted.content} size="sm" />
                </div>
              )}
              {quoted.media.length > 0 && (
                <div className="mt-2 relative w-full aspect-video rounded-xl overflow-hidden bg-secondary">
                  <Image
                    src={quoted.media[0]}
                    alt=""
                    fill
                    sizes="(max-width: 448px) 100vw, 448px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
            </Link>
          )}

          {post.attachedTokenId && (
            <Link
              href={`/ecosystem/trade/${post.attachedTokenId}` as Route}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-xs text-foreground"
            >
              <Icon
                icon="solar:graph-up-bold"
                className="w-3.5 h-3.5 text-primary"
              />
              View token
            </Link>
          )}

          {!compact && (
            <div className="mt-2">
              <PostActions post={post} qcId={qcId} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
