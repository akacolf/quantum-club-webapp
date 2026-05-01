"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { Document, Page, pdfjs } from "react-pdf";
import { useDrag, usePinch } from "@use-gesture/react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useDecryptedMedia } from "@/app/(hooks)/queries/use-decrypted-media";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface MediaViewerPayload {
  file: {
    url: string;
    name: string;
    size: number;
    mimeType: string;
    encrypted?: boolean;
    width?: number;
    height?: number;
  };
  participantIds?: string[];
  senderId?: string;
  isGroup?: boolean;
  epochNonce?: string;
  epochCounter?: number;
}

export default function ChatMediaViewerPage() {
  const params = useParams<{ chatId: string }>();
  const searchParams = useSearchParams();
  const chatId = params.chatId;
  useTelegramBackButton(`/ecosystem/chat/${chatId}`);

  const [payload, setPayload] = useState<MediaViewerPayload | null>(null);
  const [missing, setMissing] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [pdfScale, setPdfScale] = useState(1);
  const [imageScale, setImageScale] = useState(1);
  const [pageWidth, setPageWidth] = useState(360);
  const [devicePixelRatio, setDevicePixelRatio] = useState(1);
  const imageScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewerId = searchParams.get("viewerId");
    const frame = requestAnimationFrame(() => {
      if (!viewerId) {
        setMissing(true);
        return;
      }

      try {
        const raw = sessionStorage.getItem(`qc-media-viewer:${viewerId}`);
        if (!raw) {
          setMissing(true);
          return;
        }
        setPayload(JSON.parse(raw) as MediaViewerPayload);
      } catch {
        setMissing(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [searchParams]);

  useEffect(() => {
    const update = () => {
      setPageWidth(Math.min(window.innerWidth - 24, 448));
      setDevicePixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const mediaQuery = useDecryptedMedia({
    url: payload?.file.url ?? "",
    mimeType: payload?.file.mimeType ?? "application/octet-stream",
    encrypted: payload?.file.encrypted,
    participantIds: payload?.participantIds,
    chatId,
    senderId: payload?.senderId,
    isGroup: payload?.isGroup,
    epochNonce: payload?.epochNonce,
    epochCounter: payload?.epochCounter,
    enabled: !!payload,
  });

  const bindPdfPinch = usePinch(({ offset: [scale], event }) => {
    event?.preventDefault();
    setPdfScale(Math.min(3, Math.max(0.5, scale)));
  }, {
    scaleBounds: { min: 0.5, max: 3 },
    from: () => [pdfScale, 0],
    eventOptions: { passive: false },
  });

  const bindImagePinch = usePinch(({ offset: [scale], event }) => {
    event?.preventDefault();
    setImageScale(Math.min(4, Math.max(1, scale)));
  }, {
    scaleBounds: { min: 1, max: 4 },
    from: () => [imageScale, 0],
    eventOptions: { passive: false },
  });

  const bindImageDrag = useDrag(({ first, movement: [mx, my], memo }) => {
    const container = imageScrollRef.current;
    if (!container || imageScale <= 1) return memo;
    if (first) {
      return { left: container.scrollLeft, top: container.scrollTop };
    }
    const start = memo ?? { left: container.scrollLeft, top: container.scrollTop };
    container.scrollLeft = start.left - mx;
    container.scrollTop = start.top - my;
    return start;
  }, { pointer: { touch: true } });

  const file = payload?.file;
  const mediaUrl = mediaQuery.data;
  const isImage = !!file?.mimeType.startsWith("image/");
  const isPdf = file?.mimeType === "application/pdf";
  const imageNaturalWidth = file?.width ?? 1200;
  const imageNaturalHeight = file?.height ?? 1200;
  const imageBaseWidth = Math.min(pageWidth, imageNaturalWidth);
  const imageDisplayWidth = Math.round(imageBaseWidth * imageScale);
  const imageDisplayHeight = Math.round(imageDisplayWidth * (imageNaturalHeight / imageNaturalWidth));
  const canZoom = isPdf || isImage;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background text-foreground">
      <div
        className="flex items-center gap-3 border-b border-border/50 bg-card/80 px-4 pb-3 pt-3 backdrop-blur-sm"
        style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{file?.name ?? "File"}</p>
        {canZoom && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => isPdf
                ? setPdfScale((scale) => Math.max(0.5, scale - 0.25))
                : setImageScale((scale) => Math.max(1, scale - 0.25))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary"
              aria-label="Zoom out"
            >
              <Icon icon="lucide:minus" className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center text-[10px] text-muted-foreground tabular-nums">
              {Math.round((isPdf ? pdfScale : imageScale) * 100)}%
            </span>
            <button
              onClick={() => isPdf
                ? setPdfScale((scale) => Math.min(3, scale + 0.25))
                : setImageScale((scale) => Math.min(4, scale + 0.25))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary"
              aria-label="Zoom in"
            >
              <Icon icon="lucide:plus" className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <main className={isPdf || isImage ? "min-h-0 flex-1 overflow-hidden" : "flex min-h-0 flex-1 items-center justify-center overflow-auto px-3 py-4"}>
        {missing ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Icon icon="solar:file-corrupted-bold" className="h-8 w-8" />
            <p className="text-sm">File unavailable</p>
          </div>
        ) : mediaQuery.isLoading || !mediaUrl ? (
          <div className="flex h-full min-h-[240px] w-full items-center justify-center">
            <ButtonLoader size="lg" />
          </div>
        ) : mediaQuery.isError ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Icon icon="solar:file-corrupted-bold" className="h-8 w-8" />
            <p className="text-sm">Could not load file</p>
          </div>
        ) : isImage && file ? (
          <div
            ref={imageScrollRef}
            className="h-full w-full overflow-auto bg-black px-3 py-4"
            style={{ touchAction: imageScale > 1 ? "none" : "pan-x pan-y" }}
            onContextMenu={(event) => event.preventDefault()}
            {...bindImagePinch()}
            {...bindImageDrag()}
          >
            <div className="mx-auto flex min-h-full w-max min-w-full items-center justify-center">
              <Image
                src={mediaUrl}
                alt={file.name}
                width={imageDisplayWidth}
                height={imageDisplayHeight}
                unoptimized
                className="select-none rounded-lg object-contain"
                style={{ width: imageDisplayWidth, height: "auto" }}
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
              />
            </div>
          </div>
        ) : isPdf ? (
          <div
            className="h-full w-full overflow-auto bg-neutral-200 px-3 py-4"
            style={{ touchAction: "pan-x pan-y" }}
            onContextMenu={(event) => event.preventDefault()}
            {...bindPdfPinch()}
          >
            <div className="mx-auto flex w-max min-w-full flex-col items-center">
              <Document
                file={mediaUrl}
                onLoadSuccess={({ numPages: pageCount }) => setNumPages(pageCount)}
                loading={<ButtonLoader size="lg" />}
                error={
                  <div className="flex flex-col items-center justify-center gap-2 py-20 text-neutral-500">
                    <Icon icon="solar:document-bold" className="h-8 w-8" />
                    <p className="text-sm">Could not load PDF</p>
                  </div>
                }
              >
                {Array.from({ length: numPages }, (_, index) => (
                  <Page
                    key={index}
                    pageNumber={index + 1}
                    width={pageWidth}
                    scale={pdfScale}
                    devicePixelRatio={devicePixelRatio}
                    className="mb-3 overflow-hidden rounded-md shadow-lg"
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                ))}
              </Document>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Icon icon="solar:file-bold" className="h-8 w-8" />
            <p className="text-sm">Preview unavailable</p>
          </div>
        )}
      </main>
    </div>
  );
}
