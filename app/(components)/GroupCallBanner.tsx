"use client";

import { useEffect, useState } from "react";
import { useCallContext } from "@/app/(contexts)/CallContext";
import { listenToActiveGroupCall, type GroupCallDocument } from "@/lib/group-call";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

interface GroupCallBannerProps {
  chatId: string;
  groupName: string;
}

export default function GroupCallBanner({ chatId, groupName }: GroupCallBannerProps) {
  const { groupCallState, groupCallInfo, joinGroupCall } = useCallContext();
  const [activeCall, setActiveCall] = useState<{ id: string; data: GroupCallDocument } | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const unsub = listenToActiveGroupCall(chatId, setActiveCall);
    return () => unsub();
  }, [chatId]);

  // Don't show banner if no active call for this chat
  if (!activeCall) return null;

  // Don't show banner if we're already in this call
  const alreadyInCall = groupCallState === "active" && groupCallInfo?.callId === activeCall.id;
  if (alreadyInCall) return null;

  const participantCount = activeCall.data.participants.length;

  const handleJoin = async () => {
    setJoining(true);
    try {
      await joinGroupCall(chatId, groupName);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 border-b border-green-500/20">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-green-400 font-medium">
          Voice call · {participantCount} participant{participantCount !== 1 ? "s" : ""}
        </p>
      </div>
      <Button
        size="sm"
        onClick={handleJoin}
        disabled={joining}
        className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 h-7 rounded-full"
      >
        <Icon icon="solar:phone-bold" className="w-3.5 h-3.5 mr-1" />
        {joining ? "Joining..." : "Join"}
      </Button>
    </div>
  );
}
