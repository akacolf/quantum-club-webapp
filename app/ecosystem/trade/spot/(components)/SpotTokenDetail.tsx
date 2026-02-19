"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenImageFill } from "@/components/ui/token-image";
import { toast } from "sonner";
import type { SpotToken } from "@/types/spot-trading";

interface SpotTokenDetailProps {
    token: SpotToken;
    detail?: {
        holders: number;
        totalSupply: string;
        description?: string;
    };
    priceTon?: number;
    tonPrice: number;
    isLoadingDetail: boolean;
}

export default function SpotTokenDetail({ token, detail, priceTon, tonPrice, isLoadingDetail }: SpotTokenDetailProps) {
    const priceUsd = priceTon && tonPrice ? priceTon * tonPrice : undefined;
    const shortAddr = `${token.contractAddress.slice(0, 6)}...${token.contractAddress.slice(-4)}`;

    const copyAddress = () => {
        navigator.clipboard.writeText(token.contractAddress);
        toast.success("Address copied");
    };

    return (
        <div className="space-y-3">
            {/* Token Header */}
            <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#222] ring-1 ring-white/10 flex-shrink-0">
                    {token.imageUrl ? (
                        <TokenImageFill src={token.imageUrl} alt={token.displayName} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary font-bold text-lg">
                            {token.symbol.slice(0, 2)}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-white truncate">{token.displayName}</h1>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-black bg-white/90 px-1.5 py-px rounded-[4px]">
                            ${token.symbol}
                        </span>
                        <button onClick={copyAddress} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-white transition-colors">
                            {shortAddr}
                            <Icon icon="solar:copy-linear" className="w-3 h-3" />
                        </button>
                        <a
                            href={`https://tonviewer.com/${token.contractAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-white transition-colors"
                        >
                            <Icon icon="solar:link-round-bold" className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>
            </div>

            {/* Price Card */}
            {priceTon !== undefined && priceTon > 0 ? (
                <Card className="bg-white/5 border-white/5">
                    <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold text-white">
                                {formatPrice(priceTon)} TON
                            </span>
                            {priceUsd !== undefined && (
                                <span className="text-sm text-muted-foreground">
                                    ≈ ${priceUsd < 0.01 ? priceUsd.toExponential(2) : priceUsd.toFixed(4)}
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
                <StatCard
                    label="Holders"
                    value={detail ? detail.holders.toLocaleString() : undefined}
                    icon="solar:users-group-rounded-bold"
                    isLoading={isLoadingDetail}
                />
                <StatCard
                    label="Total Supply"
                    value={detail ? formatSupply(detail.totalSupply, token.decimals) : undefined}
                    icon="solar:coins-bold"
                    isLoading={isLoadingDetail}
                />
            </div>

            {/* Description */}
            {detail?.description && (
                <Card className="bg-white/5 border-white/5">
                    <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">About</p>
                        <p className="text-sm text-white/80 line-clamp-3">{detail.description}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function StatCard({ label, value, icon, isLoading }: { label: string; value?: string; icon: string; isLoading: boolean }) {
    return (
        <Card className="bg-white/5 border-white/5">
            <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                    <Icon icon={icon} className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
                </div>
                {isLoading ? (
                    <Skeleton className="h-5 w-20" />
                ) : (
                    <p className="text-sm font-semibold text-white">{value || "--"}</p>
                )}
            </CardContent>
        </Card>
    );
}

function formatPrice(price: number): string {
    if (price < 0.00001) return price.toExponential(2);
    if (price < 0.001) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
}

function formatSupply(supply: string, decimals: number): string {
    try {
        const num = Number(BigInt(supply)) / 10 ** decimals;
        if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;
        if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
        return num.toLocaleString();
    } catch {
        return supply;
    }
}
