import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingReceiveAsset() {
  return (
    <div className="min-h-screen bg-background px-6 pb-24 pt-7 text-foreground">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center space-y-8">
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-8 w-40 bg-secondary" />
          <Skeleton className="mx-auto h-4 w-56 bg-secondary" />
        </div>
        <Skeleton className="h-[236px] w-[236px] rounded-3xl bg-secondary" />
        <Skeleton className="h-16 w-full rounded-xl bg-secondary" />
        <Skeleton className="h-24 w-full rounded-xl bg-secondary" />
        <div className="grid w-full grid-cols-2 gap-3">
          <Skeleton className="h-12 rounded-xl bg-secondary" />
          <Skeleton className="h-12 rounded-xl bg-secondary" />
        </div>
      </div>
    </div>
  );
}
