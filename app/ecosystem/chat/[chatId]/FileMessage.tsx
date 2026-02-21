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
): Promise<string> {
  const cached = decryptedUrlCache.get(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  const encryptedData = await res.arrayBuffer();
  const decryptedData = await decryptBlob(encryptedData, participantIds, chatId, senderId, isGroup);
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
  senderId,
  isGroup,
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

    fetchAndDecrypt(file.url, file.mimeType, participantIds, chatId, senderId, isGroup)
      .then((url) => { if (!cancelled) setDecryptedUrl(url); })
      .catch((err) => { console.error("[FileMessage]", err); if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [isImage, isVisible, file.url, file.encrypted, file.mimeType, participantIds, chatId, senderId, isGroup]);

  const handleDownload = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = file.url;
      if (file.encrypted && participantIds && chatId) {
        url = await fetchAndDecrypt(file.url, file.mimeType, participantIds, chatId, senderId, isGroup);
      }

      if (file.mimeType === "application/pdf") {
        setPdfUrl(url);
        setShowPdfViewer(true);
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
  }, [file, participantIds, chatId, senderId, isGroup]);

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
              onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}
              className="absolute top-20 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center z-10"
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
    <>
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

      {showPdfViewer && pdfUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col">
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
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = pdfUrl;
                  a.download = file.name;
                  a.target = "_blank";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ml-1"
              >
                <Icon icon="solar:download-minimalistic-bold" className="w-3.5 h-3.5 text-white" />
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
            onTouchStart={(e) => {
              if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchRef.current = Math.hypot(dx, dy);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2 && pinchRef.current > 0) {
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
