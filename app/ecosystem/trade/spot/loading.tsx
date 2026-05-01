import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-32">
      <div className="sticky top-0 z-40 bg-background/80 pb-3 backdrop-blur-xl">
        <div className="px-4 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="mb-3 h-10 w-full rounded-xl bg-secondary" />
          <Skeleton className="h-11 w-full rounded-xl bg-secondary" />
        </div>
      </div>

      <div className="space-y-1 px-4 py-3">
        {[...Array(8)].map((_, index) => (
          <div key={index} className="flex items-center gap-3 py-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
