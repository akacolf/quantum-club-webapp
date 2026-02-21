"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { decryptBlob } from "@/lib/chat-crypto";

interface VoiceMessageProps {
  audioUrl: string;
  durationSec: number;
  isMine: boolean;
  encrypted?: boolean;
  participantIds?: string[];
  chatId?: string;
  senderId?: string;
  isGroup?: boolean;
  epochNonce?: string;
  epochCounter?: number;
}

const decryptedUrlCache = new Map<string, string>();

export default function VoiceMessage({
  audioUrl,
  durationSec,
  isMine,
  encrypted,
  participantIds,
  chatId,
  senderId,
  isGroup,
  epochNonce,
  epochCounter,
}: VoiceMessageProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [ready, setReady] = useState(false);
  const [decrypting, setDecrypting] = useState(!!encrypted);
  const [loadError, setLoadError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  // RAF-based progress loop for smooth updates
  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused && audio.duration && isFinite(audio.duration)) {
      setProgress(audio.currentTime / audio.duration);
      setCurrentTime(audio.currentTime);
    }
    rafRef.current = requestAnimationFrame(updateProgress);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initAudio = async () => {
      let src = audioUrl;

      if (encrypted && participantIds && chatId) {
        const cached = decryptedUrlCache.get(audioUrl);
        if (cached) {
          src = cached;
          if (!cancelled) setDecrypting(false);
        } else {
          try {
            const res = await fetch(audioUrl);
            if (!res.ok) throw new Error(`${res.status}`);
            const encryptedData = await res.arrayBuffer();
            if (cancelled) return;
            const decryptedData = await decryptBlob(encryptedData, participantIds, chatId, senderId, isGroup, epochNonce, epochCounter);
            if (cancelled) return;
            const blob = new Blob([decryptedData], { type: "audio/webm" });
            src = URL.createObjectURL(blob);
            decryptedUrlCache.set(audioUrl, src);
            if (!cancelled) setDecrypting(false);
          } catch (err) {
            console.error("[VoiceMessage] decrypt failed:", err);
            if (!cancelled) setLoadError(true);
            return;
          }
        }
      } else {
        if (!cancelled) setDecrypting(false);
      }

      if (cancelled) return;

      const audio = new Audio(src);
      audio.preload = "auto";
      audioRef.current = audio;

      audio.addEventListener("canplaythrough", () => {
        if (!cancelled) setReady(true);
      });

      audio.addEventListener("ended", () => {
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        cancelAnimationFrame(rafRef.current);
      });

      if (!cancelled) setReady(true);
    };

    initAudio();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [audioUrl, encrypted, participantIds, chatId, senderId, isGroup, epochNonce, epochCounter]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const formatTime = (sec: number) => {
    const s = Math.round(sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const displayTime = playing || progress > 0
    ? formatTime(currentTime)
    : formatTime(durationSec);

  if (loadError) {
    return (
      <div className="flex items-center gap-2 min-w-[180px] max-w-[240px] py-0.5 opacity-50">
        <Icon icon="solar:microphone-3-bold" className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Voice message unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 min-w-[180px] max-w-[240px] py-0.5">
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        disabled={!ready || decrypting}
        className={`w-9 h-9 rounded-full shrink-0 ${
          isMine
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
            : "bg-primary/60 hover:bg-primary/70"
        }`}
      >
        {decrypting ? (
          <Icon icon="lucide:loader-2" className="w-4 h-4 text-white animate-spin" />
        ) : (
          <Icon
            icon={playing ? "material-symbols:pause-rounded" : "material-symbols:play-arrow-rounded"}
            className="w-5 h-5 text-white"
          />
        )}
      </Button>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="w-full h-1 rounded-full bg-muted-foreground/20 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              isMine ? "bg-primary-foreground/70" : "bg-primary/60"
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground/70 tabular-nums leading-none">
          {displayTime}
        </span>
      </div>
    </div>
  );
}
