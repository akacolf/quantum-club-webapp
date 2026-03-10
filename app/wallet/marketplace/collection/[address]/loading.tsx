import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      {/* Cover Image */}
      <Skeleton className="h-48 mx-4 mt-4 rounded-2xl" />

      <div className="px-4 -mt-12 relative z-10 space-y-6">
        {/* Collection Avatar */}
        <Skeleton className="w-24 h-24 rounded-2xl border-4 border-background" />

        {/* Collection Info */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-10" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View on Explorer Button */}
        <Skeleton className="h-10 w-full rounded-md" />

        {/* Section Title */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>

        {/* NFT Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card border-border overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-3 space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
