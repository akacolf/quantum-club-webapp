"use client";

import { useDeferredValue, useState, useSyncExternalStore } from "react";
import { parseAsString, useQueryStates } from "nuqs";
import { Icon } from "@iconify/react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useXStocksTokens } from "@/app/(hooks)/queries/use-spot-trading";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import SpotTokenCard from "../spot/(components)/SpotTokenCard";
import { underlyingTicker, XSTOCKS_ACK_LOCAL_KEY } from "@/lib/xstocks";
import { StocksComplianceGate } from "./(components)/StocksComplianceGate";

const subscribeAck = (cb: () => void) => {
    window.addEventListener("storage", cb);
    return () => window.removeEventListener("storage", cb);
};

const getAckSnapshot = (): boolean => {
    try {
        return localStorage.getItem(XSTOCKS_ACK_LOCAL_KEY) !== null;
    } catch {
        return false;
    }
};

const getAckServerSnapshot = (): null => null;

export default function StocksPage() {
    useTelegramBackButton("/ecosystem/trade");

    const [localAck, setLocalAck] = useState(false);
    const persistedAck = useSyncExternalStore(subscribeAck, getAckSnapshot, getAckServerSnapshot);
    const acknowledged = persistedAck === null ? null : persistedAck || localAck;

    const { data: tokens, isLoading } = useXStocksTokens();
    const [{ q: searchQuery }, setParams] = useQueryStates(
        { q: parseAsString.withDefault("") },
        { history: "replace" },
    );
    const setSearchQuery = (value: string) => setParams({ q: value });
    const debouncedQuery = useDeferredValue(searchQuery);

    if (acknowledged === null) {
        return null;
    }

    if (!acknowledged) {
        return <StocksComplianceGate onAcknowledge={() => setLocalAck(true)} />;
    }

    const filtered = (() => {
        const all = tokens ?? [];
        if (!debouncedQuery) return all;
        const q = debouncedQuery.toLowerCase();
        return all.filter(
            (t) =>
                t.symbol.toLowerCase().includes(q) ||
                t.displayName.toLowerCase().includes(q) ||
                underlyingTicker(t.symbol).toLowerCase().includes(q),
        );
    })();

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-32">
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 pb-3">
                <div className="px-4 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Icon icon="solar:graph-up-bold" className="w-5 h-5 text-blue-400" />
                        <h1 className="text-xl font-bold tracking-tight text-white">xStocks</h1>
                    </div>

                    <div className="relative group">
                        <Icon
                            icon="solar:magnifer-linear"
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-white transition-colors z-10"
                        />
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search stocks…"
                            className="pl-10 h-11 bg-white/5 border-white/5 text-white placeholder:text-muted-foreground focus:bg-white/10 focus:border-white/20 transition-all rounded-xl backdrop-blur-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white p-1 rounded-full hover:bg-white/10"
                            >
                                <Icon icon="solar:close-circle-bold" className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-4 py-3 space-y-2">
                {isLoading ? (
                    <StocksSkeleton />
                ) : filtered.length === 0 ? (
                    <EmptyState query={debouncedQuery} />
                ) : (
                    <div className="space-y-2">
                        {filtered.map((token, i) => (
                            <SpotTokenCard key={token.contractAddress} token={token} index={i} backTo="/ecosystem/trade/stocks" />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StocksSkeleton() {
    return (
        <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="bg-white/5 border-0">
                    <CardContent className="p-3">
                        <div className="flex gap-3 items-center">
                            <Skeleton className="w-11 h-11 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function EmptyState({ query }: { query: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6 gap-4">
            <Icon icon="solar:chart-2-broken" className="w-12 h-12 text-muted-foreground" />
            <div>
                <p className="text-sm font-medium text-foreground">
                    {query ? "No stocks match your search" : "No stocks available yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                    {query
                        ? "Try a different ticker like AAPL or TSLA."
                        : "Backed Finance xStocks will appear here once they are listed on the STON.fi network."}
                </p>
            </div>
        </div>
    );
}
