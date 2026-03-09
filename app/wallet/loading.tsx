import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 space-y-6">
        {/* Balance Card */}
        <Card className="w-full bg-gradient-to-br from-[#0c0c0c] to-black border-white/5 rounded-[32px] overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-32 rounded-full" />
              <div className="flex gap-1.5">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="size-9 rounded-full" />
              </div>
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-4 w-16 mt-1" />
            </div>
            {/* Action Buttons Row */}
            <div className="flex gap-3 pt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                  <Skeleton className="size-12 rounded-full" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Skeleton className="h-10 w-full rounded-xl" />

        {/* Token List */}
        <div className="w-full space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-[#111] border-[#222]">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-14" />
                  </div>
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
    </div>
  );
}
