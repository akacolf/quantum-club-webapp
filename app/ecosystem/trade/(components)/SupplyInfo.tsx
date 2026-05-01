"use client";

import { Icon } from "@iconify/react";
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

    // Calculate percentages
    const circulatingPercent = Number((circulatingSupply * BigInt(10000)) / maxSupply) / 100;

    // Format values
    const circulatingFormatted = formatCompactNumber(Number(circulatingSupply) / 1e9, 2);

    return (
        <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden px-4 py-2">
            <div className="p-0">
                <div className="flex items-center gap-2 mb-4">
                    <Icon icon="solar:pie-chart-2-bold" className="w-4 h-4 text-neutral-300" />
                    <h3 className="font-semibold text-white">Supply info</h3>
                </div>

                {/* Supply Progress Bar */}
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Circulating supply</span>
                        <span className="text-white font-medium">{circulatingPercent.toFixed(2)}%</span>
                    </div>
                    <Progress 
                        value={circulatingPercent} 
                        className="h-2 bg-white/5"
                    />
                </div>

                {/* Supply Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="py-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon icon="solar:dollar-minimalistic-bold" className="w-4 h-4 text-neutral-300" />
                            <p className="text-xs text-muted-foreground">Circulating</p>
                        </div>
                        <p className="text-sm font-semibold text-white">{circulatingFormatted}</p>
                        <p className="text-[10px] text-muted-foreground">{token.symbol}</p>
                    </div>
                    <div className="py-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon icon="solar:infinity-bold" className="w-4 h-4 text-neutral-300" />
                            <p className="text-xs text-muted-foreground">Max supply</p>
                        </div>
                        <p className="text-sm font-semibold text-white">{MAX_SUPPLY_FORMATTED}</p>
                        <p className="text-[10px] text-muted-foreground">{token.symbol}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
