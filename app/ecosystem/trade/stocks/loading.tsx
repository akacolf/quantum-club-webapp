import { Skeleton } from "@/components/ui/skeleton";

export default function StocksLoading() {
    return (
        <div className="min-h-screen bg-background pb-24">
            <div
                className="px-4 pt-3 pb-4 bg-card/50 backdrop-blur-sm"
                style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 0px) + 0.75rem)" }}
            >
                <Skeleton className="h-7 w-32 mb-1" />
                <Skeleton className="h-3 w-48 mb-3" />
                <Skeleton className="h-10 rounded-full" />
            </div>
            <div className="px-3 pt-3 space-y-2">
                <Skeleton className="h-14 rounded-xl" />
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-[68px] rounded-xl" />
                ))}
            </div>
        </div>
    );
}
