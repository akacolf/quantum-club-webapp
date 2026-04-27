import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen pb-16 pt-6 gap-6">
      {/* Personalized Greeting */}
      <div className="px-5 pb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="mt-3 flex flex-col items-center">
          <Skeleton className="h-11 w-11 rounded" />
          <Skeleton className="mt-4 h-4 w-72" />
        </div>
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

      {/* Market Pulse */}
      <div className="w-full overflow-x-auto hide-scrollbar">
        <div className="flex w-max max-w-none gap-2.5 px-[5vw] pb-2">
          <Skeleton className="h-10 w-36 shrink-0 rounded-xl bg-secondary" />
          <Skeleton className="h-10 w-40 shrink-0 rounded-xl bg-secondary" />
          <Skeleton className="h-10 w-44 shrink-0 rounded-xl bg-secondary" />
        </div>
      </div>

      {/* Daily Check-In */}
      <div className="w-[90%] mx-auto h-16 sm:h-20 bg-secondary rounded-xl">
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
      <Skeleton className="w-[90%] mx-auto h-44 rounded-xl" />

      {/* Trading */}
      <div className="w-[90%] mx-auto">
        <div className="mb-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-36 mt-1" />
        </div>
        <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-x-auto pb-3 [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1 px-[5vw]">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-14 rounded-full" />
            <Skeleton className="h-8 w-14 rounded-full" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center w-full">
              <Skeleton className="w-8 h-8 flex-shrink-0 bg-transparent" />
              <div className="flex-1 min-w-0 rounded-lg p-2">
                <div className="flex gap-3 items-center">
                  <Skeleton className="w-11 h-11 rounded-full bg-secondary" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-16 bg-secondary" />
                    <Skeleton className="h-3 w-28 mt-2 bg-secondary" />
                  </div>
                  <div className="flex flex-col items-end">
                    <Skeleton className="h-4 w-16 bg-secondary" />
                    <Skeleton className="h-3 w-12 mt-2 bg-secondary" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-11 w-full rounded-xl mt-4 bg-secondary" />
      </div>
    </div>
  );
}
