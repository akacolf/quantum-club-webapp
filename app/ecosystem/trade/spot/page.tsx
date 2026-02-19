"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useSpotTokens } from "@/app/(hooks)/queries/use-spot-trading";
import { useWallet } from "@/app/wallet/WalletContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { Address } from "@ton/core";
import SpotTokenCard from "./(components)/SpotTokenCard";

function TokenListSkeleton() {
    return (
        <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="bg-white/5 border border-white/5">
                    <CardContent className="p-3">
                        <div className="flex gap-3 items-center">
                            <Skeleton className="w-11 h-11 rounded-xl" />
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

export default function SpotTradingPage() {
    useTelegramBackButton("/ecosystem/trade");
    const { data: tokens, isLoading } = useSpotTokens();
    const { jettons } = useWallet();
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Build a set of raw addresses the user holds for fast lookup
    const holdingsMap = useMemo(() => {
        const map = new Map<string, string>(); // rawAddress → balance
        for (const j of jettons) {
            if (j.jettonAddress) {
                try {
                    const raw = Address.parse(j.jettonAddress).toRawString();
                    map.set(raw, j.balance);
                } catch {
                    // skip unparseable
                }
            }
        }
        return map;
    }, [jettons]);

    const filtered = useMemo(() => {
        if (!tokens) return [];
        let list = tokens;
        if (debouncedQuery) {
            const q = debouncedQuery.toLowerCase();
            list = list.filter(
                (t) =>
                    t.symbol.toLowerCase().includes(q) ||
                    t.displayName.toLowerCase().includes(q)
            );
        }
        // Sort: user holdings first, then alphabetical
        return list.sort((a, b) => {
            const aHeld = holdingsMap.has(normalizeAddress(a.contractAddress)) ? 1 : 0;
            const bHeld = holdingsMap.has(normalizeAddress(b.contractAddress)) ? 1 : 0;
            if (aHeld !== bHeld) return bHeld - aHeld;
            return a.symbol.localeCompare(b.symbol);
        });
    }, [tokens, debouncedQuery, holdingsMap]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-32">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 pb-3">
                <div className="px-4 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <Icon icon="solar:chart-2-bold" className="w-4.5 h-4.5 text-green-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white">
                                Spot Trading
                            </h1>
                            <p className="text-[10px] text-muted-foreground font-medium tracking-wide">
                                Trade TON Jettons
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative group">
                        <Icon
                            icon="solar:magnifer-linear"
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-white transition-colors z-10"
                        />
                        <Input
                            type="text"
                            placeholder="Search tokens..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* Content */}
            <div className="px-4 py-3 space-y-2">
                {isLoading ? (
                    <TokenListSkeleton />
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <Icon icon="solar:box-minimalistic-bold" className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">
                            {debouncedQuery
                                ? `No tokens found for "${debouncedQuery}"`
                                : "No tokens available"}
                        </p>
                    </div>
                ) : (
                    filtered.map((token, index) => {
                        const rawAddr = normalizeAddress(token.contractAddress);
                        const balance = holdingsMap.get(rawAddr);
                        return (
                            <SpotTokenCard
                                key={token.contractAddress}
                                token={token}
                                index={index}
                                userBalance={balance}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}

function normalizeAddress(addr: string): string {
    try {
        return Address.parse(addr).toRawString();
    } catch {
        return addr;
    }
}
