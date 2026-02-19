"use client";

import { useState, useRef, useEffect } from "react";
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
}

// Cache decrypted blob URLs to avoid re-decrypting on replay
const decryptedUrlCache = new Map<string, string>();

async function fetchWithRetry(url: string, retries = 2): Promise<ArrayBuffer> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, { mode: "cors", credentials: "omit" });
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      return await response.arrayBuffer();
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw new Error("Fetch failed after retries");
}

export default function VoiceMessage({
  audioUrl,
  durationSec,
  isMine,
  encrypted,
  participantIds,
  chatId,
}: VoiceMessageProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initAudio = async () => {
      let src = audioUrl;

      if (encrypted && participantIds && chatId) {
        const cached = decryptedUrlCache.get(audioUrl);
        if (cached) {
          src = cached;
        } else {
          try {
            const encryptedData = await fetchWithRetry(audioUrl);
            if (cancelled) return;
            if (encryptedData.byteLength < 28) throw new Error("Audio data too small");
            const decryptedData = await decryptBlob(encryptedData, participantIds, chatId);
            if (cancelled) return;
            const blob = new Blob([decryptedData], { type: "audio/webm" });
            src = URL.createObjectURL(blob);
            decryptedUrlCache.set(audioUrl, src);
          } catch {
            // Retry with sorted participants (in case order differs)
            try {
              const sortedIds = [...participantIds].sort();
              const encryptedData = await fetchWithRetry(audioUrl);
              if (cancelled) return;
              const decryptedData = await decryptBlob(encryptedData, sortedIds, chatId);
              if (cancelled) return;
              const blob = new Blob([decryptedData], { type: "audio/webm" });
              src = URL.createObjectURL(blob);
              decryptedUrlCache.set(audioUrl, src);
            } catch {
              if (!cancelled) setLoadError(true);
              return;
            }
          }
        }
      }

      if (cancelled) return;

      const audio = new Audio(src);
      audio.preload = "auto";
      audioRef.current = audio;

      audio.addEventListener("canplaythrough", () => {
        if (!cancelled) setReady(true);
      });

      audio.addEventListener("timeupdate", () => {
        if (audio.duration && isFinite(audio.duration)) {
          setProgress(audio.currentTime / audio.duration);
          setCurrentTime(audio.currentTime);
        }
      });

      audio.addEventListener("ended", () => {
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      });

      if (!cancelled) setReady(true);
    };

    initAudio();

    return () => {
      cancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [audioUrl, encrypted, participantIds, chatId]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
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
        disabled={!ready}
        className={`w-9 h-9 rounded-full shrink-0 ${
          isMine
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
            : "bg-primary/60 hover:bg-primary/70"
        }`}
      >
        <Icon
          icon={playing ? "material-symbols:pause-rounded" : "material-symbols:play-arrow-rounded"}
          className="w-5 h-5 text-white"
        />
      </Button>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="w-full h-1 rounded-full bg-muted-foreground/20 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
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
