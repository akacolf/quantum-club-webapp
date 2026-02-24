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
  const { callState, callInfo, isMuted, isSpeaker, callDuration, endCall, toggleMute, toggleSpeaker } =
    useCallContext();

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
    <AnimatePresence>
      {visible && callInfo && (
        <motion.div
          key="call-overlay"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-between bg-neutral-950/95 backdrop-blur-sm py-16"
        >
          {/* Top: Avatar + Name + Status */}
          <div className="flex flex-col items-center gap-4 mt-8">
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
              <div className="flex items-center justify-center gap-1 mt-2">
                <Icon icon="solar:lock-keyhole-bold" className="w-3 h-3 text-green-400" />
                <span className="text-[11px] text-green-400/80">End-to-end encrypted</span>
              </div>
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
