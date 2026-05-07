"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useMyLike } from "@/app/(hooks)/queries/use-social";
import { useQueryClient } from "@tanstack/react-query";
import type { SocialReaction } from "@/lib/validations";
import { likeSocialPost, unlikeSocialPost } from "../actions";

interface Props {
  qcId: string | null;
  authorQcId: string;
  postId: string;
  count: number;
}

const DEFAULT_EMOJI = "🔥" as const;

export function LikeButton({ qcId, authorQcId, postId, count }: Props) {
  const { data: myEmoji } = useMyLike(qcId, authorQcId, postId);
  const queryClient = useQueryClient();
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [optimisticDelta, setOptimisticDelta] = useState(0);

  const serverLiked = myEmoji !== null && myEmoji !== undefined;
  const liked = optimisticLiked ?? serverLiked;
  const displayedCount = Math.max(0, count + optimisticDelta);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!qcId) {
      toast.error("Set up your social profile first");
      return;
    }
    const next = !liked;
    haptics.light();

    // Optimistic UI: flip both the icon state and the local count.
    setOptimisticLiked(next);
    setOptimisticDelta((d) => d + (next ? 1 : -1));
    queryClient.setQueryData(
      ["social", "myLike", qcId, authorQcId, postId],
      next ? (DEFAULT_EMOJI as SocialReaction) : null,
    );

    const res = next
      ? await likeSocialPost({ authorQcId, postId, emoji: DEFAULT_EMOJI })
      : await unlikeSocialPost({ authorQcId, postId });

    if (res?.serverError) {
      // Roll back on failure — listener will re-sync the canonical state.
      setOptimisticLiked(!next);
      setOptimisticDelta((d) => d - (next ? 1 : -1));
      queryClient.setQueryData(
        ["social", "myLike", qcId, authorQcId, postId],
        next ? null : (DEFAULT_EMOJI as SocialReaction),
      );
      toast.error(res.serverError);
      return;
    }

    // Once the listener catches up, drop the optimistic overlay so the
    // post's actual reactions counter takes over.
    setTimeout(() => {
      setOptimisticLiked(null);
      setOptimisticDelta(0);
    }, 600);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1.5 text-xs transition-colors",
        liked ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon
        icon={liked ? "icon-park-solid:like" : "icon-park-outline:like"}
        className="w-4 h-4"
      />
      <span className="tabular-nums">{displayedCount}</span>
    </button>
  );
}
