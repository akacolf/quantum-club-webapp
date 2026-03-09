import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Personalized Greeting Card */}
      <div className="w-[90%] mx-auto mt-4 mb-2">
        <Card className="border-0 bg-[#0a0a0a]/80">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-full" />
                <Skeleton className="h-5 w-36" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QNTM Balance — centered icon + amount + rank pill */}
      <div className="flex flex-col items-center py-6">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex items-center gap-2 mt-4">
          <Skeleton className="h-12 w-40" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="h-8 w-32 rounded-full mt-4" />
      </div>

      {/* Daily Check-In */}
      <div className="w-[90%] mx-auto h-16 sm:h-20 bg-[#1a1a1a] rounded-xl">
        <div className="p-4 flex items-center justify-between h-full">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
          </div>
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>

      {/* Carousel */}
      <Skeleton className="w-[90%] mx-auto h-44 rounded-xl mt-6" />

      {/* Solve to Earn Card */}
      <div className="w-[90%] mx-auto h-16 sm:h-20 bg-[#1a1a1a] rounded-xl mt-6">
        <div className="p-4 flex items-center justify-between h-full">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
