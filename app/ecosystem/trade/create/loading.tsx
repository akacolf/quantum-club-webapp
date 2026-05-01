import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-32">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
        <div className="px-4 py-4">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-2 h-3 w-48" />
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-5 px-4 py-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>

        {[...Array(3)].map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full rounded-xl bg-secondary" />
          </div>
        ))}

        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-28 w-full rounded-xl bg-secondary" />
        </div>

        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
