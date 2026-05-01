import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-background" aria-hidden />
      <div className="fixed inset-0 z-[41] flex flex-col">
        <div
          className="flex shrink-0 items-center gap-3 bg-card/80 px-4 py-3 backdrop-blur-sm"
          style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 0px) + 0.75rem)" }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
            <Image src="/svg/logo-dark.svg" alt="QC AI" width={20} height={20} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-hidden px-3 py-4">
          <div className="flex gap-2">
            <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-full" />
            <Skeleton className="h-16 w-[76%] rounded-2xl rounded-bl-md" />
          </div>
          <div className="flex flex-row-reverse gap-2">
            <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-full" />
            <Skeleton className="h-10 w-[64%] rounded-2xl rounded-br-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-full" />
            <Skeleton className="h-28 w-[82%] rounded-2xl rounded-bl-md" />
          </div>
        </div>

        <div
          className="shrink-0 bg-card/50 px-3 py-2.5 backdrop-blur-sm"
          style={{ paddingBottom: "max(0.625rem, var(--tg-safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 flex-1 rounded-full bg-background" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>
    </>
  );
}
