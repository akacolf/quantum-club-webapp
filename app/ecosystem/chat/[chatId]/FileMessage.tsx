"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { decryptBlob } from "@/lib/chat-crypto";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  senderId?: string,
  isGroup?: boolean,
  epochNonce?: string,
  epochCounter?: number,
): Promise<string> {
  const cached = decryptedUrlCache.get(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  const encryptedData = await res.arrayBuffer();
  const decryptedData = await decryptBlob(encryptedData, participantIds, chatId, senderId, isGroup, epochNonce, epochCounter);
  const blob = new Blob([decryptedData], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);
  decryptedUrlCache.set(url, blobUrl);
  return blobUrl;
}

/** Pinch-to-zoom + pan image lightbox */
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const gestureRef = useRef<{
    initialDist: number;
    initialScale: number;
    lastCenter: { x: number; y: number };
    startTranslate: { x: number; y: number };
    isPinching: boolean;
    isPanning: boolean;
    startTouch: { x: number; y: number };
  } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      gestureRef.current = {
        initialDist: Math.hypot(dx, dy),
        initialScale: scale,
        lastCenter: {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        },
        startTranslate: { ...translate },
        isPinching: true,
        isPanning: false,
        startTouch: { x: 0, y: 0 },
      };
      setIsGesturing(true);
    } else if (e.touches.length === 1 && scale > 1) {
      gestureRef.current = {
        initialDist: 0,
        initialScale: scale,
        lastCenter: { x: 0, y: 0 },
        startTranslate: { ...translate },
        isPinching: false,
        isPanning: true,
        startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
      };
      setIsGesturing(true);
    }
  }, [scale, translate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (!gestureRef.current) return;

    if (gestureRef.current.isPinching && e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / gestureRef.current.initialDist;
      const newScale = Math.min(5, Math.max(1, gestureRef.current.initialScale * ratio));
      setScale(newScale);

      // Pan with pinch center movement
      const center = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      setTranslate({
        x: gestureRef.current.startTranslate.x + (center.x - gestureRef.current.lastCenter.x),
        y: gestureRef.current.startTranslate.y + (center.y - gestureRef.current.lastCenter.y),
      });
    } else if (gestureRef.current.isPanning && e.touches.length === 1) {
      const dx = e.touches[0].clientX - gestureRef.current.startTouch.x;
      const dy = e.touches[0].clientY - gestureRef.current.startTouch.y;
      setTranslate({
        x: gestureRef.current.startTranslate.x + dx,
        y: gestureRef.current.startTranslate.y + dy,
      });
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (gestureRef.current?.isPinching && e.touches.length < 2) {
      // Snap back to 1 if close enough
      if (scale < 1.1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
    }
    if (e.touches.length === 0) {
      gestureRef.current = null;
      setIsGesturing(false);
    }
  }, [scale]);

  const handleDoubleTap = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale]);

  const doubleTapRef = useRef<{ time: number }>({ time: 0 });

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - doubleTapRef.current.time < 300) {
      handleDoubleTap();
      doubleTapRef.current.time = 0;
    } else {
      doubleTapRef.current.time = now;
    }
  }, [handleDoubleTap]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
      onClick={() => { if (scale <= 1) onClose(); }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute top-20 right-4 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
        >
          <Icon icon="lucide:x" className="w-5 h-5 text-white" />
        </button>
      </div>
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{ touchAction: "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transition: isGesturing ? "none" : "transform 0.2s ease-out",
          }}
          draggable={false}
          onClick={handleClick}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
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
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pdfScale, setPdfScale] = useState(1);
  const pinchRef = useRef(0);
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
      queueMicrotask(() => setDecryptedUrl(file.url));
      return;
    }

    const cached = decryptedUrlCache.get(file.url);
    if (cached) {
      queueMicrotask(() => setDecryptedUrl(cached));
      return;
    }

    let cancelled = false;
    queueMicrotask(() => setIsLoading(true));

    fetchAndDecrypt(file.url, file.mimeType, participantIds, chatId, senderId, isGroup, epochNonce, epochCounter)
      .then((url) => { if (!cancelled) setDecryptedUrl(url); })
      .catch((err) => { console.error("[FileMessage]", err); if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [isImage, isVisible, file.url, file.encrypted, file.mimeType, participantIds, chatId, senderId, isGroup, epochNonce, epochCounter]);

  const isPdf = file.mimeType === "application/pdf";

  const handleOpenPdf = useCallback(async () => {
    if (!isPdf) return;
    setIsLoading(true);
    try {
      let url = file.url;
      if (file.encrypted && participantIds && chatId) {
        url = await fetchAndDecrypt(file.url, file.mimeType, participantIds, chatId, senderId, isGroup, epochNonce, epochCounter);
      }
      setPdfUrl(url);
      setShowPdfViewer(true);
    } catch (err) {
      console.error("[FileMessage] open pdf:", err);
    }
    setIsLoading(false);
  }, [isPdf, file, participantIds, chatId, senderId, isGroup, epochNonce, epochCounter]);

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
              <Icon icon="lucide:loader-2" className="w-6 h-6 text-muted-foreground/50 animate-spin" />
            </div>
          ) : (
            <button
              onClick={() => setShowLightbox(true)}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
              className="block w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
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

        {showLightbox && decryptedUrl && (
          <ImageLightbox
            src={decryptedUrl}
            alt={file.name}
            onClose={() => setShowLightbox(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        onClick={isPdf ? handleOpenPdf : undefined}
        className={`flex items-center gap-3 p-2.5 rounded-xl min-w-[200px] max-w-[260px] transition-colors ${
          isPdf ? "cursor-pointer" : ""
        } ${
          isMine
            ? `bg-primary-foreground/10 ${isPdf ? "hover:bg-primary-foreground/15" : ""}`
            : `bg-primary/10 ${isPdf ? "hover:bg-primary/15" : ""}`
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
        {isLoading && (
          <Icon icon="lucide:loader-2" className="w-4 h-4 text-muted-foreground/50 shrink-0 animate-spin" />
        )}
      </div>

      {showPdfViewer && pdfUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Header with pt-20 to clear Telegram Mini App buttons */}
          <div className="flex items-center justify-between px-4 pt-20 pb-3 bg-card/90 backdrop-blur-sm">
            <p className="text-sm font-medium text-white truncate flex-1 mr-3">{file.name}</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPdfScale((s) => Math.max(0.5, s - 0.25))}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                <Icon icon="lucide:minus" className="w-3.5 h-3.5 text-white" />
              </button>
              <span className="text-[10px] text-white/60 tabular-nums w-8 text-center">
                {Math.round(pdfScale * 100)}%
              </span>
              <button
                onClick={() => setPdfScale((s) => Math.min(3, s + 0.25))}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                <Icon icon="lucide:plus" className="w-3.5 h-3.5 text-white" />
              </button>
              <button
                onClick={() => { setShowPdfViewer(false); setPdfScale(1); }}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                <Icon icon="lucide:x" className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
          {/* PDF pages rendered by react-pdf — pinch to zoom */}
          <div
            className="flex-1 overflow-auto bg-neutral-200"
            style={{ touchAction: "pan-x pan-y" }}
            onContextMenu={(e) => e.preventDefault()}
            onTouchStart={(e) => {
              if (e.touches.length === 2) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchRef.current = Math.hypot(dx, dy);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2 && pinchRef.current > 0) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const delta = (dist - pinchRef.current) / 200;
                setPdfScale((s) => Math.min(3, Math.max(0.5, s + delta)));
                pinchRef.current = dist;
              }
            }}
            onTouchEnd={() => { pinchRef.current = 0; }}
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              loading={
                <div className="flex items-center justify-center py-20">
                  <Icon icon="lucide:loader-2" className="w-8 h-8 text-neutral-400 animate-spin" />
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <Icon icon="solar:document-bold" className="w-8 h-8 text-neutral-400" />
                  <p className="text-sm text-neutral-500">Could not load PDF</p>
                </div>
              }
            >
              {Array.from({ length: numPages }, (_, i) => (
                <Page
                  key={i}
                  pageNumber={i + 1}
                  width={Math.min(window.innerWidth, 448) * pdfScale}
                  className="mb-2 mx-auto"
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              ))}
            </Document>
          </div>
        </div>
      )}
    </>
  );
}
