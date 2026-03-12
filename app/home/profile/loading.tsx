import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="p-4 pt-8 space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="w-28 h-28 rounded-full" />
          <Skeleton className="h-7 w-40" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card/80">
              <CardContent className="p-4">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-6 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Achievements Header */}
        <Skeleton className="h-6 w-40" />

        {/* Achievements Grid */}
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card/50 border border-border rounded-xl p-3 flex flex-col items-center">
              <Skeleton className="w-8 h-8 rounded-full mb-1" />
              <Skeleton className="h-3 w-14 mb-1.5" />
              <Skeleton className="h-3 w-10 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
