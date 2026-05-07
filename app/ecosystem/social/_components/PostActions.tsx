"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import type { SocialPost } from "@/lib/social-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMyRepost } from "@/app/(hooks)/queries/use-social";
import { LikeButton } from "./LikeButton";
import { repostSocialPost, undoSocialRepost } from "../actions";

interface Props {
  post: SocialPost;
  qcId: string | null;
}

/**
 * Bottom action bar of a post: reply, repost, like, view-count. Reply and
 * Quote navigate to the composer; repost / undo-repost mutate via server
 * actions. Reposting is one-shot — tapping again undoes.
 */
export function PostActions({ post, qcId }: Props) {
  const router = useRouter();
  const [pendingRepost, setPendingRepost] = useState(false);
  const { data: myRepostId } = useMyRepost(qcId, post.authorQcId, post.id);
  const hasReposted = myRepostId !== null && myRepostId !== undefined;

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

  const handlePlainRepost = async () => {
    if (!qcId) {
      toast.error("Set up your social profile first");
      return;
    }
    if (pendingRepost) return;
    setPendingRepost(true);
    haptics.medium();
    const res = await repostSocialPost({
      authorQcId: post.authorQcId,
      postId: post.id,
      comment: "",
    });
    if (res?.serverError) toast.error(res.serverError);
    else if (res?.data?.existing) toast.info("You already reposted this");
    else toast.success("Reposted");
    setPendingRepost(false);
  };

  const handleQuote = () => {
    if (!qcId) {
      toast.error("Set up your social profile first");
      return;
    }
    haptics.light();
    router.push(
      `/ecosystem/social/compose?quote=${post.authorQcId}:${post.id}` as Route,
    );
  };

  const handleUndoRepost = async () => {
    if (!qcId) return;
    if (pendingRepost) return;
    setPendingRepost(true);
    haptics.light();
    const res = await undoSocialRepost({
      authorQcId: post.authorQcId,
      postId: post.id,
    });
    if (res?.serverError) toast.error(res.serverError);
    else toast.success("Repost removed");
    setPendingRepost(false);
  };

  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <button
        type="button"
        onClick={handleReply}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Icon icon="mdi-light:comment" className="w-4 h-4" />
        <span className="tabular-nums">{post.replyCount}</span>
      </button>
      {hasReposted ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleUndoRepost();
          }}
          disabled={pendingRepost}
          className={cn(
            "flex items-center gap-1.5 text-xs text-primary transition-colors",
            pendingRepost && "opacity-60",
          )}
          aria-label="Undo repost"
        >
          <Icon icon="hugeicons:repost" className="w-4 h-4" />
          <span className="tabular-nums">{post.repostCount}</span>
        </button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              disabled={pendingRepost}
              className={cn(
                "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors",
                pendingRepost && "opacity-60",
              )}
            >
              <Icon icon="hugeicons:repost" className="w-4 h-4" />
              <span className="tabular-nums">{post.repostCount}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            onClick={(e) => e.stopPropagation()}
            className="min-w-[10rem]"
          >
            <DropdownMenuItem onSelect={handlePlainRepost}>
              <Icon icon="hugeicons:repost" className="w-4 h-4 mr-2" />
              Repost
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleQuote}>
              <Icon
                icon="solar:pen-new-square-linear"
                className="w-4 h-4 mr-2"
              />
              Quote
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <LikeButton
        qcId={qcId}
        authorQcId={post.authorQcId}
        postId={post.id}
        count={totalLikes}
      />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon icon="solar:eye-linear" className="w-4 h-4" />
        <span className="tabular-nums">{post.viewCount}</span>
      </div>
    </div>
  );
}
