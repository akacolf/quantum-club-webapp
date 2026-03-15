import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="fixed inset-x-0 top-0 z-40 flex flex-col bg-background" style={{ height: "100dvh" }}>
      {/* Chat Header */}
      <div
        className="flex items-center gap-3 px-4 pb-4 border-b border-border"
        style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 min-w-0 space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden px-3 py-2 space-y-0.5">
        {/* Incoming message */}
        <div className="flex gap-2 max-w-[75%]">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-48 rounded-2xl rounded-tl-sm" />
          </div>
        </div>

        {/* Outgoing message */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-40 rounded-2xl rounded-tr-sm" />
        </div>

        {/* Incoming message */}
        <div className="flex gap-2 max-w-[75%]">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-16 w-56 rounded-2xl rounded-tl-sm" />
          </div>
        </div>

        {/* Outgoing message */}
        <div className="flex justify-end">
          <Skeleton className="h-14 w-44 rounded-2xl rounded-tr-sm" />
        </div>

        {/* Incoming message */}
        <div className="flex gap-2 max-w-[75%]">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-36 rounded-2xl rounded-tl-sm" />
          </div>
        </div>

        {/* Outgoing message */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-52 rounded-2xl rounded-tr-sm" />
        </div>

        {/* Incoming message */}
        <div className="flex gap-2 max-w-[75%]">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-12 w-44 rounded-2xl rounded-tl-sm" />
          </div>
        </div>

        {/* Outgoing message */}
        <div className="flex justify-end">
          <Skeleton className="h-16 w-48 rounded-2xl rounded-tr-sm" />
        </div>

        {/* Incoming message */}
        <div className="flex gap-2 max-w-[75%]">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-10 w-40 rounded-2xl rounded-tl-sm" />
          </div>
        </div>

        {/* Outgoing message */}
        <div className="flex justify-end">
          <Skeleton className="h-12 w-36 rounded-2xl rounded-tr-sm" />
        </div>

        {/* Incoming message */}
        <div className="flex gap-2 max-w-[75%]">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-18" />
            <Skeleton className="h-14 w-52 rounded-2xl rounded-tl-sm" />
          </div>
        </div>
      </div>

      {/* Message Input */}
      <div
        className="px-3 pt-3 border-t border-border"
        style={{ paddingBottom: "max(0.625rem, var(--tg-safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        </div>
      </div>
    </div>
  );
}
