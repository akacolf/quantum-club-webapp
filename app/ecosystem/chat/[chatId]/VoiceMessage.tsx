"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";

interface VoiceMessageProps {
  audioUrl: string;
  durationSec: number;
  isMine: boolean;
}

export default function VoiceMessage({ audioUrl, durationSec, isMine }: VoiceMessageProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

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

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl]);

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

  return (
    <div className="flex items-center gap-2.5 min-w-[180px] max-w-[240px] py-0.5">
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
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
