"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icon } from "@iconify/react";
import { dbfs } from "@/app/(firebase)/client";
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { useWallet } from "@/app/wallet/WalletContext";
import { formatCompactNumber } from "@/lib/bonding-curve";

interface Trade {
    id: string;
    type: "buy" | "sell";
    walletAddress: string;
    amount: string;
    totalTon: string;
    timestamp: Date;
}

interface LiveTradesProps {
    tokenId: string;
    tokenSymbol: string;
}

export default function LiveTrades({ tokenId, tokenSymbol }: LiveTradesProps) {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { tonPrice } = useWallet();

    useEffect(() => {
        if (!tokenId) return;

        const tradesRef = collection(dbfs, `tokens/${tokenId}/trades`);
        const q = query(tradesRef, orderBy("timestamp", "desc"), limit(20));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tradesData = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: data.type as "buy" | "sell",
                    walletAddress: data.walletAddress || "",
                    amount: data.amount || "0",
                    totalTon: data.totalTon || "0",
                    timestamp: data.timestamp instanceof Timestamp
                        ? data.timestamp.toDate()
                        : new Date(),
                };
            });
            setTrades(tradesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching trades:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [tokenId]);

    const formatTimeAgo = (date: Date) => {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return "just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const truncateAddress = (address: string) => {
        if (!address) return "Unknown";
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    if (isLoading) {
        return (
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Icon icon="solar:transfer-horizontal-bold" className="w-5 h-5 text-primary animate-pulse" />
                        <h3 className="font-semibold text-white">Live Trades</h3>
                    </div>
                    <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                        Loading trades...
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (trades.length === 0) {
        return (
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Icon icon="solar:transfer-horizontal-bold" className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-white">Live Trades</h3>
                    </div>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Icon icon="solar:inbox-bold" className="w-8 h-8 text-muted-foreground/50 mb-2" />
                        <p className="text-muted-foreground text-sm">No trades yet</p>
                        <p className="text-muted-foreground/60 text-xs">Be the first to trade!</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Icon icon="solar:transfer-horizontal-bold" className="w-5 h-5 text-primary" />
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        </div>
                        <h3 className="font-semibold text-white">Live Trades</h3>
                    </div>
                    <Badge variant="secondary" className="bg-white/5 text-xs">
                        {trades.length} trades
                    </Badge>
                </div>

                <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                        {trades.map((trade, index) => {
                            const isBuy = trade.type === "buy";
                            const tokenAmount = formatCompactNumber(Number(trade.amount) / 1e9, 2);
                            const tonValue = parseFloat(trade.totalTon);
                            const usdValue = tonValue * (tonPrice || 5);
                            const tonAmount = formatCompactNumber(tonValue, 2);
                            const usdAmount = formatCompactNumber(usdValue, 0);

                            return (
                                <div
                                    key={trade.id}
                                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                                    style={{
                                        animation: index === 0 ? "fadeIn 0.3s ease-out" : undefined,
                                    }}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBuy
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-red-500/20 text-red-400"
                                                }`}
                                        >
                                            <Icon
                                                icon={isBuy ? "solar:graph-up-bold" : "solar:graph-down-bold"}
                                                className="w-4 h-4"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-xs font-medium ${isBuy ? "text-green-400" : "text-red-400"}`}>
                                                    {isBuy ? "Buy" : "Sell"}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {truncateAddress(trade.walletAddress)}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                {formatTimeAgo(trade.timestamp)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xs font-medium text-white">
                                            {tokenAmount} {tokenSymbol}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {tonAmount} TON • ${usdAmount}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
