"use client";

import React, { useState, useDeferredValue, useRef } from "react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Icon } from "@iconify/react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useSpotTokens } from "@/app/(hooks)/queries/use-spot-trading";
import { useWallet } from "@/app/wallet/WalletContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { Address } from "@ton/core";
import SpotTokenCard from "./(components)/SpotTokenCard";
import Link from "next/link";
import { motion } from "framer-motion";
import { TokenImageFill } from "@/components/ui/token-image";
import type { SpotToken } from "@/types/spot-trading";

type SpotTab = "tokens" | "positions";

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
    const { jettons, tonPrice } = useWallet();
    const [{ tab: activeTab, q: searchQuery }, setParams] = useQueryStates({
        tab: parseAsStringLiteral(["tokens", "positions"] as const).withDefault("tokens"),
        q: parseAsString.withDefault(""),
    }, { history: "replace" });
    const setActiveTab = (value: string) => setParams({ tab: value as SpotTab });
    const setSearchQuery = (value: string) => setParams({ q: value });
    const debouncedQuery = useDeferredValue(searchQuery);
    const listRef = useRef<HTMLDivElement>(null);

    // Build a set of raw addresses the user holds for fast lookup
    const holdingsMap = (() => {
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
    })();

    const filtered = (() => {
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
    })();

    // Positions: tokens user holds that match spot tokens
    const positions = (() => {
        if (!tokens) return [];
        return tokens
            .map((t) => {
                const rawAddr = normalizeAddress(t.contractAddress);
                const rawBalance = holdingsMap.get(rawAddr);
                if (!rawBalance || rawBalance === "0") return null;
                const balance = parseFloat(rawBalance) / Math.pow(10, t.decimals);
                if (balance <= 0) return null;
                const valueUsd = t.priceUsd ? balance * t.priceUsd : undefined;
                return { token: t, balance, valueUsd };
            })
            .filter(Boolean) as { token: typeof tokens[0]; balance: number; valueUsd?: number }[];
    })();

    const totalPositionValue = positions.reduce((sum, p) => sum + (p.valueUsd || 0), 0);

    /* eslint-disable react-hooks/refs -- TanStack Virtual is designed to read refs during render for scrollMargin */
    const virtualizer = useWindowVirtualizer({
        count: filtered.length,
        estimateSize: () => 80,
        overscan: 5,
        scrollMargin: listRef.current?.offsetTop ?? 0,
    });
    /* eslint-enable react-hooks/refs */

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

                    {/* Tabs */}
                    <div className="flex gap-1 mb-3 bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab("tokens")}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                activeTab === "tokens" ? "bg-white/10 text-white" : "text-muted-foreground"
                            }`}
                        >
                            All Tokens
                        </button>
                        <button
                            onClick={() => setActiveTab("positions")}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                activeTab === "positions" ? "bg-white/10 text-white" : "text-muted-foreground"
                            }`}
                        >
                            Positions {positions.length > 0 && `(${positions.length})`}
                        </button>
                    </div>

                    {/* Search (only for tokens tab) */}
                    {activeTab === "tokens" && (
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
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-3 space-y-2">
                {activeTab === "tokens" ? (
                    <>
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
                            <div ref={listRef}>
                                <div className="relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
                                    {virtualizer.getVirtualItems().map((virtualItem) => {
                                        const token = filtered[virtualItem.index];
                                        const rawAddr = normalizeAddress(token.contractAddress);
                                        const balance = holdingsMap.get(rawAddr);
                                        return (
                                            <div
                                                key={token.contractAddress}
                                                className="absolute top-0 left-0 w-full"
                                                style={{ transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)` }}
                                                ref={virtualizer.measureElement}
                                                data-index={virtualItem.index}
                                            >
                                                <div className="pb-2">
                                                    <SpotTokenCard
                                                        token={token}
                                                        index={virtualItem.index}
                                                        userBalance={balance}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Portfolio Summary */}
                        {positions.length > 0 && (
                            <Card className="bg-white/5 border-white/5 mb-3">
                                <CardContent className="p-4">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Portfolio Value</p>
                                    <p className="text-2xl font-bold text-white">
                                        {totalPositionValue > 0 ? `$${totalPositionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "--"}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {positions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <Icon icon="solar:wallet-bold" className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground">No positions yet</p>
                                <p className="text-xs text-muted-foreground/60 mt-1">Buy tokens to see them here</p>
                            </div>
                        ) : (
                            positions.map((pos, index) => {
                                const pctOfPortfolio = totalPositionValue > 0 && pos.valueUsd
                                    ? (pos.valueUsd / totalPositionValue) * 100
                                    : undefined;
                                return (
                                    <PositionCard
                                        key={pos.token.contractAddress}
                                        token={pos.token}
                                        balance={pos.balance}
                                        valueUsd={pos.valueUsd}
                                        pctOfPortfolio={pctOfPortfolio}
                                        index={index}
                                    />
                                );
                            })
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function PositionCard({ token, balance, valueUsd, pctOfPortfolio, index }: {
    token: SpotToken;
    balance: number;
    valueUsd?: number;
    pctOfPortfolio?: number;
    index: number;
}) {
    const change = token.priceChange24h;
    const isPositive = (change ?? 0) >= 0;
    const priceUsd = token.priceUsd;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index * 0.03, 0.3) }}
        >
            <Link href={`/ecosystem/trade/spot/${encodeURIComponent(token.contractAddress)}`} prefetch={true}>
                <Card className="bg-white/5 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer overflow-hidden group shadow-md hover:shadow-lg hover:bg-white/10">
                    <CardContent className="p-3">
                        <div className="flex gap-3 items-center">
                            {/* Token Image */}
                            <div className="relative w-11 h-11 rounded-full overflow-hidden bg-[#222] shadow-inner ring-1 ring-white/5 flex-shrink-0">
                                {token.imageUrl ? (
                                    <TokenImageFill src={token.imageUrl} alt={token.displayName} className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-primary font-bold text-sm">
                                        {token.symbol.slice(0, 2)}
                                    </div>
                                )}
                            </div>

                            {/* Token info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white text-sm leading-tight truncate">
                                    {token.symbol}
                                </h3>
                                <span className="text-[10px] text-muted-foreground">
                                    {balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {token.symbol}
                                </span>
                            </div>

                            {/* Value + Change */}
                            <div className="text-right flex-shrink-0">
                                <div className="font-semibold text-white text-sm tracking-tight">
                                    {valueUsd !== undefined && valueUsd > 0
                                        ? `$${valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        : "--"
                                    }
                                </div>
                                <div className={`text-[11px] font-semibold ${
                                    change === undefined ? "text-muted-foreground/50" : isPositive ? "text-green-400" : "text-red-400"
                                }`}>
                                    {change !== undefined
                                        ? `${isPositive ? "+" : ""}${change.toFixed(2)}%`
                                        : "--"
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Extra details row */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                {priceUsd !== undefined && priceUsd > 0 && (
                                    <span className="text-[10px] text-muted-foreground">
                                        Price: ${priceUsd >= 1 ? priceUsd.toFixed(2) : priceUsd.toFixed(6)}
                                    </span>
                                )}
                            </div>
                            {pctOfPortfolio !== undefined && pctOfPortfolio > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                    {pctOfPortfolio.toFixed(1)}% of portfolio
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </motion.div>
    );
}

function normalizeAddress(addr: string): string {
    try {
        return Address.parse(addr).toRawString();
    } catch {
        return addr;
    }
}
