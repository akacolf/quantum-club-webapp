"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const loadingMessages = [
  "Illuminating experiences...",
  "Polishing details...",
  "Launching the agentic spaceship...",
  "Caramelizing the future...",
];

export default function Loader() {
  const [messageIndex, setMessageIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black z-9999">
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin text-white"
          style={{
            borderColor: "color-mix(in srgb, currentColor 25%, transparent)",
            borderTopColor: "currentColor",
          }}
        />
        <div className="relative flex min-h-6 min-w-0 items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={loadingMessages[messageIndex]}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-sm font-medium leading-6 text-white/70"
            >
              {loadingMessages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
