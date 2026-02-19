"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TokenImageFill } from "@/components/ui/token-image";
import type { SpotToken } from "@/types/spot-trading";

interface SpotTokenCardProps {
    token: SpotToken;
    index: number;
    userBalance?: string;
}

export default function SpotTokenCard({ token, index, userBalance }: SpotTokenCardProps) {
    const priceUsd = token.priceUsd;
    const change = token.priceChange24h;
    const mcap = token.marketCapUsd;
    const isPositive = (change ?? 0) >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index * 0.03, 0.3) }}
        >
            <Link href={`/ecosystem/trade/spot/${encodeURIComponent(token.contractAddress)}`} prefetch={true}>
                <Card className="bg-white/5 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer overflow-hidden group relative shadow-md hover:shadow-lg hover:bg-white/10">
                    <CardContent className="p-3">
                        <div className="flex gap-3 items-center">
                            {/* Token Image */}
                            <div className="relative w-11 h-11 rounded-full overflow-hidden bg-[#222] shadow-inner ring-1 ring-white/5 group-hover:ring-white/10 transition-all flex-shrink-0">
                                {token.imageUrl ? (
                                    <TokenImageFill
                                        src={token.imageUrl}
                                        alt={token.displayName}
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-primary font-bold text-sm bg-gradient-to-br from-white/5 to-white/[0.02]">
                                        {token.symbol.slice(0, 2)}
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="font-bold text-white text-sm leading-tight truncate">
                                        {token.symbol}
                                    </h3>
                                    {userBalance && (
                                        <Badge className="bg-primary/20 text-primary text-[9px] px-1.5 py-0 h-4 border-0 flex-shrink-0">
                                            Held
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {mcap ? `MCap: ${formatCompactUsd(mcap)}` : token.displayName}
                                </span>
                            </div>

                            {/* Price + Change */}
                            <div className="text-right flex-shrink-0">
                                {priceUsd !== undefined && priceUsd > 0 ? (
                                    <div className="font-semibold text-white text-sm tracking-tight">
                                        {formatUsdPrice(priceUsd)}
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground">--</div>
                                )}
                                {change !== undefined && (
                                    <div className={`text-[11px] font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                                        {isPositive ? "+" : ""}{change.toFixed(2)}%
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </motion.div>
    );
}

function formatUsdPrice(price: number): string {
    if (price >= 1) return `$${price.toFixed(price >= 100 ? 2 : 4)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    if (price >= 0.0001) return `$${price.toFixed(6)}`;
    // Subscript notation for very small prices
    const str = price.toFixed(12);
    const match = str.match(/^0\.(0+)(\d+)/);
    if (match) {
        const zeroCount = match[1].length;
        const significant = match[2].slice(0, 5);
        const subscripts = "₀₁₂₃₄₅₆₇₈₉";
        const sub = String(zeroCount).split("").map(d => subscripts[parseInt(d)]).join("");
        return `$0.0${sub}${significant}`;
    }
    return `$${price.toFixed(10)}`;
}

function formatCompactUsd(value: number): string {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
}
