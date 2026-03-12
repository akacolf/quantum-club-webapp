import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-100 bg-black text-white p-6 flex flex-col h-dvh">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto pt-24">
        {/* Animation */}
        <Skeleton className="w-24 h-24 rounded-full mb-12" />

        {/* Title */}
        <div className="text-center mb-16 space-y-3">
          <Skeleton className="h-9 w-56 mx-auto" />
          <Skeleton className="h-4 w-44 mx-auto" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-6 w-full mb-16">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="bg-[#1a1a1a]/60 border-[#333]">
              <CardContent className="p-6 flex flex-col items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2 text-center">
                  <Skeleton className="h-3 w-20 mx-auto" />
                  <Skeleton className="h-6 w-16 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Button */}
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}
