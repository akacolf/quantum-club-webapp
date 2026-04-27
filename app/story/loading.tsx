import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-black text-white z-50 flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_55%)]" />

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        <div className="relative flex flex-col items-center space-y-4 p-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <Skeleton className="w-5 h-5 rounded bg-white/10" />
            <Skeleton className="h-4 w-40 bg-white/10" />
          </div>
          <Skeleton className="h-14 w-56 bg-white/10" />
          <Skeleton className="h-7 w-32 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="absolute top-20 left-0 right-0 z-30 flex justify-center items-center gap-2 px-4 pt-safe-top">
        {[1, 2].map((item) => (
          <Skeleton key={item} className="flex-1 h-1 rounded-full bg-white/20" />
        ))}
      </div>
    </div>
  );
}
