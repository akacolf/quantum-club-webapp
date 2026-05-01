import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-[calc(100dvh-70px)] flex-col bg-background">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/png/qc-chat-logo.png" alt="QC Chat" width={36} height={36} />
            <div>
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-3 w-8 bg-yellow-400/20" />
              </div>
              <Skeleton className="mt-1 h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>

        <Skeleton className="h-9 w-full rounded-xl bg-secondary" />
        <div className="mt-3 grid h-10 grid-cols-2 rounded-xl bg-secondary p-1">
          <Skeleton className="h-full rounded-lg bg-primary/15" />
          <Skeleton className="h-full rounded-lg bg-transparent" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {[...Array(8)].map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
