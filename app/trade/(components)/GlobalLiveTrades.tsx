"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import { dbfs } from "@/app/(firebase)/client";
import { collectionGroup, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { useWallet } from "@/app/wallet/WalletContext";
import { useRouter } from "next/navigation";

interface GlobalTrade {
    id: string;
    tokenId: string;
    tokenSymbol?: string;
    type: "buy" | "sell";
    walletAddress: string;
    amount: string;
    totalTon: string;
    timestamp: Date;
}

export default function GlobalLiveTrades() {
    const [trades, setTrades] = useState<GlobalTrade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { tonPrice } = useWallet();
    const router = useRouter();

    useEffect(() => {
        // Listen to trades across all tokens using collectionGroup
        const tradesQuery = query(
            collectionGroup(dbfs, "trades"),
            orderBy("timestamp", "desc"),
            limit(10)
        );

        const unsubscribe = onSnapshot(tradesQuery, (snapshot) => {
            const tradesData = snapshot.docs.map((doc) => {
                const data = doc.data();
                // Extract tokenId from the document path (tokens/{tokenId}/trades/{tradeId})
                const pathParts = doc.ref.path.split("/");
                const tokenId = pathParts[1];

                return {
                    id: doc.id,
                    tokenId,
                    tokenSymbol: data.tokenSymbol,
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
            console.error("Error fetching global trades:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const formatTimeAgo = (date: Date) => {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return "now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    };

    const truncateAddress = (address: string) => {
        if (!address) return "...";
        return `${address.slice(0, 4)}...${address.slice(-3)}`;
    };

    if (isLoading) {
        return (
            <Card className="bg-white/5 border-white/10 mb-4">
                <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Icon icon="solar:transfer-horizontal-bold" className="w-4 h-4 text-primary animate-pulse" />
                        </div>
                        <span className="text-xs text-muted-foreground">Loading activity...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (trades.length === 0) {
        return null; // Don't show if no trades
    }

    return (
        <Card className="bg-white/5 border-white/10 mb-4 overflow-hidden">
            <CardContent className="p-0">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                    <div className="relative">
                        <Icon icon="solar:transfer-horizontal-bold" className="w-4 h-4 text-primary" />
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <span className="text-xs font-semibold text-white">Live Activity</span>
                    <Badge variant="secondary" className="bg-white/5 text-[10px] ml-auto">
                        {trades.length}
                    </Badge>
                </div>

                <div className="divide-y divide-white/5">
                    {trades.slice(0, 5).map((trade, index) => {
                        const isBuy = trade.type === "buy";
                        const tonAmount = parseFloat(trade.totalTon).toFixed(2);
                        const usdAmount = (parseFloat(trade.totalTon) * (tonPrice || 5)).toFixed(0);

                        return (
                            <div
                                key={trade.id}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] cursor-pointer transition-colors"
                                onClick={() => router.push(`/trade/${trade.tokenId}`)}
                                style={{
                                    animation: index === 0 ? "fadeIn 0.3s ease-out" : undefined,
                                }}
                            >
                                <div
                                    className={`w-5 h-5 rounded flex items-center justify-center ${isBuy
                                        ? "bg-green-500/20 text-green-400"
                                        : "bg-red-500/20 text-red-400"
                                        }`}
                                >
                                    <Icon
                                        icon={isBuy ? "solar:arrow-up-bold" : "solar:arrow-down-bold"}
                                        className="w-3 h-3"
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className={`text-[10px] font-medium ${isBuy ? "text-green-400" : "text-red-400"}`}>
                                            {isBuy ? "BUY" : "SELL"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground truncate">
                                            {truncateAddress(trade.walletAddress)}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="text-[11px] font-medium text-white">
                                        {tonAmount} TON
                                    </p>
                                    <p className="text-[9px] text-muted-foreground">
                                        ${usdAmount} • {formatTimeAgo(trade.timestamp)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
