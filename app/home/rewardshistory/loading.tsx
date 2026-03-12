import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="mb-6">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-4 w-48 mt-1" />
      </div>

      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-[#111] border-[#333]">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-7 w-20 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
