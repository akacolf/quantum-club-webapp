"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useMyLike } from "@/app/(hooks)/queries/use-social";
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
  const [pending, setPending] = useState(false);
  const liked = myEmoji !== null && myEmoji !== undefined;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!qcId) {
      toast.error("Set up your social profile first");
      return;
    }
    if (pending) return;
    setPending(true);
    haptics.light();
    const res = liked
      ? await unlikeSocialPost({ authorQcId, postId })
      : await likeSocialPost({ authorQcId, postId, emoji: DEFAULT_EMOJI });
    if (res?.serverError) toast.error(res.serverError);
    setPending(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={cn(
        "flex items-center gap-1.5 text-xs transition-colors",
        liked ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon
        icon={liked ? "solar:fire-bold" : "solar:fire-linear"}
        className="w-4 h-4"
      />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
