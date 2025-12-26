"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { dbfs } from "@/app/(firebase)/client";
import { collectionGroup, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { useWallet } from "@/app/wallet/WalletContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { formatCompactNumber } from "@/lib/bonding-curve";

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
    const [currentIndex, setCurrentIndex] = useState(0);
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
            setCurrentIndex(0); // Reset to latest when new trade comes in
        }, (error) => {
            console.error("Error fetching global trades:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Auto-rotate through trades every 4 seconds
    useEffect(() => {
        if (trades.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % Math.min(trades.length, 5));
        }, 4000);

        return () => clearInterval(interval);
    }, [trades.length]);

    const formatTimeAgo = (date: Date) => {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return "now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
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
                        <Icon icon="solar:pulse-2-bold" className="w-4 h-4 text-primary animate-pulse" />
                        <span className="text-xs text-muted-foreground">Loading activity...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (trades.length === 0) {
        return (
            <Card className="bg-white/5 border-white/10 mb-4">
                <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                        <Icon icon="solar:pulse-2-bold" className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">No trades yet</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const currentTrade = trades[currentIndex];
    const isBuy = currentTrade.type === "buy";
    const tonValue = parseFloat(currentTrade.totalTon);
    const usdValue = tonValue * (tonPrice || 5);
    const tonAmount = formatCompactNumber(tonValue, 1);
    const usdAmount = formatCompactNumber(usdValue, 0);

    return (
        <Card
            className="bg-white/5 border-white/10 mb-4 overflow-hidden cursor-pointer hover:bg-white/[0.07] transition-colors"
            onClick={() => router.push(`/trade/${currentTrade.tokenId}`)}
        >
            <CardContent className="p-3">
                <div className="flex items-center gap-3">
                    {/* Live indicator */}
                    <div className="relative">
                        <Icon icon="solar:pulse-2-bold" className="w-5 h-5 text-primary" />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>

                    {/* Trade info - animates on change */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentTrade.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex items-center gap-2"
                        >
                            <div
                                className={`w-6 h-6 rounded-md flex items-center justify-center ${isBuy ? "bg-green-500/20" : "bg-red-500/20"
                                    }`}
                            >
                                <Icon
                                    icon={isBuy ? "solar:bag-smile-bold" : "solar:hand-money-bold"}
                                    className={`w-3.5 h-3.5 ${isBuy ? "text-green-400" : "text-red-400"}`}
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-xs font-semibold ${isBuy ? "text-green-400" : "text-red-400"}`}>
                                        {isBuy ? "BUY" : "SELL"}
                                    </span>
                                    <span className="text-xs text-white font-medium">
                                        {tonAmount} TON
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        (${usdAmount})
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <span>{truncateAddress(currentTrade.walletAddress)}</span>
                                    <span>•</span>
                                    <span>{formatTimeAgo(currentTrade.timestamp)}</span>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Pagination dots */}
                    {trades.length > 1 && (
                        <div className="flex gap-1">
                            {trades.slice(0, 5).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentIndex(i);
                                    }}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex
                                        ? "bg-primary w-3"
                                        : "bg-white/20 hover:bg-white/40"
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
