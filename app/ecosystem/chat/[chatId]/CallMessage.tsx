"use client";

import { Icon } from "@iconify/react";
import { useCallContext } from "@/app/(contexts)/CallContext";
import type { CallStatus } from "@/lib/webrtc";

interface CallMessageProps {
  callId: string;
  status: CallStatus;
  duration: number;
  callerId: string;
  calleeId: string;
  isMine: boolean;
  chatId: string;
  remoteUserId: string;
  remoteName: string;
}

function formatCallDuration(seconds: number): string {
  if (seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CallMessage({
  status,
  duration,
  isMine,
  chatId,
  remoteUserId,
  remoteName,
}: CallMessageProps) {
  const { initiateCall, callState } = useCallContext();

  const isOutgoing = isMine;
  const isMissed = status === "missed" || status === "declined";
  const isCompleted = status === "ended" && duration > 0;

  const iconColor = isMissed ? "text-red-400" : "text-green-400";
  const icon = isMissed
    ? "solar:phone-calling-bold"
    : isOutgoing
      ? "solar:outgoing-call-bold"
      : "solar:incoming-call-bold";

  let label: string;
  if (isMissed) {
    label = status === "declined" ? "Declined call" : "Missed voice call";
  } else if (isCompleted) {
    label = `Voice call · ${formatCallDuration(duration)}`;
  } else if (status === "busy") {
    label = "Line busy";
  } else {
    label = "Voice call";
  }

  const canCallBack = isMissed && callState === "idle";

  const handleCallBack = () => {
    if (!canCallBack) return;
    initiateCall({
      calleeId: remoteUserId,
      calleeName: remoteName,
      chatId,
    });
  };

  return (
    <button
      onClick={canCallBack ? handleCallBack : undefined}
      disabled={!canCallBack}
      className={`flex items-center gap-2 py-1.5 px-1 rounded-lg ${
        canCallBack ? "cursor-pointer active:opacity-70" : "cursor-default"
      }`}
    >
      <Icon icon={icon} className={`w-4.5 h-4.5 shrink-0 ${iconColor}`} />
      <span className="text-[13px] text-foreground/80">{label}</span>
      {canCallBack && (
        <Icon
          icon="solar:phone-bold"
          className="w-3.5 h-3.5 text-primary ml-1"
        />
      )}
    </button>
  );
}
