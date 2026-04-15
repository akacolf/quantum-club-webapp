"use client";

import { useState } from "react";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { togglePostReaction } from "@/app/ecosystem/broadcasts/actions";
import {
  BROADCAST_REACTIONS,
  type BroadcastReaction,
} from "@/lib/validations";
import { useUserReaction } from "@/app/(hooks)/queries/use-broadcasts";
import type { BroadcastPost } from "@/lib/broadcasts-types";

interface Props {
  post: BroadcastPost;
  qcId: string | null;
}

export function ReactionBar({ post, qcId }: Props) {
  const { data: myReaction } = useUserReaction(post.broadcastId, post.id, qcId);
  const [pending, setPending] = useState<BroadcastReaction | null>(null);

  const handleReact = async (emoji: BroadcastReaction) => {
    if (!qcId) {
      toast.error("Sign in to react");
      return;
    }
    if (pending) return;
    setPending(emoji);
    haptics.light();
    const res = await togglePostReaction({
      broadcastId: post.broadcastId,
      postId: post.id,
      emoji,
    });
    setPending(null);
    if (res?.serverError) {
      toast.error(res.serverError);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {BROADCAST_REACTIONS.map((emoji) => {
        const count = post.reactions[emoji] ?? 0;
        const isMine = myReaction?.emoji === emoji;
        const isPending = pending === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleReact(emoji)}
            disabled={isPending}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${
              isMine
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-[#1a1a1a] border-[#2a2a2a] text-muted-foreground hover:border-[#3a3a3a]"
            } disabled:opacity-60`}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span className="font-medium tabular-nums">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
