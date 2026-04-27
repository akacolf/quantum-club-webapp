import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="p-6 pt-8">
        <Skeleton className="h-16 w-[88%]" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {/* Tabs */}
      <div className="px-4 mb-6">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      {/* Task Cards */}
      <div className="px-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-[#1a1a1a]/60 rounded-lg">
            <div className="p-4 flex items-center gap-4">
              {/* Icon */}
              <Skeleton className="w-10 h-10 rounded shrink-0" />
              {/* Content */}
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
              {/* Action Button */}
              <Skeleton className="h-9 w-16 rounded-lg shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
