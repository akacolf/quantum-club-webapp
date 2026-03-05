"use client";

import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenImageFill } from "@/components/ui/token-image";
import { toast } from "sonner";
import type { SpotToken } from "@/types/spot-trading";

interface SpotTokenDetailProps {
    token: SpotToken;
    detail?: {
        holders: number;
        totalSupply: string;
        decimals: number;
        description?: string;
        mintable?: boolean;
        verification?: string;
    };
    market?: {
        volume24HUsd?: string;
        liquidityUsd?: string;
        priceChangeH24?: number;
        priceChangeW7d?: number;
        priceChangeM30d?: number;
        marketCapUsd?: string;
        fdvUsd?: string;
        poolName?: string;
    } | null;
    dyor?: {
        priceUsd?: number;
        priceTon?: number;
        holdersCount?: number;
        marketCapUsd?: number;
        fdmcUsd?: number;
        liquidityUsd?: number;
        trustScore?: number;
        priceChange24h?: number;
        volume24hUsd?: number;
        traders24h?: number;
        description?: string;
    } | null;
    priceTon?: number;
    tonPrice: number;
    isLoadingDetail: boolean;
    isLoadingMarket: boolean;
}

export default function SpotTokenDetail({ token, detail, market, dyor, priceTon, tonPrice, isLoadingDetail, isLoadingMarket }: SpotTokenDetailProps) {
    const priceUsd = token.priceUsd || dyor?.priceUsd || (priceTon && tonPrice ? priceTon * tonPrice : undefined);
    const shortAddr = `${token.contractAddress.slice(0, 6)}...${token.contractAddress.slice(-4)}`;
    const priceChange = dyor?.priceChange24h
        ?? market?.priceChangeH24
        ?? token.priceChange24h;
    const isPositive = (priceChange ?? 0) >= 0;

    const priceChange7d = market?.priceChangeW7d;
    const priceChange30d = market?.priceChangeM30d;

    const copyAddress = () => {
        navigator.clipboard.writeText(token.contractAddress);
        toast.success("Address copied");
    };

    // Compute market cap: prefer DYOR, then GeckoTerminal, then price × supply
    const marketCap = dyor?.marketCapUsd
        ?? (market?.marketCapUsd ? parseFloat(market.marketCapUsd) : undefined)
        ?? (market?.fdvUsd ? parseFloat(market.fdvUsd) : undefined)
        ?? token.marketCapUsd
        ?? (() => {
            if (!priceUsd || !detail?.totalSupply) return undefined;
            const decimals = detail.decimals ?? 9;
            const supply = Number(BigInt(detail.totalSupply) / BigInt(10 ** decimals));
            return supply > 0 ? priceUsd * supply : undefined;
        })();

    const volume24h = dyor?.volume24hUsd
        ?? (market?.volume24HUsd ? parseFloat(market.volume24HUsd) : undefined)
        ?? token.volume24h;
    const liquidity = dyor?.liquidityUsd
        ?? (market?.liquidityUsd ? parseFloat(market.liquidityUsd) : undefined);
    const holders = dyor?.holdersCount ?? detail?.holders;
    const trustScore = dyor?.trustScore;

    // Format total supply with decimals
    const formattedSupply = (() => {
        if (!detail?.totalSupply) return undefined;
        const decimals = detail.decimals ?? 9;
        const raw = BigInt(detail.totalSupply);
        const divisor = BigInt(10 ** decimals);
        const whole = raw / divisor;
        return formatCompactNumber(Number(whole));
    })();

    return (
        <div className="space-y-3">
            {/* Token Header */}
            <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-full overflow-hidden bg-[#222] ring-1 ring-white/10 flex-shrink-0">
                    {token.imageUrl ? (
                        <TokenImageFill src={token.imageUrl} alt={token.displayName} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary font-bold text-lg">
                            {token.symbol.slice(0, 2)}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold text-white truncate">{token.symbol}</h1>
                        {detail?.verification === "whitelist" && (
                            <Icon icon="solar:verified-check-bold" className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        )}
                        {trustScore !== undefined && trustScore >= 80 && (
                            <Badge className="bg-green-500/10 text-green-400 border-0 text-[9px] h-4">
                                {trustScore}/100
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{token.displayName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <button onClick={copyAddress} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-muted-foreground hover:text-white transition-colors">
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
                        <Badge className="bg-green-500/10 text-green-400 border-0 text-[9px] h-4">STON.fi</Badge>
                    </div>
                </div>
            </div>

            {/* Price + Key Stats */}
            <Card className="bg-white/5 border-white/5">
                <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Market cap</p>
                            {(isLoadingDetail || isLoadingMarket) && !marketCap ? (
                                <Skeleton className="h-8 w-24 mt-1" />
                            ) : (
                                <p className="text-2xl font-bold text-white">
                                    {marketCap ? formatCompactUsd(marketCap) : "--"}
                                </p>
                            )}
                        </div>
                        <div className="text-right space-y-1.5">
                            <StatRow label="Holders" value={holders ? holders.toLocaleString() : undefined} loading={isLoadingDetail && !dyor} />
                            <StatRow label="Volume 24h" value={volume24h ? formatCompactUsd(volume24h) : undefined} loading={isLoadingMarket && !dyor} />
                            <StatRow label="Liquidity" value={liquidity ? formatCompactUsd(liquidity) : undefined} loading={isLoadingMarket && !dyor} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Price row */}
            <div className="flex items-center gap-3 px-1">
                <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Price</p>
                    <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-white">
                            {priceUsd !== undefined && priceUsd > 0 ? formatUsdPrice(priceUsd) : "--"}
                        </p>
                        {priceChange !== undefined && (
                            <span className={`text-xs font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                                {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
                            </span>
                        )}
                    </div>
                </div>
                {priceTon !== undefined && priceTon > 0 && (
                    <div className="text-right">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Price (TON)</p>
                        <p className="text-base font-semibold text-white">{formatTonPrice(priceTon)}</p>
                    </div>
                )}
            </div>

            {/* Price changes + Token info */}
            <div className="flex gap-2 px-1">
                {/* Price changes over time */}
                {isLoadingMarket ? (
                    <div className="flex gap-3">
                        <div>
                            <p className="text-[10px] text-muted-foreground mb-0.5">7d</p>
                            <Skeleton className="h-4 w-12" />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground mb-0.5">30d</p>
                            <Skeleton className="h-4 w-12" />
                        </div>
                    </div>
                ) : (priceChange7d !== undefined || priceChange30d !== undefined) ? (
                    <div className="flex gap-3">
                        {priceChange7d !== undefined && (
                            <div>
                                <p className="text-[10px] text-muted-foreground mb-0.5">7d</p>
                                <ChangeIndicator value={priceChange7d} />
                            </div>
                        )}
                        {priceChange30d !== undefined && (
                            <div>
                                <p className="text-[10px] text-muted-foreground mb-0.5">30d</p>
                                <ChangeIndicator value={priceChange30d} />
                            </div>
                        )}
                    </div>
                ) : null}

                {/* Supply + Mintable */}
                <div className="flex gap-3 ml-auto">
                    {isLoadingDetail ? (
                        <div className="text-right">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Supply</p>
                            <Skeleton className="h-4 w-16 ml-auto" />
                        </div>
                    ) : formattedSupply ? (
                        <div className="text-right">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Supply</p>
                            <p className="text-xs font-semibold text-white">{formattedSupply}</p>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Description */}
            {isLoadingDetail ? (
                <Card className="bg-white/5 border-white/5">
                    <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">About</p>
                        <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-full" />
                            <Skeleton className="h-3.5 w-4/5" />
                        </div>
                    </CardContent>
                </Card>
            ) : (dyor?.description || detail?.description) ? (
                <Card className="bg-white/5 border-white/5">
                    <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">About</p>
                        <p className="text-sm text-white/80 line-clamp-3">{dyor?.description || detail?.description}</p>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}

function ChangeIndicator({ value }: { value: number }) {
    const positive = value >= 0;
    return (
        <span className={`text-xs font-semibold ${positive ? "text-green-400" : "text-red-400"}`}>
            {positive ? "+" : ""}{value.toFixed(2)}%
        </span>
    );
}

function StatRow({ label, value, loading }: { label: string; value?: string; loading: boolean }) {
    return (
        <div className="flex items-center justify-end gap-2">
            <span className="text-[10px] text-muted-foreground">{label}</span>
            {loading ? (
                <Skeleton className="h-4 w-16" />
            ) : (
                <span className="text-sm font-semibold text-white">{value || "--"}</span>
            )}
        </div>
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
        const subscripts = "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089";
        const sub = String(zeroCount).split("").map(d => subscripts[parseInt(d)]).join("");
        return `$0.0${sub}${significant}`;
    }
    return `$${price.toFixed(10)}`;
}

function formatTonPrice(price: number): string {
    if (price >= 1) return `${price.toFixed(2)} TON`;
    if (price >= 0.001) return `${price.toFixed(4)} TON`;
    return `${price.toFixed(6)} TON`;
}

function formatCompactUsd(value: number): string {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
}

function formatCompactNumber(value: number): string {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toLocaleString();
}
