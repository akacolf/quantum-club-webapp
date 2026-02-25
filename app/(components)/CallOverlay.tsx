"use client";

import { useCallContext } from "@/app/(contexts)/CallContext";
import { useProfilePhoto } from "@/app/(hooks)/useProfilePhoto";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";

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

export default function CallOverlay() {
  const {
    callState,
    callInfo,
    isMuted,
    isSpeaker,
    callDuration,
    isMinimized,
    endCall,
    toggleMute,
    toggleSpeaker,
    toggleMinimize,
  } = useCallContext();

  const photo = useProfilePhoto(callInfo?.remoteUserId ?? null);

  const visible =
    callState === "outgoing_ringing" || callState === "connected";

  const statusText =
    callState === "outgoing_ringing"
      ? "Calling..."
      : callState === "connected"
        ? formatDuration(callDuration)
        : "";

  return (
    <AnimatePresence mode="wait">
      {visible && callInfo && isMinimized && (
        <motion.div
          key="call-minimized"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-[60] flex items-center gap-3 px-3 pb-5 bg-green-600/95 backdrop-blur-sm cursor-pointer"
          style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 0px) + 0.75rem)" }}
          onClick={toggleMinimize}
        >
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={photo || undefined} />
            <AvatarFallback className="text-xs bg-white/20 text-white">
              {getInitials(callInfo.remoteName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {callInfo.remoteName}
            </p>
            <p className="text-xs text-white/80">{statusText}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              endCall();
            }}
            className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white shrink-0"
          >
            <Icon icon="solar:phone-bold" className="w-4 h-4 rotate-[135deg]" />
          </Button>
          <Icon icon="solar:alt-arrow-up-linear" className="w-4 h-4 text-white/80 shrink-0" />
        </motion.div>
      )}

      {visible && callInfo && !isMinimized && (
        <motion.div
          key="call-overlay"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-between bg-neutral-950/95 backdrop-blur-sm py-16"
        >
          {/* Minimize button */}
          {callState === "connected" && (
            <button
              onClick={toggleMinimize}
              className="absolute top-4 left-4 p-2 text-white/60 hover:text-white transition-colors"
              style={{ marginTop: "calc(var(--tg-safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 0px))" }}
            >
              <Icon icon="solar:alt-arrow-down-linear" className="w-6 h-6" />
            </button>
          )}

          {/* Top: E2E badge + Avatar + Name + Status */}
          <div className="flex flex-col items-center gap-4 mt-8">
            <div className="flex items-center justify-center gap-1">
              <Icon icon="solar:lock-keyhole-bold" className="w-3 h-3 text-green-400" />
              <span className="text-[11px] text-green-400/80">End-to-end encrypted</span>
            </div>
            <Avatar className="w-28 h-28 ring-2 ring-white/10">
              <AvatarImage src={photo || undefined} />
              <AvatarFallback className="text-3xl bg-primary/20 text-primary">
                {getInitials(callInfo.remoteName)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white">
                {callInfo.remoteName}
              </h2>
              <p className="text-sm text-white/60 mt-1">{statusText}</p>
            </div>
          </div>

          {/* Bottom: Controls */}
          <div className="flex items-center gap-8 mb-8">
            {/* Mute */}
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

            {/* End call */}
            <Button
              size="icon"
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
            >
              <Icon icon="solar:phone-bold" className="w-7 h-7 rotate-[135deg]" />
            </Button>

            {/* Speaker */}
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
