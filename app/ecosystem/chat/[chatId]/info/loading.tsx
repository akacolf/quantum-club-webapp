import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="p-4 pt-8 space-y-6">
        {/* Group Header */}
        <div className="flex flex-col items-center space-y-3">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Info Cards */}
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>

        {/* Members Header */}
        <Skeleton className="h-6 w-20" />

        {/* Members List */}
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
