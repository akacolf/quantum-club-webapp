import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 min-w-0 space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
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
      </div>

      {/* Message Input */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        </div>
      </div>
    </div>
  );
}
