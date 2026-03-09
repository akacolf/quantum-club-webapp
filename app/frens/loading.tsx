import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen pb-24">
      <div className="p-4 space-y-6">
        {/* Header */}
        <Skeleton className="h-9 w-24" />

        {/* TON Referral Earnings Card */}
        <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border-[#333]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div>
                  <Skeleton className="h-3 w-32 mb-2" />
                  <Skeleton className="h-7 w-28" />
                </div>
              </div>
              <Skeleton className="h-10 w-20 rounded-xl" />
            </div>
            <Skeleton className="h-3 w-full mt-3" />
          </CardContent>
        </Card>

        {/* Referral Stats Card */}
        <Card className="bg-[#1a1a1a]/80 border-[#333]">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex flex-col items-end">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-3 w-20 mt-1" />
              </div>
            </div>
            <div className="border-t border-[#333] pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-5 h-5 rounded" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-16 rounded-xl" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invite Button Placeholder */}
        <Skeleton className="h-12 w-full rounded-xl" />

        {/* Referrals List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-5 w-24" />
          </div>
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-white/5 border-white/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-24 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
