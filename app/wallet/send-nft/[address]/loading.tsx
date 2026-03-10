import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Page Title */}
        <div className="text-center mb-6">
          <Skeleton className="h-7 w-24 mx-auto" />
        </div>

        {/* NFT Preview Card */}
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-4 flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>

        {/* Recipient Input */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 ml-1" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>

        {/* Continue Button */}
        <Skeleton className="h-14 w-full rounded-xl mt-8" />
      </div>
    </div>
  );
}
