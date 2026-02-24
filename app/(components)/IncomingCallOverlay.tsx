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

export default function IncomingCallOverlay() {
  const { callState, callInfo, acceptCall, declineCall } = useCallContext();
  const photo = useProfilePhoto(callInfo?.remoteUserId ?? null);

  const visible = callState === "incoming_ringing";

  return (
    <AnimatePresence>
      {visible && callInfo && (
        <motion.div
          key="incoming-call-overlay"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[80] flex flex-col items-center justify-between bg-neutral-950/95 backdrop-blur-sm py-16"
        >
          {/* Top: E2E badge + Avatar with pulse + Caller info */}
          <div className="flex flex-col items-center gap-4 mt-12">
            <div className="flex items-center justify-center gap-1">
              <Icon icon="solar:lock-keyhole-bold" className="w-3 h-3 text-green-400" />
              <span className="text-[11px] text-green-400/80">End-to-end encrypted</span>
            </div>
            <div className="relative">
              {/* Pulse rings */}
              <span className="absolute inset-0 rounded-full animate-ping bg-green-500/20" />
              <span
                className="absolute -inset-3 rounded-full animate-pulse bg-green-500/10"
                style={{ animationDuration: "2s" }}
              />
              <Avatar className="w-28 h-28 ring-2 ring-green-500/30 relative">
                <AvatarImage src={photo || undefined} />
                <AvatarFallback className="text-3xl bg-primary/20 text-primary">
                  {getInitials(callInfo.remoteName)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="text-center mt-2">
              <h2 className="text-xl font-semibold text-white">
                {callInfo.remoteName}
              </h2>
              <p className="text-sm text-white/50 mt-1">
                Incoming voice call
              </p>
            </div>
          </div>

          {/* Bottom: Accept / Decline */}
          <div className="flex items-center gap-16 mb-12">
            {/* Decline */}
            <div className="flex flex-col items-center gap-2">
              <Button
                size="icon"
                onClick={declineCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
              >
                <Icon
                  icon="solar:phone-bold"
                  className="w-7 h-7 rotate-[135deg]"
                />
              </Button>
              <span className="text-xs text-white/50">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-2">
              <Button
                size="icon"
                onClick={acceptCall}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white"
              >
                <Icon icon="solar:phone-bold" className="w-7 h-7" />
              </Button>
              <span className="text-xs text-white/50">Accept</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
