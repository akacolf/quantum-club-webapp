import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="p-6 pt-8">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>

      {/* Tabs */}
      <div className="px-4 mb-6">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      {/* Task Cards */}
      <div className="px-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="border-[#333] bg-[#1a1a1a]/60">
            <CardContent className="p-4 flex items-center gap-4">
              {/* Icon */}
              <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
              {/* Content */}
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              {/* Action Button */}
              <Skeleton className="h-9 w-16 rounded-lg shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
