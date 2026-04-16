"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { haptics } from "@/lib/haptics";
import { useIsSubscribed } from "@/app/(hooks)/queries/use-broadcasts";
import {
  subscribeToBroadcast,
  unsubscribeFromBroadcast,
} from "@/app/ecosystem/broadcasts/actions";

interface Props {
  broadcastId: string;
  qcId: string | null;
}

export function SubscribeButton({ broadcastId, qcId }: Props) {
  const queryClient = useQueryClient();
  const { data: isSubscribed } = useIsSubscribed(broadcastId, qcId);
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (!qcId) {
      toast.error("Still connecting — try again in a moment");
      return;
    }
    if (pending) return;
    setPending(true);
    haptics.medium();
    const action = isSubscribed
      ? unsubscribeFromBroadcast
      : subscribeToBroadcast;
    const res = await action({ broadcastId });
    if (res?.serverError) {
      toast.error(res.serverError);
    } else {
      queryClient.invalidateQueries({
        queryKey: ["broadcasts", "isSubscribed", broadcastId, qcId],
      });
      queryClient.invalidateQueries({
        queryKey: ["broadcasts", "subscriptions", qcId],
      });
    }
    setPending(false);
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={pending}
      variant={isSubscribed ? "outline" : "default"}
      className={`h-9 px-4 rounded-full font-semibold text-sm ${
        isSubscribed
          ? "bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#222]"
          : ""
      }`}
    >
      {pending ? (
        <ButtonLoader size="sm" />
      ) : isSubscribed ? (
        "Subscribed"
      ) : (
        "Subscribe"
      )}
    </Button>
  );
}
