"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import type { SocialPost } from "@/lib/social-types";
import { LikeButton } from "./LikeButton";
import { repostSocialPost } from "../actions";

interface Props {
  post: SocialPost;
  qcId: string | null;
}

/**
 * Bottom action bar of a post: reply, repost, like, share. Reply and share
 * navigate; repost and like mutate via server actions.
 */
export function PostActions({ post, qcId }: Props) {
  const router = useRouter();
  const [reposting, setReposting] = useState(false);

  const totalLikes = Object.values(post.reactions).reduce(
    (sum, n) => sum + (n ?? 0),
    0,
  );

  const handleReply = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    haptics.light();
    router.push(
      `/ecosystem/social/compose?replyTo=${post.authorQcId}:${post.id}` as Route,
    );
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!qcId) {
      toast.error("Set up your social profile first");
      return;
    }
    if (reposting) return;
    setReposting(true);
    haptics.medium();
    const res = await repostSocialPost({
      authorQcId: post.authorQcId,
      postId: post.id,
      comment: "",
    });
    if (res?.serverError) toast.error(res.serverError);
    else toast.success("Reposted");
    setReposting(false);
  };

  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <button
        type="button"
        onClick={handleReply}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Icon icon="solar:chat-round-line-linear" className="w-4 h-4" />
        <span className="tabular-nums">{post.replyCount}</span>
      </button>
      <button
        type="button"
        onClick={handleRepost}
        disabled={reposting}
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors",
          reposting && "opacity-60",
        )}
      >
        <Icon icon="solar:refresh-linear" className="w-4 h-4" />
        <span className="tabular-nums">{post.repostCount}</span>
      </button>
      <LikeButton
        qcId={qcId}
        authorQcId={post.authorQcId}
        postId={post.id}
        count={totalLikes}
      />
      {post.viewCount > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon icon="solar:eye-linear" className="w-4 h-4" />
          <span className="tabular-nums">{post.viewCount}</span>
        </div>
      )}
    </div>
  );
}
