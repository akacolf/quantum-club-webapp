import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <div className="mb-10">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-56 mt-2" />
      </div>

      <div className="relative border-l-2 border-[#333] ml-3 space-y-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="ml-8 relative">
            <Skeleton className="absolute -left-[43px] top-0 w-8 h-8 rounded-full" />
            <div className="p-5 rounded-2xl border border-[#333] bg-[#111]">
              <div className="flex items-center justify-between mb-2">
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
