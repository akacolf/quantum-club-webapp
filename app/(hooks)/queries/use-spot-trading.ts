"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSwappableAssets, createStonApiClient, fromUnits, TON_ADDRESS } from "@/lib/stonfi";
import { tonApiGet } from "@/lib/tonapi-client";
import type { SpotToken } from "@/types/spot-trading";

// ─── GeckoTerminal helpers ────────────────────────────────────────────

const GECKO_BASE = "https://api.geckoterminal.com/api/v2";

async function geckoFetch<T>(path: string): Promise<T | null> {
    try {
        const res = await fetch(`${GECKO_BASE}${path}`, {
            headers: { Accept: "application/json" },
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

interface GeckoTokenAttributes {
    name: string;
    symbol: string;
    address: string;
    price_usd: string | null;
    fdv_usd: string | null;
    market_cap_usd: string | null;
    total_reserve_in_usd: string | null;
    volume_usd: { h24: string | null };
    price_change_percentage: { h24: string | null };
}

interface GeckoPoolAttributes {
    address: string;
    name: string;
    base_token_price_usd: string | null;
    volume_usd: { h24: string | null };
    reserve_in_usd: string | null;
    price_change_percentage: { h24: string | null };
    market_cap_usd: string | null;
    fdv_usd: string | null;
}

interface GeckoOHLCV {
    ohlcv_list: [number, number, number, number, number, number][];
}

// ─── Token list hook ──────────────────────────────────────────────────

/**
 * Fetch swappable Jettons from STON.fi, enriched with GeckoTerminal market data.
 */
export function useSpotTokens() {
    return useQuery<SpotToken[]>({
        queryKey: ["spot-tokens"],
        queryFn: async () => {
            const assets = await fetchSwappableAssets();
            const jettons = assets.filter((a) => a.kind === "Jetton");

            // Batch fetch GeckoTerminal data for enrichment
            // GeckoTerminal supports multi-address token info (up to 30)
            const enriched: SpotToken[] = [];
            const BATCH = 30;
            for (let i = 0; i < jettons.length; i += BATCH) {
                const batch = jettons.slice(i, i + BATCH);
                const addresses = batch.map((j) => j.contractAddress).join(",");
                const gecko = await geckoFetch<{
                    data: { id: string; attributes: GeckoTokenAttributes }[];
                }>(`/networks/ton/tokens/multi/${encodeURIComponent(addresses)}`);

                // Build address → gecko data map
                const geckoMap = new Map<string, GeckoTokenAttributes>();
                if (gecko?.data) {
                    for (const item of gecko.data) {
                        geckoMap.set(item.attributes.address, item.attributes);
                    }
                }

                for (const a of batch) {
                    const g = geckoMap.get(a.contractAddress);
                    enriched.push({
                        ...a,
                        priceUsd: g?.price_usd ? parseFloat(g.price_usd) : (a.dexPriceUsd ? parseFloat(a.dexPriceUsd) : undefined),
                        volume24h: g?.volume_usd?.h24 ? parseFloat(g.volume_usd.h24) : 0,
                        marketCapUsd: g?.market_cap_usd ? parseFloat(g.market_cap_usd) : (g?.fdv_usd ? parseFloat(g.fdv_usd) : undefined),
                        priceChange24h: g?.price_change_percentage?.h24 ? parseFloat(g.price_change_percentage.h24) : undefined,
                    });
                }
            }

            // Sort by volume descending
            return enriched.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
        },
        staleTime: 30_000,
        gcTime: 60_000,
    });
}

// ─── Token detail hooks ──────────────────────────────────────────────

interface JettonDetailResponse {
    metadata?: {
        address?: string;
        name?: string;
        symbol?: string;
        decimals?: string;
        image?: string;
        description?: string;
    };
    total_supply?: string;
    holders_count?: number;
    mintable?: boolean;
    verification?: string;
}

/**
 * Fetch on-chain Jetton metadata + holders from TonAPI.
 */
export function useSpotTokenDetail(address: string | undefined) {
    return useQuery({
        queryKey: ["spot-token-detail", address],
        queryFn: async () => {
            if (!address) throw new Error("No address");
            const data = await tonApiGet<JettonDetailResponse>(
                `/v2/jettons/${encodeURIComponent(address)}`
            );
            return {
                holders: data.holders_count ?? 0,
                totalSupply: data.total_supply ?? "0",
                description: data.metadata?.description,
                mintable: data.mintable ?? false,
                verification: data.verification,
            };
        },
        enabled: !!address,
        staleTime: 15_000,
        gcTime: 30_000,
    });
}

/**
 * Fetch GeckoTerminal market data for a token (volume, liquidity, market cap, price change).
 */
export function useSpotTokenMarket(tokenAddress: string | undefined) {
    return useQuery({
        queryKey: ["spot-token-market", tokenAddress],
        queryFn: async () => {
            if (!tokenAddress) throw new Error("No address");

            // Get token's top pool on GeckoTerminal
            const poolsData = await geckoFetch<{
                data: { id: string; attributes: GeckoPoolAttributes }[];
            }>(`/networks/ton/tokens/${encodeURIComponent(tokenAddress)}/pools?page=1`);

            const topPool = poolsData?.data?.[0];
            if (!topPool) return null;

            return {
                poolAddress: topPool.attributes.address,
                volume24HUsd: topPool.attributes.volume_usd?.h24 || undefined,
                liquidityUsd: topPool.attributes.reserve_in_usd || undefined,
                priceChangeH24: topPool.attributes.price_change_percentage?.h24 || undefined,
                marketCapUsd: topPool.attributes.market_cap_usd || undefined,
                fdvUsd: topPool.attributes.fdv_usd || undefined,
                poolName: topPool.attributes.name,
            };
        },
        enabled: !!tokenAddress,
        staleTime: 15_000,
        gcTime: 30_000,
    });
}

// ─── OHLCV chart hook ────────────────────────────────────────────────

export type ChartTimeframe = "15m" | "1h" | "4h" | "1d";

const TIMEFRAME_CONFIG: Record<ChartTimeframe, { timeframe: string; aggregate: number; limit: number }> = {
    "15m": { timeframe: "minute", aggregate: 15, limit: 96 },   // ~24h of 15m candles
    "1h":  { timeframe: "hour",   aggregate: 1,  limit: 168 },  // 7 days of 1h candles
    "4h":  { timeframe: "hour",   aggregate: 4,  limit: 180 },  // 30 days of 4h candles
    "1d":  { timeframe: "day",    aggregate: 1,  limit: 90 },   // 90 days of daily candles
};

export interface OHLCVCandle {
    time: number; // Unix timestamp seconds
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

/**
 * Fetch OHLCV chart data from GeckoTerminal.
 * Requires a pool address (fetched via useSpotTokenMarket).
 */
export function useSpotTokenChart(poolAddress: string | undefined, timeframe: ChartTimeframe = "1h") {
    return useQuery<OHLCVCandle[]>({
        queryKey: ["spot-token-chart", poolAddress, timeframe],
        queryFn: async () => {
            if (!poolAddress) throw new Error("No pool address");
            const cfg = TIMEFRAME_CONFIG[timeframe];

            const data = await geckoFetch<{ data: { attributes: GeckoOHLCV } }>(
                `/networks/ton/pools/${encodeURIComponent(poolAddress)}/ohlcv/${cfg.timeframe}?aggregate=${cfg.aggregate}&limit=${cfg.limit}&currency=usd&token=base`
            );

            if (!data?.data?.attributes?.ohlcv_list) return [];

            return data.data.attributes.ohlcv_list
                .map(([ts, o, h, l, c, v]) => ({
                    time: Math.floor(ts),
                    open: o,
                    high: h,
                    low: l,
                    close: c,
                    volume: v,
                }))
                .sort((a, b) => a.time - b.time);
        },
        enabled: !!poolAddress,
        staleTime: 30_000,
        gcTime: 60_000,
        refetchInterval: 60_000,
    });
}

// ─── Price simulation hook ───────────────────────────────────────────

/**
 * Get the current price of a token by simulating a 1 TON swap.
 */
export function useSpotTokenPrice(address: string | undefined, decimals: number = 9) {
    return useQuery({
        queryKey: ["spot-token-price", address],
        queryFn: async () => {
            if (!address) throw new Error("No address");
            const client = createStonApiClient();
            const result = await client.simulateSwap({
                offerAddress: TON_ADDRESS,
                askAddress: address,
                offerUnits: "1000000000",
                slippageTolerance: "0.01",
            });
            const tokensPerTon = parseFloat(fromUnits(result.askUnits, decimals));
            const priceTon = tokensPerTon > 0 ? 1 / tokensPerTon : 0;
            return {
                priceTon,
                tokensPerTon,
                swapRate: result.swapRate,
            };
        },
        enabled: !!address,
        staleTime: 10_000,
        gcTime: 20_000,
        refetchInterval: 15_000,
    });
}
