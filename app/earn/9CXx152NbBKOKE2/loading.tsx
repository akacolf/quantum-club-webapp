import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="bg-black flex flex-col min-h-screen">
      <div className="flex flex-col ml-4 mt-28">
        <Skeleton className="h-5 w-16 mb-2" />
        <Skeleton className="h-11 max-w-80 rounded-lg" />
      </div>
      <div className="mt-4 ml-4">
        <Skeleton className="h-12 w-28 rounded-xl" />
      </div>
    </div>
  );
}
