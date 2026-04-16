"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { haptics } from "@/lib/haptics";
import { useBroadcastSubscriptionStatus } from "@/app/(hooks)/queries/use-broadcasts";
import { setBroadcastMute } from "@/app/ecosystem/broadcasts/actions";

interface Props {
  broadcastId: string;
  qcId: string | null;
}

export function MuteButton({ broadcastId, qcId }: Props) {
  const { data } = useBroadcastSubscriptionStatus(broadcastId, qcId);
  const [pending, setPending] = useState(false);

  // Only show once the user is actually subscribed — mute is meaningless
  // otherwise. We hide rather than disable so the row stays visually clean
  // when the user is in an "explore" state on someone else's channel.
  if (!data?.subscribed) return null;

  const muted = data.muted;

  const handleClick = async () => {
    if (pending) return;
    setPending(true);
    haptics.light();
    const res = await setBroadcastMute({ broadcastId, muted: !muted });
    setPending(false);
    if (res?.serverError) {
      toast.error(res.serverError);
      haptics.error();
      return;
    }
    // Listener updates the cache, no manual invalidate needed.
    toast.success(muted ? "Notifications on" : "Muted");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={muted ? "Unmute broadcast" : "Mute broadcast"}
      className="h-9 w-9 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-muted-foreground hover:text-white hover:border-[#3a3a3a] transition-colors flex items-center justify-center disabled:opacity-60"
    >
      {pending ? (
        <ButtonLoader size="sm" />
      ) : (
        <Icon
          icon={muted ? "lucide:bell-off" : "lucide:bell"}
          className="w-4 h-4"
        />
      )}
    </button>
  );
}
