import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <div className="px-4 pt-6">
        <Skeleton className="h-9 w-20 rounded-full bg-secondary" />
      </div>

      <div className="px-4 pt-6">
        <div className="flex flex-col items-center space-y-3">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>

        <div className="mt-8 space-y-4">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="flex items-center gap-3 py-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>

        <Skeleton className="mt-8 h-5 w-24" />
        <div className="mt-3 space-y-1">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center gap-3 py-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
