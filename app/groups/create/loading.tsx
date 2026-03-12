import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="p-4 pt-8 space-y-6 flex flex-col items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md border-border bg-card/80">
          <CardHeader className="text-center">
            <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-7 w-40 mx-auto" />
            <Skeleton className="h-4 w-44 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            {/* Description Field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
            {/* NFT Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
            {/* Submit Button */}
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
