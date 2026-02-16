"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";

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
  const startX = useRef(0);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
    setElapsed(0);
    setSlideX(0);
    setCancelled(false);
    cancelledRef.current = false;
  }, []);

  const stopRecording = useCallback((send: boolean) => {
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
  }, [cleanup, onSend]);

  const startRecording = useCallback(async (clientX: number) => {
    if (disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg;codecs=opus";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;
      chunks.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.start(100);
      startTime.current = Date.now();
      startX.current = clientX;
      setRecording(true);
      setCancelled(false);
      setSlideX(0);

      timerRef.current = setInterval(() => {
        const sec = Math.round((Date.now() - startTime.current) / 1000);
        setElapsed(sec);
        if (sec >= MAX_DURATION) {
          stopRecording(true);
        }
      }, 200);
    } catch {
      console.error("Microphone access denied");
    }
  }, [disabled, stopRecording]);

  const handleMove = useCallback((clientX: number) => {
    if (!recording) return;
    const delta = startX.current - clientX;
    setSlideX(Math.max(0, delta));
    if (delta > CANCEL_SLIDE_PX && !cancelledRef.current) {
      cancelledRef.current = true;
      setCancelled(true);
      stopRecording(false);
    }
  }, [recording, stopRecording]);

  const handleEnd = useCallback(() => {
    if (!recording || cancelledRef.current) return;
    stopRecording(true);
  }, [recording, stopRecording]);

  // Escape key to cancel
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelledRef.current = true;
        setCancelled(true);
        stopRecording(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recording, stopRecording]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (recording) {
    return (
      <div
        className="flex items-center gap-3 flex-1 select-none"
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm font-mono text-red-500 tabular-nums">
            {formatTime(elapsed)}
          </span>
          <span
            className="text-xs text-muted-foreground transition-opacity"
            style={{ opacity: slideX > 30 ? 0.3 : 1 }}
          >
            ← Slide to cancel
          </span>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="icon"
      disabled={disabled}
      className="w-10 h-10 rounded-full shrink-0 shadow-lg shadow-primary/20"
      onMouseDown={(e) => { e.preventDefault(); startRecording(e.clientX); }}
      onTouchStart={(e) => { e.preventDefault(); startRecording(e.touches[0].clientX); }}
    >
      <Icon icon="material-symbols:mic" className="w-5 h-5" />
    </Button>
  );
}
