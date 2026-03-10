import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-40">
      <div className="px-4 pt-4 space-y-4">
        {/* Token Header */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-14 h-14 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-28 rounded-full" />
          </div>
        </div>

        {/* Price + Market Cap Row */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-7 w-28" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-3 w-16 ml-auto" />
            <Skeleton className="h-7 w-24 ml-auto" />
          </div>
        </div>

        {/* Price Chart */}
        <Skeleton className="h-[220px] w-full rounded-lg" />

        {/* Graduation Progress */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>

        {/* Tabs (Chat / Trades) */}
        <Skeleton className="h-10 w-full rounded-lg" />

        {/* Trade items list */}
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        {/* Buy/Sell Buttons */}
        <div className="fixed bottom-20 left-0 right-0 max-w-md mx-auto px-4">
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 flex-1 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
