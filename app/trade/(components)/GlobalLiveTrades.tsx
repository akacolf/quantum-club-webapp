"use client";

/**
 * Global Live Trades - On-Chain Version
 * Fetches trade data from TONAPI across multiple tokens
 */

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/app/wallet/WalletContext";
import { useRouter } from "next/navigation";
import { useTrading } from "@/app/(contexts)/TradingContext";
import { motion, AnimatePresence } from "framer-motion";
import { formatCompactNumber } from "@/lib/jetton-operations";
import { Address } from "@ton/core";
import { useGlobalTrades } from "@/app/(hooks)/queries/use-trades";

interface GlobalTrade {
    id: string;
    tokenId: string;
    tokenSymbol: string;
    tokenName: string;
    jettonAddress: string;
    type: "buy" | "sell";
    walletAddress: string;
    tokenAmount: number;
    tonAmount: number;
    timestamp: Date;
    hash: string;
}

export default function GlobalLiveTrades() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { tonPrice, isTestnet } = useWallet();
    const { trendingTokens, newTokens } = useTrading();
    const router = useRouter();

    const allTokens = useMemo(() => [...trendingTokens, ...newTokens], [trendingTokens, newTokens]);
    const { data: trades = [], isFetching: isLoading } = useGlobalTrades(allTokens, isTestnet, 20000);

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

    // Convert raw address (0:...) to friendly format (UQ.../EQ...)
    const toFriendlyAddress = (address: string): string => {
        if (!address) return "...";
        try {
            if (address.startsWith("UQ") || address.startsWith("EQ") || address.startsWith("kQ")) {
                return address;
            }
            const parsedAddress = Address.parse(address);
            return parsedAddress.toString({ bounceable: false });
        } catch {
            return address;
        }
    };

    const truncateAddress = (address: string) => {
        const friendly = toFriendlyAddress(address);
        return `${friendly.slice(0, 4)}...${friendly.slice(-3)}`;
    };

    if (isLoading) {
        return (
            <Card className="bg-white/5 border-white/10 mb-4">
                <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                        <Icon icon="solar:pulse-2-bold" className="w-4 h-4 text-primary animate-pulse" />
                        <span className="text-xs text-muted-foreground">Loading on-chain activity...</span>
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-[8px] ml-auto">
                            ON-CHAIN
                        </Badge>
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
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-[8px] ml-auto">
                            ON-CHAIN
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const currentTrade = trades[currentIndex];
    const isBuy = currentTrade.type === "buy";
    const tonValue = currentTrade.tonAmount;
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
                                    <span className="text-primary font-medium">${currentTrade.tokenSymbol}</span>
                                    <span>•</span>
                                    <span>{truncateAddress(currentTrade.walletAddress)}</span>
                                    <span>•</span>
                                    <span>{formatTimeAgo(currentTrade.timestamp)}</span>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* ON-CHAIN badge and pagination */}
                    <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-[8px]">
                            ON-CHAIN
                        </Badge>
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
                </div>
            </CardContent>
        </Card>
    );
}
