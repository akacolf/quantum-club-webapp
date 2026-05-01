import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 py-6">
        <Skeleton className="h-8 w-72 rounded-lg mb-2" />
        <Skeleton className="h-4 w-[90%] rounded" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 px-4 mt-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="bg-[#1a1a1a]/80">
            <CardContent className="p-4 flex flex-col items-center justify-center space-y-2">
              <Skeleton className="rounded-full w-10 h-10" />
              <div className="flex flex-col items-center gap-1">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-6 w-16 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Stats Card */}
      <div className="flex flex-col mt-6 px-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32 rounded" />
        </div>
        <Card className="bg-[#1a1a1a]/80 h-24">
          <CardContent className="p-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="w-9 h-12 rounded" />
              <div className="-ml-1">
                <Skeleton className="h-5 w-32 rounded mb-2" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </div>
            <div className="flex flex-col items-end justify-center">
              <Skeleton className="h-6 w-12 rounded" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranked List */}
      <div className="mt-6 px-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-24 rounded" />
        </div>
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="bg-[#1a1a1a]/40">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="rounded-full w-10 h-10" />
                <div>
                  <Skeleton className="h-4 w-24 rounded mb-1" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
