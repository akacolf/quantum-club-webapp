import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="p-4 pt-6">
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Chat List */}
      <div className="px-4 space-y-2">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-white/5 border-white/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-3 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
