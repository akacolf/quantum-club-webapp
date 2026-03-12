import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 pb-3">
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>

          {/* Tabs */}
          <Skeleton className="h-10 w-full rounded-xl mb-3" />

          {/* Search */}
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>

      {/* Token List */}
      <div className="px-4 py-3 space-y-2">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-white/5 border border-white/5">
            <CardContent className="p-3">
              <div className="flex gap-3 items-center">
                <Skeleton className="w-11 h-11 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
