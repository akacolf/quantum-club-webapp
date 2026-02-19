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
                            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[#222] shadow-inner ring-1 ring-white/5 group-hover:ring-white/10 transition-all flex-shrink-0">
                                {token.imageUrl ? (
                                    <TokenImageFill
                                        src={token.imageUrl}
                                        alt={token.displayName}
                                        className="object-cover transform group-hover:scale-105 transition-transform duration-700"
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
                                    <h3 className="font-bold text-white text-sm leading-tight truncate group-hover:text-primary transition-colors duration-300">
                                        {token.displayName}
                                    </h3>
                                    {userBalance && (
                                        <Badge className="bg-primary/20 text-primary text-[9px] px-1.5 py-0 h-4 border-0 flex-shrink-0">
                                            Held
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-[10px] font-bold text-black bg-white/90 px-1.5 py-px rounded-[4px] tracking-tight">
                                    ${token.symbol}
                                </span>
                            </div>

                            {/* Price */}
                            <div className="text-right flex-shrink-0">
                                {token.priceTon !== undefined && token.priceTon > 0 ? (
                                    <div className="font-medium text-white text-sm tracking-tight">
                                        {formatTokenPrice(token.priceTon)} TON
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground">--</div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </motion.div>
    );
}

function formatTokenPrice(price: number): string {
    if (price < 0.00001) return price.toExponential(2);
    if (price < 0.001) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
}
