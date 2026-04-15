"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { haptics } from "@/lib/haptics";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import {
  useBroadcastByHandle,
  useBroadcastPost,
  useIsBroadcastAdmin,
} from "@/app/(hooks)/queries/use-broadcasts";
import { deletePost, recordPostView } from "../../actions";
import { ReactionBar } from "../../_components/ReactionBar";

function formatCount(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function BroadcastPostPage({
  params,
}: {
  params: Promise<{ handle: string; postId: string }>;
}) {
  const { handle, postId } = use(params);
  useTelegramBackButton(`/ecosystem/broadcasts/${handle}` as Route);

  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;

  const router = useRouter();
  const { data: broadcast } = useBroadcastByHandle(handle);
  const { data: post } = useBroadcastPost(broadcast?.id ?? null, postId);
  const { data: isAdmin } = useIsBroadcastAdmin(broadcast?.id ?? null, qcId);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!broadcast || deleting) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(true);
    haptics.medium();
    const res = await deletePost({ broadcastId: broadcast.id, postId });
    setDeleting(false);
    if (res?.serverError) {
      toast.error(res.serverError);
      haptics.error();
      return;
    }
    haptics.success();
    toast.success("Post deleted");
    router.replace(`/ecosystem/broadcasts/${handle}` as Route);
  };

  // Fire view once per (broadcast, post) per session. Server dedups across
  // sessions via the per-user viewers doc.
  const viewedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!broadcast?.id || !postId || !qcId) return;
    const key = `${broadcast.id}:${postId}`;
    if (viewedKeyRef.current === key) return;
    viewedKeyRef.current = key;
    void recordPostView({ broadcastId: broadcast.id, postId });
  }, [broadcast?.id, postId, qcId]);

  if (broadcast === undefined || post === undefined) {
    return (
      <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!broadcast || !post) {
    return (
      <div className="min-h-screen px-4 pt-10 pb-28 max-w-md mx-auto flex flex-col items-center text-center">
        <Icon
          icon="solar:chat-round-line-linear"
          className="w-12 h-12 text-muted-foreground/60 mb-3"
        />
        <p className="text-base font-semibold text-white">Post not found</p>
        <p className="text-sm text-muted-foreground mt-1">
          This post may have been deleted.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <header className="flex items-center gap-3 mb-4">
        <Avatar className="w-10 h-10">
          {broadcast.avatar ? (
            <AvatarImage src={broadcast.avatar} alt={broadcast.name} />
          ) : null}
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
            {getInitials(broadcast.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-white truncate">
              {broadcast.name}
            </span>
            {broadcast.verified && (
              <Icon
                icon="solar:verified-check-bold"
                className="w-4 h-4 text-primary"
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            @{broadcast.handle}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Delete post"
            className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-muted-foreground hover:text-red-400 hover:border-red-400/40 transition-colors flex items-center justify-center disabled:opacity-60"
          >
            {deleting ? (
              <ButtonLoader size="sm" />
            ) : (
              <Icon icon="lucide:trash-2" className="w-4 h-4" />
            )}
          </button>
        )}
      </header>

      <article className="rounded-2xl bg-[#111] border border-[#222] overflow-hidden">
        {post.media.length > 0 && (
          <div className="relative w-full aspect-video bg-[#0a0a0a]">
            <Image
              src={post.media[0]}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 448px) 100vw, 448px"
              unoptimized
            />
          </div>
        )}
        <div className="p-4">
          {post.content && (
            <p className="text-[15px] text-white whitespace-pre-wrap break-words">
              {post.content}
            </p>
          )}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-3">
            <span>
              {post.createdAt
                ? post.createdAt.toDate().toLocaleString()
                : ""}
            </span>
            {post.editedAt ? <span>· edited</span> : null}
            {post.viewCount > 0 && (
              <span className="flex items-center gap-1">
                ·
                <Icon icon="lucide:eye" className="w-3 h-3" />
                {formatCount(post.viewCount)} views
              </span>
            )}
          </div>
        </div>
        <div className="px-4 pb-4">
          <ReactionBar post={post} qcId={qcId} />
        </div>
      </article>
    </div>
  );
}
