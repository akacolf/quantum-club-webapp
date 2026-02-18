"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { decryptBlob } from "@/lib/chat-crypto";

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
}

// Cache decrypted blob URLs to avoid re-decrypting
const decryptedUrlCache = new Map<string, string>();

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
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
}: FileMessageProps) {
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isImage = isImageMime(file.mimeType);

  // IntersectionObserver for lazy loading images
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

  // Decrypt file when visible (for images) or on demand (for other files)
  useEffect(() => {
    if (!isImage || !isVisible) return;
    if (!file.encrypted || !participantIds || !chatId) {
      setDecryptedUrl(file.url);
      return;
    }

    const cached = decryptedUrlCache.get(file.url);
    if (cached) {
      setDecryptedUrl(cached);
      return;
    }

    let cancelled = false;
    setIsDecrypting(true);

    (async () => {
      try {
        const response = await fetch(file.url);
        const encryptedData = await response.arrayBuffer();
        const decryptedData = await decryptBlob(encryptedData, participantIds, chatId);
        if (cancelled) return;
        const blob = new Blob([decryptedData], { type: file.mimeType });
        const url = URL.createObjectURL(blob);
        decryptedUrlCache.set(file.url, url);
        setDecryptedUrl(url);
      } catch (err) {
        console.error("Failed to decrypt file:", err);
        if (!cancelled) setDecryptError(true);
      } finally {
        if (!cancelled) setIsDecrypting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isImage, isVisible, file.url, file.encrypted, file.mimeType, participantIds, chatId]);

  const handleDownload = useCallback(async () => {
    let url = file.url;

    if (file.encrypted && participantIds && chatId) {
      const cached = decryptedUrlCache.get(file.url);
      if (cached) {
        url = cached;
      } else {
        setIsDecrypting(true);
        try {
          const response = await fetch(file.url);
          const encryptedData = await response.arrayBuffer();
          const decryptedData = await decryptBlob(encryptedData, participantIds, chatId);
          const blob = new Blob([decryptedData], { type: file.mimeType });
          url = URL.createObjectURL(blob);
          decryptedUrlCache.set(file.url, url);
        } catch (err) {
          console.error("Failed to decrypt file for download:", err);
          setIsDecrypting(false);
          return;
        }
        setIsDecrypting(false);
      }
    }

    // Trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [file, participantIds, chatId]);

  if (decryptError) {
    return (
      <div className="flex items-center gap-2 py-1 opacity-50">
        <Icon icon="solar:lock-keyhole-bold" className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Unable to decrypt file</span>
      </div>
    );
  }

  // Image message
  if (isImage) {
    return (
      <>
        <div ref={containerRef} className="max-w-[220px] rounded-lg overflow-hidden">
          {isDecrypting ? (
            <div className="w-[220px] h-[160px] bg-muted/20 flex items-center justify-center rounded-lg">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : decryptedUrl ? (
            <button onClick={() => setShowLightbox(true)} className="block w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={decryptedUrl}
                alt={file.name}
                className="w-full rounded-lg object-cover max-h-[300px]"
                style={file.width && file.height ? {
                  aspectRatio: `${file.width} / ${file.height}`,
                } : undefined}
              />
            </button>
          ) : (
            <div className="w-[220px] h-[160px] bg-muted/20 flex items-center justify-center rounded-lg">
              <Icon icon="solar:gallery-bold" className="w-6 h-6 text-muted-foreground/50" />
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-1 truncate">{file.name}</p>
        </div>

        {/* Lightbox */}
        {showLightbox && decryptedUrl && (
          <div
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowLightbox(false)}
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center z-10"
            >
              <Icon icon="lucide:x" className="w-5 h-5 text-white" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={decryptedUrl}
              alt={file.name}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  // Non-image file message
  return (
    <button
      onClick={handleDownload}
      disabled={isDecrypting}
      className={`flex items-center gap-3 p-2.5 rounded-xl min-w-[200px] max-w-[260px] transition-colors ${
        isMine
          ? "bg-primary-foreground/10 hover:bg-primary-foreground/15"
          : "bg-primary/10 hover:bg-primary/15"
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        isMine ? "bg-primary-foreground/20" : "bg-primary/20"
      }`}>
        {isDecrypting ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Icon icon={getFileIcon(file.mimeType)} className="w-5 h-5 text-white/70" />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-xs font-medium text-white truncate">{file.name}</p>
        <p className="text-[10px] text-muted-foreground/70">
          {formatFileSize(file.size)}
        </p>
      </div>
      <Icon icon="solar:download-minimalistic-bold" className="w-4 h-4 text-muted-foreground/50 shrink-0" />
    </button>
  );
}
