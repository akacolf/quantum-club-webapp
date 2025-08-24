export default function HomeUISkeleton() {
  return (
    <div className="flex flex-col">
      {/* Wallet Skeleton */}
      <div className="w-full flex justify-center mt-8">
        <div className="btn btn-disabled rounded-lg flex items-center gap-2 bg-base-200 font-semibold w-64 h-12">
          <div className="skeleton rounded-full w-6 h-6" />
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton rounded-full w-4 h-4" />
        </div>
      </div>

      {/* QNTM Balance Skeleton */}
      <div className="flex flex-col items-center">
        <div className="skeleton rounded-full w-[7em] h-[7em] mb-3 mt-8" />
        <div className="flex items-center gap-2 text-center mt-2">
          <div className="skeleton h-12 w-24 rounded" />
          <div className="skeleton h-6 w-12 rounded" />
        </div>
        <div className="flex items-center justify-center gap-1 px-4 py-1.5 mt-1">
          <div className="skeleton h-4 w-16 rounded" />
          <div className="skeleton h-4 w-8 rounded" />
        </div>
        <div className="flex items-center mt-2">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-4 w-4 rounded ml-2" />
        </div>
      </div>

      {/* Farming QNTM Skeleton */}
      <div className="w-9/10 mx-auto mt-3 mb-6">
        <div className="font-semibold text-lg">
          <div className="skeleton h-6 w-20 rounded" />
        </div>
        <div className="flex items-center justify-between bg-black rounded-xl p-1 mt-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center">
              <div className="skeleton rounded-full w-6 h-6" />
            </div>
            <div>
              <div className="skeleton h-4 w-12 rounded" />
              <div className="skeleton h-4 w-16 rounded mt-1" />
            </div>
          </div>
          <div>
            <div className="skeleton h-9 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Solve-to-Earn Card Skeleton */}
      <div className="w-9/10 mx-auto mt-4">
        <div className="font-semibold text-lg mb-3">
          <div className="skeleton h-6 w-32 rounded" />
        </div>
        <div className="relative flex items-center justify-between rounded-2xl p-4 overflow-hidden" style={{ minHeight: "100px" }}>
          <div className="absolute inset-0">
            <div className="skeleton w-full h-full rounded-2xl" />
          </div>
          <div className="flex items-center space-x-3 z-10">
            <div className="flex items-center justify-center">
              <div className="skeleton rounded-full w-10 h-10" />
            </div>
            <div>
              <div className="skeleton h-4 w-20 rounded" />
              <div className="skeleton h-4 w-16 rounded mt-1" />
            </div>
          </div>
          <div className="z-10">
            <div className="skeleton h-9 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}