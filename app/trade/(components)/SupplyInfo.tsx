"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Token, MAX_SUPPLY_FORMATTED } from "@/types/trading";
import { formatCompactNumber } from "@/lib/jetton-operations";

interface SupplyInfoProps {
    token: Token;
}

export default function SupplyInfo({ token }: SupplyInfoProps) {
    // Parse supplies
    const maxSupply = BigInt("1000000000000000000"); // 1B * 10^9
    const circulatingSupply = BigInt(token.totalSupply || "0");
    const tonReserve = BigInt(token.tonReserve || token.marketCap || "0");

    // Calculate percentages
    const circulatingPercent = Number((circulatingSupply * BigInt(10000)) / maxSupply) / 100;
    const availablePercent = 100 - circulatingPercent;

    // Format values
    const circulatingFormatted = formatCompactNumber(Number(circulatingSupply) / 1e9, 2);
    const reserveFormatted = formatCompactNumber(Number(tonReserve) / 1e9, 2);

    return (
        <Card className="bg-white/5 border-white/10 overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <Icon icon="solar:pie-chart-2-bold" className="w-4 h-4 text-cyan-400" />
                    </div>
                    <h3 className="font-semibold text-white">Supply Info</h3>
                </div>

                {/* Supply Progress Bar */}
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Circulating Supply</span>
                        <span className="text-cyan-400 font-medium">{circulatingPercent.toFixed(2)}%</span>
                    </div>
                    <Progress 
                        value={circulatingPercent} 
                        className="h-2 bg-white/5"
                    />
                </div>

                {/* Supply Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon icon="solar:dollar-minimalistic-bold" className="w-4 h-4 text-cyan-400" />
                            <p className="text-xs text-muted-foreground">Circulating</p>
                        </div>
                        <p className="text-sm font-semibold text-white">{circulatingFormatted}</p>
                        <p className="text-[10px] text-muted-foreground">{token.symbol}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon icon="solar:infinity-bold" className="w-4 h-4 text-purple-400" />
                            <p className="text-xs text-muted-foreground">Max Supply</p>
                        </div>
                        <p className="text-sm font-semibold text-white">{MAX_SUPPLY_FORMATTED}</p>
                        <p className="text-[10px] text-muted-foreground">{token.symbol}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon icon="solar:graph-new-up-bold" className="w-4 h-4 text-green-400" />
                            <p className="text-xs text-muted-foreground">Available to Mint</p>
                        </div>
                        <p className="text-sm font-semibold text-white">{availablePercent.toFixed(2)}%</p>
                        <p className="text-[10px] text-muted-foreground">via bonding curve</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon icon="solar:safe-circle-bold" className="w-4 h-4 text-amber-400" />
                            <p className="text-xs text-muted-foreground">TON Reserve</p>
                        </div>
                        <p className="text-sm font-semibold text-white">{reserveFormatted} TON</p>
                        <p className="text-[10px] text-muted-foreground">locked in curve</p>
                    </div>
                </div>

                {/* Info Footer */}
                <div className="mt-4 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                    <div className="flex items-start gap-2">
                        <Icon icon="solar:info-circle-bold" className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-cyan-300/80">
                            Tokens are minted when bought and burned when sold. 
                            The supply dynamically adjusts based on trading activity.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
