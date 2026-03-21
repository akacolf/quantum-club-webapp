"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useDecryptedMedia } from "@/app/(hooks)/queries/use-decrypted-media";
import { Document, Page, pdfjs } from "react-pdf";
import { usePinch, useDrag } from "@use-gesture/react";
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

/** Pinch-to-zoom + pan image lightbox */
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);

  const bindPinch = usePinch(({ offset: [s], first, last }) => {
    if (first) setIsGesturing(true);
    const newScale = Math.min(5, Math.max(1, s));
    setScale(newScale);
    if (last) {
      setIsGesturing(false);
      if (newScale < 1.1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
    }
  }, { scaleBounds: { min: 1, max: 5 }, from: () => [scale, 0] });

  const bindDrag = useDrag(({ movement: [mx, my], first, last, memo }) => {
    if (scale <= 1) return;
    if (first) {
      setIsGesturing(true);
      return translate; // memo = starting translate
    }
    const startTranslate = memo ?? translate;
    setTranslate({ x: startTranslate.x + mx, y: startTranslate.y + my });
    if (last) setIsGesturing(false);
    return memo;
  }, { from: () => [0, 0] });

  function handleDoubleTap() {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }

  const doubleTapRef = useRef<{ time: number }>({ time: 0 });

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    const now = Date.now();
    if (now - doubleTapRef.current.time < 300) {
      handleDoubleTap();
      doubleTapRef.current.time = 0;
    } else {
      doubleTapRef.current.time = now;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
      onClick={() => { if (scale <= 1) onClose(); }}
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
        className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
        {...bindPinch()}
        {...bindDrag()}
        onContextMenu={(e) => e.preventDefault()}
      >
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
  const [isVisible, setIsVisible] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [pdfScale, setPdfScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const isImage = file.mimeType.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf";

  // Pinch-to-zoom for PDF viewer
  const bindPdfPinch = usePinch(({ offset: [s], event }) => {
    event?.preventDefault();
    setPdfScale(Math.min(3, Math.max(0.5, s)));
  }, {
    scaleBounds: { min: 0.5, max: 3 },
    from: () => [pdfScale, 0],
    eventOptions: { passive: false },
  });

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

  // Decrypt PDF on demand (enabled when user opens viewer)
  const pdfQuery = useDecryptedMedia({
    url: file.url,
    mimeType: file.mimeType,
    encrypted: file.encrypted,
    participantIds,
    chatId,
    senderId,
    isGroup,
    epochNonce,
    epochCounter,
    enabled: isPdf && showPdfViewer,
  });

  const decryptedUrl = imageQuery.data ?? null;
  const isLoading = imageQuery.isLoading || pdfQuery.isLoading;
  const loadError = imageQuery.isError;

  function handleOpenPdf() {
    if (!isPdf) return;
    setShowPdfViewer(true);
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
      <>
        <div ref={containerRef} className="max-w-[220px] rounded-lg overflow-hidden">
          {!decryptedUrl ? (
            <div className="w-[220px] h-[160px] bg-muted/20 flex items-center justify-center rounded-lg text-muted-foreground/50">
              <ButtonLoader size="lg" />
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
          <span className="text-muted-foreground/50 shrink-0"><ButtonLoader size="sm" /></span>
        )}
      </div>

      {showPdfViewer && pdfQuery.data && (
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
            {...bindPdfPinch()}
          >
            <Document
              file={pdfQuery.data}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              loading={
                <div className="flex items-center justify-center py-20 text-neutral-400">
                  <ButtonLoader size="lg" />
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
