"use client";

import { useCallContext } from "@/app/(contexts)/CallContext";
import { useProfilePhoto } from "@/app/(hooks)/useProfilePhoto";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function ParticipantAvatar({ userId, name }: { userId: string; name: string }) {
  const photo = useProfilePhoto(userId);
  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar className="w-16 h-16 ring-2 ring-white/10">
        <AvatarImage src={photo || undefined} />
        <AvatarFallback className="text-lg bg-primary/20 text-primary">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs text-white/80 truncate max-w-[80px] text-center">
        {name}
      </span>
    </div>
  );
}

export default function GroupCallOverlay() {
  const {
    groupCallState,
    groupCallInfo,
    isMuted,
    isSpeaker,
    isMinimized,
    leaveGroupCall,
    toggleMute,
    toggleSpeaker,
    toggleMinimize,
  } = useCallContext();

  const [duration, setDuration] = useState(0);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    if (groupCallState !== "active") return;
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [groupCallState, startTime]);

  const visible = groupCallState === "active" && groupCallInfo;

  if (!visible) return null;

  const participants = groupCallInfo.participants;
  const names = groupCallInfo.participantNames;

  return (
    <AnimatePresence mode="wait">
      {isMinimized ? (
        <motion.div
          key="group-call-minimized"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-[60] flex items-center gap-3 px-3 pb-5 bg-green-600/95 backdrop-blur-sm cursor-pointer"
          style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 0px) + 0.75rem)" }}
          onClick={toggleMinimize}
        >
          <div className="flex items-center gap-1 shrink-0">
            <Icon icon="solar:phone-bold" className="w-4 h-4 text-white" />
            <span className="text-xs font-medium text-white">
              {participants.length}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {groupCallInfo.groupName}
            </p>
            <p className="text-xs text-white/80">{formatDuration(duration)}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              leaveGroupCall();
            }}
            className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white shrink-0"
          >
            <Icon icon="solar:phone-bold" className="w-4 h-4 rotate-[135deg]" />
          </Button>
          <Icon icon="solar:alt-arrow-up-linear" className="w-4 h-4 text-white/80 shrink-0" />
        </motion.div>
      ) : (
        <motion.div
          key="group-call-overlay"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-between bg-neutral-950/95 backdrop-blur-sm py-16"
        >
          {/* Minimize button */}
          <button
            onClick={toggleMinimize}
            className="absolute top-4 left-4 p-2 text-white/60 hover:text-white transition-colors"
            style={{ marginTop: "calc(var(--tg-safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 0px))" }}
          >
            <Icon icon="solar:alt-arrow-down-linear" className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center gap-2 mt-8">
            <h2 className="text-lg font-semibold text-white">
              {groupCallInfo.groupName}
            </h2>
            <p className="text-sm text-white/60">
              {formatDuration(duration)} · {participants.length} participant{participants.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Participant grid */}
          <div className="flex-1 flex items-center justify-center px-8">
            <div className="grid grid-cols-2 gap-6 max-w-[240px]">
              {participants.map((pid) => (
                <ParticipantAvatar
                  key={pid}
                  userId={pid}
                  name={names[pid] || "Unknown"}
                />
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-8 mb-8">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full ${
                isMuted
                  ? "bg-white/20 text-white"
                  : "bg-white/10 text-white/70"
              }`}
            >
              <Icon
                icon={
                  isMuted
                    ? "solar:microphone-large-bold-duotone"
                    : "solar:microphone-large-bold"
                }
                className="w-6 h-6"
              />
            </Button>

            <Button
              size="icon"
              onClick={leaveGroupCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
            >
              <Icon icon="solar:phone-bold" className="w-7 h-7 rotate-[135deg]" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={toggleSpeaker}
              className={`w-14 h-14 rounded-full ${
                isSpeaker
                  ? "bg-white/20 text-white"
                  : "bg-white/10 text-white/70"
              }`}
            >
              <Icon
                icon={
                  isSpeaker
                    ? "solar:volume-loud-bold-duotone"
                    : "solar:volume-bold"
                }
                className="w-6 h-6"
              />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
