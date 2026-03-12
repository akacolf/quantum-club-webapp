import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-100 bg-black text-white p-6 flex flex-col h-dvh">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto">
        {/* Timer */}
        <Skeleton className="h-10 w-20 rounded-full mb-8" />

        {/* Math Problem */}
        <Card className="w-full bg-[#1a1a1a]/60 border-[#333] mb-8">
          <CardContent className="p-8 flex items-center justify-center">
            <Skeleton className="h-12 w-48" />
          </CardContent>
        </Card>

        {/* Answer Options */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>

        {/* Score */}
        <Skeleton className="h-5 w-32 mt-6" />
      </div>
    </div>
  );
}
