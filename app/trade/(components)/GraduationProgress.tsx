"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Token, DEFAULT_GRADUATION_THRESHOLD } from "@/types/trading";

interface GraduationProgressProps {
    token: Token;
    tonPriceUsd: number;
}

export default function GraduationProgress({ token, tonPriceUsd }: GraduationProgressProps) {
    // Calculate market cap in USD
    const marketCapTon = Number(token.marketCap || "0") / 1e9;
    const marketCapUsd = marketCapTon * tonPriceUsd;
    const threshold = parseFloat(token.graduationThreshold || DEFAULT_GRADUATION_THRESHOLD);
    const progress = Math.min(100, (marketCapUsd / threshold) * 100);
    const remaining = Math.max(0, threshold - marketCapUsd);

    // Status check
    if (token.status === "graduated") {
        return null; // Don't show for graduated tokens
    }

    return (
        <Card className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-500/20 overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Icon icon="solar:cup-star-bold" className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">Graduation Progress</h3>
                            <p className="text-[10px] text-muted-foreground">
                                {progress >= 100 ? "Ready to graduate!" : `$${remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })} to go`}
                            </p>
                        </div>
                    </div>
                    <Badge
                        className={`text-[10px] ${progress >= 100
                            ? "bg-green-500/20 text-green-400"
                            : progress >= 75
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-white/10 text-muted-foreground"
                            }`}
                    >
                        {progress.toFixed(1)}%
                    </Badge>
                </div>

                {/* Progress Bar */}
                <div className="relative">
                    <Progress
                        value={progress}
                        className="h-3 bg-white/5"
                    />
                    {/* Milestone markers */}
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

                {/* Stats */}
                <div className="flex justify-between mt-3 text-[11px]">
                    <div>
                        <span className="text-muted-foreground">Current: </span>
                        <span className="text-white font-medium">
                            {marketCapTon.toLocaleString(undefined, { maximumFractionDigits: 0 })} TON
                        </span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Target: </span>
                        <span className="text-amber-400 font-medium">
                            {(threshold / tonPriceUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })} TON
                        </span>
                    </div>
                </div>

                {/* Graduation info */}
                {progress >= 100 && (
                    <div className="mt-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:verified-check-bold" className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-green-400 font-medium">
                                This token is ready to graduate to STON.fi DEX!
                            </span>
                        </div>
                    </div>
                )}

                {progress < 100 && progress >= 75 && (
                    <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:fire-bold" className="w-4 h-4 text-amber-400" />
                            <span className="text-xs text-amber-400 font-medium">
                                Almost there! Help this token reach DEX listing.
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
