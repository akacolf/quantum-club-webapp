"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
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

const decryptedUrlCache = new Map<string, string>();

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

async function fetchAndDecrypt(
  url: string,
  mimeType: string,
  participantIds: string[],
  chatId: string,
): Promise<string> {
  const cached = decryptedUrlCache.get(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  const encryptedData = await res.arrayBuffer();
  const decryptedData = await decryptBlob(encryptedData, participantIds, chatId);
  const blob = new Blob([decryptedData], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);
  decryptedUrlCache.set(url, blobUrl);
  return blobUrl;
}

export default function FileMessage({
  file,
  isMine,
  participantIds,
  chatId,
}: FileMessageProps) {
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isImage = file.mimeType.startsWith("image/");

  // Lazy load images
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

  // Decrypt image when visible
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
    setIsLoading(true);

    fetchAndDecrypt(file.url, file.mimeType, participantIds, chatId)
      .then((url) => { if (!cancelled) setDecryptedUrl(url); })
      .catch((err) => { console.error("[FileMessage]", err); if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [isImage, isVisible, file.url, file.encrypted, file.mimeType, participantIds, chatId]);

  const handleDownload = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = file.url;
      if (file.encrypted && participantIds && chatId) {
        url = await fetchAndDecrypt(file.url, file.mimeType, participantIds, chatId);
      }

      // PDFs and docs: open in new tab (works in Telegram WebView)
      if (file.mimeType === "application/pdf" || file.mimeType.startsWith("text/")) {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("[FileMessage] download:", err);
    }
    setIsLoading(false);
  }, [file, participantIds, chatId]);

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
      <>
        <div ref={containerRef} className="max-w-[220px] rounded-lg overflow-hidden">
          {!decryptedUrl ? (
            <div className="w-[220px] h-[160px] bg-muted/20 flex items-center justify-center rounded-lg">
              <Icon icon="solar:gallery-bold" className="w-6 h-6 text-muted-foreground/50 animate-pulse" />
            </div>
          ) : (
            <button onClick={() => setShowLightbox(true)} className="block w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={decryptedUrl}
                alt={file.name}
                className="w-full rounded-lg object-cover max-h-[300px]"
                style={file.width && file.height ? { aspectRatio: `${file.width} / ${file.height}` } : undefined}
              />
            </button>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-1 truncate">{file.name}</p>
        </div>

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

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className={`flex items-center gap-3 p-2.5 rounded-xl min-w-[200px] max-w-[260px] transition-colors ${
        isMine
          ? "bg-primary-foreground/10 hover:bg-primary-foreground/15"
          : "bg-primary/10 hover:bg-primary/15"
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        isMine ? "bg-primary-foreground/20" : "bg-primary/20"
      }`}>
        <Icon icon={getFileIcon(file.mimeType)} className="w-5 h-5 text-white/70" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-xs font-medium text-white truncate">{file.name}</p>
        <p className="text-[10px] text-muted-foreground/70">{formatFileSize(file.size)}</p>
      </div>
      {isLoading ? (
        <Icon icon="lucide:loader-2" className="w-4 h-4 text-muted-foreground/50 shrink-0 animate-spin" />
      ) : (
        <Icon icon="solar:download-minimalistic-bold" className="w-4 h-4 text-muted-foreground/50 shrink-0" />
      )}
    </button>
  );
}
