export default function TasksSkeleton() {
    return (
    <div className="space-y-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="skeleton w-10 h-10 rounded-full" />
            <div>
              <div className="skeleton h-4 w-32 mb-2 rounded-lg" />
              <div className="skeleton h-3 w-20 rounded-lg" />
            </div>
          </div>
          <div className="text-right">
            <div className="skeleton h-4 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
    )
}