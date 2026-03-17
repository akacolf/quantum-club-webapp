"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useDrag } from "@use-gesture/react";

interface VoiceRecorderProps {
  onSend: (blob: Blob, durationSec: number) => void;
  disabled: boolean;
}

const MAX_DURATION = 120;
const CANCEL_SLIDE_PX = 100;

export default function VoiceRecorder({ onSend, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [slideX, setSlideX] = useState(0);
  const [cancelled, setCancelled] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTime = useRef(0);
  const cancelledRef = useRef(false);

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
    setElapsed(0);
    setSlideX(0);
    setCancelled(false);
    cancelledRef.current = false;
  }

  function stopRecording(send: boolean) {
    const recorder = mediaRecorder.current;
    if (!recorder || recorder.state === "inactive") {
      cleanup();
      return;
    }

    if (send) {
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: recorder.mimeType });
        const duration = Math.round((Date.now() - startTime.current) / 1000);
        chunks.current = [];
        if (blob.size > 0 && duration > 0) {
          onSend(blob, duration);
        }
        cleanup();
      };
    } else {
      recorder.onstop = () => {
        chunks.current = [];
        cleanup();
      };
    }

    recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());
    mediaRecorder.current = null;
  }

  async function startRecording() {
    if (disabled) return;

    try {
      // Check for MediaRecorder support (missing in some mobile WebViews)
      if (typeof MediaRecorder === "undefined") {
        toast.error("Voice recording is not supported on this device.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Microphone access is not available.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
            ? "audio/ogg;codecs=opus"
            : MediaRecorder.isTypeSupported("audio/mp4")
              ? "audio/mp4"
              : "";

      if (!mimeType) {
        toast.error("No supported audio format found on this device.");
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;
      chunks.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.start(100);
      startTime.current = Date.now();
      setRecording(true);
      setCancelled(false);
      setSlideX(0);
      setElapsed(0);

      // First tick immediately, then every 200ms
      const tick = () => {
        const sec = Math.round((Date.now() - startTime.current) / 1000);
        setElapsed(sec);
        if (sec >= MAX_DURATION) stopRecording(true);
      };
      tick();
      timerRef.current = setInterval(tick, 200);
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("Could not access microphone. Please check permissions.");
    }
  }

  function handleCancel() {
    cancelledRef.current = true;
    setCancelled(true);
    stopRecording(false);
  }

  function handleSendVoice() {
    if (cancelledRef.current) return;
    stopRecording(true);
  }

  // Slide-to-cancel drag gesture on the recording bar
  const bindDrag = useDrag(({ movement: [mx] }) => {
    if (!recording) return;
    const delta = -mx; // negative because sliding left = cancel
    setSlideX(Math.max(0, delta));
    if (delta > CANCEL_SLIDE_PX && !cancelledRef.current) {
      handleCancel();
    }
  }, { axis: "x" });

  // Escape key to cancel
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recording]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <AnimatePresence>
        {recording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: cancelled ? -80 : 40, scale: cancelled ? 0.9 : 1 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 flex items-center gap-2 px-3 bg-card/95 backdrop-blur-sm z-10 rounded-full touch-none"
            {...(() => { const { onDrag, onDragStart, onDragEnd, ...rest } = bindDrag() as Record<string, unknown>; return rest; })()}
          >
            {/* Recording indicator + timer */}
            <div className="flex items-center gap-2 min-w-0">
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"
              />
              <span className="text-sm font-mono text-red-500 tabular-nums">
                {formatTime(elapsed)}
              </span>
            </div>

            {/* Slide to cancel */}
            <motion.div
              className="flex items-center gap-1.5 flex-1 justify-center"
              animate={{ opacity: slideX > 30 ? 0.3 : 0.7 }}
            >
              <Icon icon="lucide:arrow-left" className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Slide to cancel</span>
            </motion.div>

            {/* Cancel button */}
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-full shrink-0"
              onClick={handleCancel}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <Icon icon="lucide:trash-2" className="w-4.5 h-4.5 text-red-500" />
            </Button>

            {/* Send button */}
            <Button
              size="icon"
              className="w-10 h-10 rounded-full shrink-0 shadow-lg shadow-primary/20"
              onClick={handleSendVoice}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <Icon icon="material-symbols:send-rounded" className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {!recording && (
        <Button
          size="icon"
          disabled={disabled}
          className="w-10 h-10 rounded-full shrink-0 shadow-lg shadow-primary/20"
          onClick={startRecording}
        >
          <Icon icon="material-symbols:mic" className="w-5 h-5" />
        </Button>
      )}
    </>
  );
}
