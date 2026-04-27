import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <div className="mb-10">
        <Skeleton className="h-9 w-[85%]" />
        <Skeleton className="h-4 w-[78%] mt-2" />
      </div>

      <div className="relative ml-3 space-y-8 before:absolute before:left-0 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-white/10">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="ml-8 relative">
            <Skeleton className="absolute -left-[43px] top-0 w-8 h-8 rounded-full" />
            <div className="p-5 rounded-2xl bg-[#111]">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-24 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
