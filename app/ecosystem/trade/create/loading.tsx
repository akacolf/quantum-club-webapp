import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-44 mt-1" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Token details card */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-44 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="w-20 h-20 rounded-xl" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  );
}
