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
import { VerifiedBadge, isVerifiedAuthor } from "./VerifiedBadge";
import { LockedPost } from "./LockedPost";
import { usePostUnlock } from "@/app/(hooks)/queries/use-social";

interface Props {
  post: SocialPost;
  qcId: string | null;
  /** Hides the bottom action bar — used in compact contexts */
  compact?: boolean;
  /** Indicates this card is being shown in a thread (single-post detail) */
  inThread?: boolean;
}

export function PostCard({ post, qcId, compact, inThread }: Props) {
  const router = useRouter();
  const profileHref = `/ecosystem/social/${post.authorHandle}` as Route;
  const postHref =
    `/ecosystem/social/${post.authorHandle}/${post.id}` as Route;
  const isRepost = post.repostOfPostId !== null;

  const isOwner = qcId !== null && qcId === post.authorQcId;
  const { data: hasUnlocked } = usePostUnlock(
    post.gated ? post.authorQcId : null,
    post.gated ? post.id : null,
    post.gated ? qcId : null,
  );
  const showLocked =
    post.gated && !isOwner && !hasUnlocked;

  const handleCardClick = (e: React.MouseEvent) => {
    if (inThread) return;
    const target = e.target as HTMLElement;
    if (target.closest("a, button")) return;
    router.push(postHref);
  };

  const body = (
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
          <Avatar src={post.authorAvatar} name={post.authorDisplayName} size={40} />
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
              {isVerifiedAuthor({
                handle: post.authorHandle,
                isPro: post.authorIsPro,
              }) && <VerifiedBadge size={14} />}
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

          {isRepost && (
            <div className="mt-1 mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Icon icon="solar:refresh-linear" className="w-3 h-3" />
              <span>Reposted</span>
            </div>
          )}

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
                post.media.length === 3 && "grid-cols-2 [&>:first-child]:row-span-2",
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

          {post.attachedTokenId && (
            <Link
              href={`/ecosystem/trade/${post.attachedTokenId}` as Route}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-xs text-foreground"
            >
              <Icon icon="solar:graph-up-bold" className="w-3.5 h-3.5 text-primary" />
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

  return body;
}
