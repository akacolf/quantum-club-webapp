import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-40">
      <div className="px-4 pt-4 space-y-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="ml-auto h-3 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>

        <Skeleton className="h-[220px] w-full rounded-lg" />

        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="space-y-2 py-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-36 left-0 right-0 z-40 px-4">
        <div className="mx-auto flex max-w-md gap-3">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
