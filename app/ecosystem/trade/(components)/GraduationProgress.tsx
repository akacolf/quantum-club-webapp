"use client";

import { Icon } from "@iconify/react";
import { Progress } from "@/components/ui/progress";
import { Token, DEFAULT_GRADUATION_THRESHOLD_TON } from "@/types/trading";

interface GraduationProgressProps {
    token: Token;
    tonPriceUsd?: number; // Now optional, kept for backward compatibility
}

export default function GraduationProgress({ token, tonPriceUsd }: GraduationProgressProps) {
    // Use tonReserve for accurate on-chain progress (tonReserve IS the curve reserve in nanoTON)
    // Fall back to marketCap for backwards compatibility with cached data
    const tonReserveTon = Number(token.tonReserve || token.marketCap || "0") / 1e9;

    // Graduation threshold is stored in nanoTON, convert to TON
    // If value is very large (> 1e9), it's in nanoTON format - divide by 1e9
    // Otherwise it's already in TON format
    const rawThreshold = parseFloat(token.graduationThreshold || DEFAULT_GRADUATION_THRESHOLD_TON);
    let thresholdTon = rawThreshold > 1e9
        ? rawThreshold / 1e9
        : rawThreshold;
    
    // Override old 100 TON threshold to new 2000 TON standard
    if (thresholdTon === 100) {
        thresholdTon = 2000;
    }

    const progress = Math.min(100, (tonReserveTon / thresholdTon) * 100);
    // Status check
    if (token.isGraduated) {
        return null; // Don't show for graduated tokens
    }

    return (
        <section className="w-full space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon icon="solar:cup-star-bold" className="w-4 h-4 text-amber-400" />
                    <div>
                        <h3 className="text-sm font-semibold text-white">Graduation progress</h3>
                        <p className="text-[10px] text-muted-foreground">
                            {progress >= 100 ? "Ready to graduate" : "Progress toward DEX graduation"}
                        </p>
                    </div>
                </div>
                <span className={progress >= 100 ? "text-xs font-semibold text-green-400" : "text-xs font-semibold text-white"}>
                    {progress.toFixed(1)}%
                </span>
            </div>

            <div className="relative">
                <Progress
                    value={progress}
                    className="h-3 bg-white/5"
                />
                <div className="absolute inset-0 flex justify-between items-center px-1">
                    {[25, 50, 75, 100].map((milestone) => (
                        <div
                            key={milestone}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${progress >= milestone
                                ? "bg-amber-400"
                                : "bg-white/20"
                                }`}
                        />
                    ))}
                </div>
            </div>

            <div className="flex justify-between text-[11px]">
                <div>
                    <span className="text-muted-foreground">Current: </span>
                    <span className="text-white font-medium">
                        {tonReserveTon.toLocaleString(undefined, { maximumFractionDigits: 0 })} TON
                    </span>
                    {tonPriceUsd && tonPriceUsd > 0 && (
                        <span className="text-muted-foreground ml-1">
                            (~${(tonReserveTon * tonPriceUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })})
                        </span>
                    )}
                </div>
                <div>
                    <span className="text-muted-foreground">Target: </span>
                    <span className="text-white font-medium">
                        {thresholdTon.toLocaleString(undefined, { maximumFractionDigits: 0 })} TON
                    </span>
                </div>
            </div>
        </section>
    );
}
