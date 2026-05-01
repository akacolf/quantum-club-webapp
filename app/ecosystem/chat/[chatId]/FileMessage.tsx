"use client";

import { useState, useEffect, useRef } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useDecryptedMedia } from "@/app/(hooks)/queries/use-decrypted-media";

interface FileMessageProps {
  file: {
    url: string;
    name: string;
    size: number;
    mimeType: string;
    encrypted?: boolean;
    width?: number;
    height?: number;
  };
  isMine: boolean;
  participantIds?: string[];
  chatId?: string;
  senderId?: string;
  isGroup?: boolean;
  epochNonce?: string;
  epochCounter?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "solar:gallery-bold";
  if (mimeType === "application/pdf") return "solar:document-bold";
  if (mimeType.includes("word") || mimeType.includes("document")) return "solar:document-text-bold";
  if (mimeType.includes("text")) return "solar:document-text-bold";
  return "solar:file-bold";
}

export default function FileMessage({
  file,
  isMine,
  participantIds,
  chatId,
  senderId,
  isGroup,
  epochNonce,
  epochCounter,
}: FileMessageProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isImage = file.mimeType.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf";

  useEffect(() => {
    if (!chatId || (!isImage && !isPdf)) return;
    router.prefetch(`/ecosystem/chat/${chatId}/media` as Route);
  }, [chatId, isImage, isPdf, router]);

  // Lazy load images via IntersectionObserver
  useEffect(() => {
    if (!isImage || !containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isImage]);

  // Decrypt image when visible (TanStack Query handles caching, dedup, retry)
  const imageQuery = useDecryptedMedia({
    url: file.url,
    mimeType: file.mimeType,
    encrypted: file.encrypted,
    participantIds,
    chatId,
    senderId,
    isGroup,
    epochNonce,
    epochCounter,
    enabled: isImage && isVisible,
  });

  const decryptedUrl = imageQuery.data ?? null;
  const isLoading = imageQuery.isLoading;
  const loadError = imageQuery.isError;

  function openMediaViewer() {
    if (!chatId || typeof window === "undefined") return;
    const viewerId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(
      `qc-media-viewer:${viewerId}`,
      JSON.stringify({
        file,
        participantIds,
        senderId,
        isGroup,
        epochNonce,
        epochCounter,
      }),
    );
    router.push(`/ecosystem/chat/${chatId}/media?viewerId=${encodeURIComponent(viewerId)}` as Route);
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-2 py-1 opacity-50">
        <Icon icon="solar:file-corrupted-bold" className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">File unavailable</span>
      </div>
    );
  }

  if (isImage) {
    return (
      <div ref={containerRef} className="max-w-[220px] rounded-lg overflow-hidden">
        {!decryptedUrl ? (
          <div className="w-[220px] h-[160px] bg-muted/20 flex items-center justify-center rounded-lg text-muted-foreground/50">
            <ButtonLoader size="lg" />
          </div>
        ) : (
          <button
            onClick={openMediaViewer}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            className="block w-full"
          >
            <img
              src={decryptedUrl}
              alt={file.name}
              className="w-full rounded-lg object-cover max-h-[300px]"
              style={file.width && file.height ? { aspectRatio: `${file.width} / ${file.height}` } : undefined}
              draggable={false}
            />
          </button>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1 truncate">{file.name}</p>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={isPdf ? openMediaViewer : undefined}
        className={`flex items-center gap-3 p-2.5 rounded-xl min-w-[200px] max-w-[260px] transition-colors ${
          isPdf ? "cursor-pointer" : ""
        } ${
          isMine
            ? `bg-primary-foreground/10 ${isPdf ? "hover:bg-primary-foreground/15" : ""}`
            : `bg-primary/10 ${isPdf ? "hover:bg-primary/15" : ""}`
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          <Icon icon={getFileIcon(file.mimeType)} className="w-5 h-5 text-white/70" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium text-white truncate">{file.name}</p>
          <p className="text-[10px] text-muted-foreground/70">{formatFileSize(file.size)}</p>
        </div>
        {isLoading && (
          <span className="text-muted-foreground/50 shrink-0"><ButtonLoader size="sm" /></span>
        )}
      </div>
    </>
  );
}
