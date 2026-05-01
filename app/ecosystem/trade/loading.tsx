import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-32">
      <div className="sticky top-0 z-40 bg-background/80 pb-3 backdrop-blur-xl">
        <div className="px-4 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-36" />
              <Skeleton className="mt-2 h-3 w-48" />
            </div>
            <Skeleton className="h-12 w-36 rounded-full bg-primary/15" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl bg-secondary" />
          <div className="mt-3 grid h-11 grid-cols-2 rounded-xl bg-secondary p-1">
            <Skeleton className="h-full rounded-lg bg-white/10" />
            <Skeleton className="h-full rounded-lg bg-transparent" />
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="rounded-lg bg-white/5 p-3">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="mt-4 h-1 w-full rounded-full" />
                <div className="mt-3 flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
