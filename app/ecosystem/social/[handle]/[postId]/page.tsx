"use client";

import { use, useEffect, useRef } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import {
  usePostReplies,
  useSocialPost,
  useSocialProfileByHandle,
} from "@/app/(hooks)/queries/use-social";
import { PostCard } from "../../_components/PostCard";
import { PostActions } from "../../_components/PostActions";
import { EmptyState } from "../../_components/EmptyState";
import { RichContent } from "../../_components/RichContent";
import { Avatar } from "../../_components/Avatar";
import { formatRelative } from "../../_components/format";
import {
  VerifiedBadge,
  getVerificationKind,
} from "../../_components/VerifiedBadge";
import { recordSocialPostView } from "../../affinity-actions";

export default function SocialPostDetailPage({
  params,
}: {
  params: Promise<{ handle: string; postId: string }>;
}) {
  const { handle, postId } = use(params);
  useTelegramBackButton(`/ecosystem/social/${handle}` as `/${string}`);

  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;

  const { data: profile } = useSocialProfileByHandle(handle);
  const { data: post } = useSocialPost(profile?.id ?? null, postId);
  const replies = usePostReplies(profile?.id ?? null, postId);

  // One post-view affinity bump per (post, mount), gated on a 1.5s dwell.
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!post?.authorQcId || !post?.id || !qcId) return;
    if (qcId === post.authorQcId) return;
    const key = `${post.authorQcId}:${post.id}`;
    if (viewedRef.current === key) return;
    const t = setTimeout(() => {
      viewedRef.current = key;
      recordSocialPostView({
        authorQcId: post.authorQcId,
        postId: post.id,
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [post?.authorQcId, post?.id, qcId]);

  if (profile === undefined || post === undefined) {
    return (
      <div className="min-h-screen px-4 pt-6 pb-28">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (profile === null || post === null) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-28">
        <EmptyState
          icon="solar:document-broken-linear"
          title="Post not found"
          description="This post may have been deleted."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-bold">Post</h1>
      </header>

      <div className="bg-background">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <Avatar
            src={post.authorAvatar}
            name={post.authorDisplayName}
            size={44}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate inline-flex items-center gap-1">
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
            </p>
            <p className="text-xs text-muted-foreground">
              @{post.authorHandle}
            </p>
          </div>
        </div>
        <div className="px-4 pb-3">
          {post.content && (
            <div className="text-base">
              <RichContent content={post.content} />
            </div>
          )}
          {post.media.length > 0 && (
            <div className="mt-3 grid gap-1 grid-cols-1 rounded-2xl overflow-hidden">
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
          <p className="mt-3 text-xs text-muted-foreground">
            {formatRelative(post.createdAt)}
            {post.editedAt && " · edited"}
          </p>
          <div className="mt-3">
            <PostActions post={post} qcId={qcId} />
          </div>
        </div>
      </div>

      <div className="mt-2 px-4 pb-2 flex items-center gap-2">
        <p className="text-sm font-semibold">Replies</p>
        <span className="text-xs text-muted-foreground">
          {post.replyCount}
        </span>
      </div>

      {replies.data === undefined ? (
        <div className="px-4 py-4">
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : replies.data.length === 0 ? (
        <EmptyState
          icon="solar:chat-round-line-linear"
          title="No replies yet"
          description="Be the first to reply."
        />
      ) : (
        <div className="divide-y divide-border/30">
          {replies.data.map((r) => (
            <PostCard
              key={`${r.authorQcId}:${r.id}`}
              post={r}
              qcId={qcId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
