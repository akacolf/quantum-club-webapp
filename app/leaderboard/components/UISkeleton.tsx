export default function LeaderboardUISkeleton() {
  return (
    <div>
      {/* Header Skeleton */}
      <div className="items-start p-4 flex justify-between">
        <div className="flex items-center justify-center space-x-1">
          <div className="skeleton rounded-full w-8 h-8" />
          <div>
            <div className="skeleton h-8 w-32 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="stats mt-8">
        <div className="stat">
          <div className="stat-figure text-primary">
            <div className="skeleton rounded-full w-10 h-10" />
          </div>
          <div className="stat-title">
            <div className="skeleton h-4 w-20 rounded" />
          </div>
          <div className="stat-value text-primary">
            <div className="skeleton h-6 w-16 rounded" />
          </div>
        </div>
        <div className="stat">
          <div className="stat-figure text-secondary">
            <div className="skeleton rounded-full w-10 h-10" />
          </div>
          <div className="stat-title">
            <div className="skeleton h-4 w-20 rounded" />
          </div>
          <div className="stat-value text-secondary">
            <div className="skeleton h-6 w-16 rounded" />
          </div>
        </div>
      </div>

      {/* UserStatsCard Skeleton */}
      <div className="flex flex-col mt-5">
        <div className="font-medium pl-5">
          <div className="skeleton h-4 w-24 rounded" />
        </div>
        <div className="card relative rounded-xl h-20 p-4 w-9/10 mx-auto mt-3 overflow-hidden">
          <div className="absolute inset-0">
            <div className="skeleton w-full h-full rounded-xl" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="skeleton rounded-full w-12 h-12" />
              </div>
              <div className="font-medium">
                <div className="skeleton h-4 w-24 rounded" />
                <div className="skeleton h-4 w-16 rounded mt-1" />
              </div>
            </div>
            <div className="font-medium">
              <div className="skeleton h-4 w-10 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* List Skeleton */}
      <div className="mt-5 space-y-0">
        <div className="font-semibold pl-5">
          <div className="skeleton h-4 w-24 rounded" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex justify-between px-5 py-3 bg-black mt-2 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <div className="skeleton rounded-full w-8 h-8" />
              <div>
                <div className="skeleton h-4 w-24 rounded" />
                <div className="skeleton h-4 w-16 rounded mt-1" />
              </div>
            </div>
            <div className="flex items-center">
              <div className="skeleton h-6 w-6 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}