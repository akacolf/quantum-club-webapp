import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function EcosystemLoading() {
  return (
    <div className="min-h-screen pb-24">
      {/* Search Bar */}
      <div className="px-4 pt-4">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      {/* Category Tabs */}
      <div className="px-4 mt-3 mb-4">
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* Token Cards */}
      <div className="px-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="bg-[#1a1a1a]/60 border-[#333]">
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-12 ml-auto" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
