"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { fetchSwappableAssets, fetchAllAssets, createStonApiClient, fromUnits, TON_ADDRESS } from "@/lib/stonfi";
import { isXStockSymbol } from "@/lib/xstocks";
import { tonApiGet } from "@/lib/tonapi-client";
import type { SpotToken } from "@/types/spot-trading";

// ─── TonAPI response types ──────────────────────────────────────────

interface TonApiJettonInfo {
    mintable: boolean;
    total_supply: string;
    holders_count: number;
    metadata: {
        address: string;
        name: string;
        symbol: string;
        decimals: string;
        image?: string;
        description?: string;
    };
    verification: string;
}

interface TonApiRatesResponse {
    rates: Record<string, {
        prices: Record<string, number>;
        diff_24h?: Record<string, string>;
        diff_7d?: Record<string, string>;
        diff_30d?: Record<string, string>;
    }>;
}

interface TonApiChartResponse {
    points: [number, number][]; // [timestamp, price]
}

const tonApiMarketCapJettonSchema = z.object({
    total_supply: z.string(),
    metadata: z.object({
        decimals: z.string().optional(),
    }).optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────

/** TonAPI uppercases response keys — do case-insensitive lookup */
function findRate(rates: TonApiRatesResponse["rates"] | undefined, key: string) {
    if (!rates) return undefined;
    // Try exact match first, then uppercase
    return rates[key] ?? rates[key.toUpperCase()] ?? rates[key.toLowerCase()];
}

/** Parse TonAPI percentage strings safely. Handles Unicode minus (−), % suffix, NaN */
function parsePercent(value: string | undefined): number | undefined {
    if (!value) return undefined;
    // Replace Unicode minus (U+2212) with regular hyphen, strip %
    const cleaned = value.replace(/\u2212/g, "-").replace(/%/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
}

function calculateMarketCapUsd(totalSupply: string | undefined, decimals: number, priceUsd: number | undefined) {
    if (!totalSupply || !priceUsd || priceUsd <= 0) return undefined;

    const supply = Number(totalSupply) / 10 ** decimals;
    if (!Number.isFinite(supply) || supply <= 0) return undefined;

    return supply * priceUsd;
}

// ─── Token list hook ──────────────────────────────────────────────────

/**
 * Fetch swappable Jettons from STON.fi, enriched with TonAPI market data.
 * Uses TonAPI /v2/rates for prices + 24h change (batched, up to 100 tokens).
 */
export function useSpotTokens() {
    return useQuery<SpotToken[]>({
        queryKey: ["spot-tokens"],
        queryFn: async () => {
            const assets = await fetchSwappableAssets();
            const jettons = assets.filter((a) => a.kind === "Jetton");

            // Batch fetch rates from TonAPI (supports up to 100 tokens per request)
            const BATCH = 100;
            const enriched: SpotToken[] = [];

            for (let i = 0; i < jettons.length; i += BATCH) {
                const batch = jettons.slice(i, i + BATCH);
                const tokenIds = batch.map((j) => j.contractAddress).join(",");

                // Fetch rates with 24h diff in a single call
                let rates: TonApiRatesResponse | null = null;
                try {
                    rates = await tonApiGet<TonApiRatesResponse>(
                        `/v2/rates?tokens=${encodeURIComponent(tokenIds)}&currencies=usd`
                    );
                } catch {
                    // Fall back to STON.fi prices if TonAPI fails
                }

                for (const a of batch) {
                    const rateData = findRate(rates?.rates, a.contractAddress);
                    const priceUsd = rateData?.prices?.USD
                        ?? (a.dexPriceUsd ? parseFloat(a.dexPriceUsd) : undefined);

                    enriched.push({
                        ...a,
                        priceUsd,
                        priceChange24h: parsePercent(rateData?.diff_24h?.USD),
                        volume24h: 0, // TonAPI rates doesn't include volume; detail hooks fetch this
                    });
                }
            }

            // Sort by price descending (tokens with price first)
            return enriched.sort((a, b) => (b.priceUsd ?? 0) - (a.priceUsd ?? 0));
        },
        staleTime: 30_000,
        gcTime: 60_000,
    });
}

/**
 * Fetch xStocks tokens from STON.fi, including low-liquidity assets so all
 * Backed Finance tokens are visible regardless of pool depth.
 */
export function useXStocksTokens(enabled = true) {
    return useQuery<SpotToken[]>({
        queryKey: ["xstocks-tokens"],
        enabled,
        queryFn: async () => {
            const assets = await fetchAllAssets();
            const xstockJettons = assets.filter((a) => a.kind === "Jetton" && isXStockSymbol(a.symbol));

            const BATCH = 100;
            const enriched: SpotToken[] = [];

            for (let i = 0; i < xstockJettons.length; i += BATCH) {
                const batch = xstockJettons.slice(i, i + BATCH);
                const tokenIds = batch.map((j) => j.contractAddress).join(",");

                type XStockRates = { rates: Record<string, { prices: Record<string, number>; diff_24h?: Record<string, string> }> };
                let rates: XStockRates | null = null;
                try {
                    rates = await tonApiGet<XStockRates>(
                        `/v2/rates?tokens=${encodeURIComponent(tokenIds)}&currencies=usd`
                    );
                } catch {
                    // fall back to STON.fi prices
                }

                for (const a of batch) {
                    const rateData = rates?.rates?.[a.contractAddress] ?? rates?.rates?.[a.contractAddress.toUpperCase()];
                    const priceUsd = rateData?.prices?.USD ?? (a.dexPriceUsd ? parseFloat(a.dexPriceUsd) : undefined);
                    const changeStr = rateData?.diff_24h?.USD;
                    const change = changeStr ? parseFloat(changeStr.replace(/−/g, "-").replace(/%/g, "")) : undefined;

                    enriched.push({
                        ...a,
                        priceUsd,
                        priceChange24h: Number.isNaN(change) ? undefined : change,
                        volume24h: 0,
                    });
                }
            }

            return enriched.sort((a, b) => (b.priceUsd ?? 0) - (a.priceUsd ?? 0));
        },
        staleTime: 30_000,
        gcTime: 60_000,
    });
}

/**
 * Fetch spot jettons ranked by real market cap, computed from TonAPI rates
 * and jetton total supply. Enabled lazily by the home MC tab.
 */
export function useSpotTokensByMarketCap(enabled = true) {
    return useQuery<SpotToken[]>({
        queryKey: ["spot-tokens", "market-cap"],
        queryFn: async () => {
            const assets = await fetchSwappableAssets();
            const jettons = assets.filter((a) => a.kind === "Jetton");

            const BATCH = 50;
            const enriched: SpotToken[] = [];

            for (let i = 0; i < jettons.length; i += BATCH) {
                const batch = jettons.slice(i, i + BATCH);
                const tokenIds = batch.map((j) => j.contractAddress).join(",");

                let rates: TonApiRatesResponse | null = null;
                try {
                    rates = await tonApiGet<TonApiRatesResponse>(
                        `/v2/rates?tokens=${encodeURIComponent(tokenIds)}&currencies=usd`
                    );
                } catch {
                    // Fall back to STON.fi prices if TonAPI rates fail
                }

                const details = await Promise.allSettled(
                    batch.map((asset) =>
                        tonApiGet<unknown>(`/v2/jettons/${encodeURIComponent(asset.contractAddress)}`)
                    )
                );

                batch.forEach((asset, index) => {
                    const rateData = findRate(rates?.rates, asset.contractAddress);
                    const priceUsd = rateData?.prices?.USD
                        ?? (asset.dexPriceUsd ? parseFloat(asset.dexPriceUsd) : undefined);
                    const detail = details[index].status === "fulfilled"
                        ? tonApiMarketCapJettonSchema.safeParse(details[index].value)
                        : null;
                    const totalSupply = detail?.success ? detail.data.total_supply : undefined;
                    const decimals = detail?.success
                        ? Number(detail.data.metadata?.decimals ?? asset.decimals) || asset.decimals
                        : asset.decimals;

                    enriched.push({
                        ...asset,
                        priceUsd,
                        priceChange24h: parsePercent(rateData?.diff_24h?.USD),
                        marketCapUsd: calculateMarketCapUsd(totalSupply, decimals, priceUsd),
                        totalSupply,
                    });
                });
            }

            return enriched
                .filter((token) => token.marketCapUsd !== undefined)
                .sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0));
        },
        enabled,
        staleTime: 60_000,
        gcTime: 2 * 60_000,
    });
}

// ─── Token detail hooks ──────────────────────────────────────────────

/**
 * Fetch on-chain Jetton metadata + holders from TonAPI.
 */
export function useSpotTokenDetail(address: string | undefined) {
    return useQuery({
        queryKey: ["spot-token-detail", address],
        queryFn: async () => {
            if (!address) throw new Error("No address");
            const data = await tonApiGet<TonApiJettonInfo>(
                `/v2/jettons/${encodeURIComponent(address)}`
            );
            return {
                holders: data.holders_count ?? 0,
                totalSupply: data.total_supply ?? "0",
                decimals: data.metadata?.decimals ? (parseInt(data.metadata.decimals) || 9) : 9,
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
 * Fetch market data for a token from TonAPI rates (price, 24h/7d/30d change)
 * + GeckoTerminal pool data for volume & liquidity.
 */
export function useSpotTokenMarket(tokenAddress: string | undefined) {
    return useQuery({
        queryKey: ["spot-token-market", tokenAddress],
        queryFn: async () => {
            if (!tokenAddress) throw new Error("No address");

            // Fetch rates from TonAPI (price, 24h/7d/30d change)
            let ratesData: TonApiRatesResponse | null = null;
            try {
                ratesData = await tonApiGet<TonApiRatesResponse>(
                    `/v2/rates?tokens=${encodeURIComponent(tokenAddress)}&currencies=usd`
                );
            } catch { /* fallback below */ }

            const rateInfo = findRate(ratesData?.rates, tokenAddress);

            // Try GeckoTerminal for volume + liquidity (pool data not available in TonAPI)
            let poolAddress: string | undefined;
            let volume24HUsd: string | undefined;
            let liquidityUsd: string | undefined;
            let poolName: string | undefined;

            try {
                const poolsData = await geckoFetch<{
                    data: { id: string; attributes: GeckoPoolAttributes }[];
                }>(`/networks/ton/tokens/${encodeURIComponent(tokenAddress)}/pools?page=1`);

                const topPool = poolsData?.data?.[0];
                if (topPool) {
                    poolAddress = topPool.attributes.address;
                    volume24HUsd = topPool.attributes.volume_usd?.h24 || undefined;
                    liquidityUsd = topPool.attributes.reserve_in_usd || undefined;
                    poolName = topPool.attributes.name;
                }
            } catch { /* GeckoTerminal is optional enrichment */ }

            const priceUsd = rateInfo?.prices?.USD;

            return {
                poolAddress,
                priceUsd: priceUsd !== undefined ? String(priceUsd) : undefined,
                priceChangeH24: parsePercent(rateInfo?.diff_24h?.USD),
                priceChangeW7d: parsePercent(rateInfo?.diff_7d?.USD),
                priceChangeM30d: parsePercent(rateInfo?.diff_30d?.USD),
                volume24HUsd,
                liquidityUsd,
                marketCapUsd: undefined,
                fdvUsd: undefined,
                poolName,
            };
        },
        enabled: !!tokenAddress,
        staleTime: 15_000,
        gcTime: 30_000,
    });
}

// ─── GeckoTerminal helpers (kept for pool/OHLCV data only) ──────────

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

// ─── OHLCV chart hook (GeckoTerminal — candlestick fallback) ────────

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
 * Used as fallback for candlestick charts when TonAPI area chart is insufficient.
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

// ─── TonAPI chart hook (primary — area chart) ────────────────────────

const TONAPI_CHART_CONFIG: Record<ChartTimeframe, { hours: number; points: number }> = {
    "15m": { hours: 24,      points: 96 },   // 24h, ~15min intervals
    "1h":  { hours: 24 * 7,  points: 168 },  // 7 days, ~1h intervals
    "4h":  { hours: 24 * 30, points: 180 },  // 30 days, ~4h intervals
    "1d":  { hours: 24 * 90, points: 90 },   // 90 days, daily intervals
};

/**
 * Fetch price chart data from TonAPI /v2/rates/chart.
 * Returns [timestamp, price] pairs — area chart only (no OHLCV).
 * Primary chart source — works for any token without needing a pool address.
 */
export function useSpotTokenTonApiChart(tokenAddress: string | undefined, timeframe: ChartTimeframe = "1h") {
    return useQuery<OHLCVCandle[]>({
        queryKey: ["spot-token-tonapi-chart", tokenAddress, timeframe],
        queryFn: async () => {
            if (!tokenAddress) throw new Error("No address");
            const cfg = TONAPI_CHART_CONFIG[timeframe];
            const endDate = Math.floor(Date.now() / 1000);
            const startDate = endDate - cfg.hours * 3600;

            const data = await tonApiGet<TonApiChartResponse>(
                `/v2/rates/chart?token=${encodeURIComponent(tokenAddress)}&currency=usd&start_date=${startDate}&end_date=${endDate}&points_count=${cfg.points}`
            );

            if (!data?.points?.length) return [];

            return data.points.map(([ts, price]) => ({
                time: ts,
                open: price,
                high: price,
                low: price,
                close: price,
                volume: 0,
            })).sort((a, b) => a.time - b.time);
        },
        enabled: !!tokenAddress,
        staleTime: 30_000,
        gcTime: 60_000,
        refetchInterval: 60_000,
    });
}

// ─── DYOR enrichment hook ───────────────────────────────────────────

const DYOR_BASE = "https://api.dyor.io/v1";

async function dyorFetch<T>(path: string): Promise<T | null> {
    try {
        const res = await fetch(`${DYOR_BASE}${path}`, {
            headers: { Accept: "application/json" },
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

function parseDyorDecimal(val: { value: string; decimals: number } | undefined | null): number | undefined {
    if (!val?.value) return undefined;
    const parsed = parseInt(val.value);
    if (isNaN(parsed) || !Number.isFinite(val.decimals)) return undefined;
    return parsed * Math.pow(10, -val.decimals);
}

interface DyorJettonResponse {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    image: string;
    description: string;
    price: { value: string; decimals: number };
    priceUsd: { value: string; decimals: number };
    holdersCount: number;
    mcap: { value: string; decimals: number };
    fdmc: { value: string; decimals: number };
    liquidityUsd: { value: string; decimals: number };
    trustScore: number;
    totalSupply: { value: string; decimals: number };
    circulatingSupply: { value: string; decimals: number };
    verification: string;
}

interface DyorStatsResponse {
    address: string;
    priceChange: {
        usd: Record<string, { changePercent: string; previous: { value: string; decimals: number }; current: { value: string; decimals: number } }>;
        ton: Record<string, { changePercent: string }>;
    };
    volume: {
        usd: Record<string, { changePercent: string; current: { value: string; decimals: number } }>;
    };
    traders: Record<string, { changePercent: string; current: { value: string; decimals: number } }>;
    transactions: Record<string, { changePercent: string; current: { value: string; decimals: number } }>;
}

/**
 * Fetch enriched token data from DYOR API (trust score, volume, trading activity).
 */
export function useSpotTokenDyor(address: string | undefined) {
    return useQuery({
        queryKey: ["spot-token-dyor", address],
        queryFn: async () => {
            if (!address) throw new Error("No address");

            const [detail, stats] = await Promise.all([
                dyorFetch<DyorJettonResponse>(`/jettons/${encodeURIComponent(address)}`),
                dyorFetch<DyorStatsResponse>(`/jettons/${encodeURIComponent(address)}/stats`),
            ]);

            const priceChangeDay = stats?.priceChange?.usd?.day1
                ?? stats?.priceChange?.usd?.day;
            const volumeDay = stats?.volume?.usd?.day1
                ?? stats?.volume?.usd?.day;
            const tradersDay = stats?.traders?.day1
                ?? stats?.traders?.day;

            return {
                priceUsd: parseDyorDecimal(detail?.priceUsd),
                priceTon: parseDyorDecimal(detail?.price),
                holdersCount: detail?.holdersCount,
                marketCapUsd: parseDyorDecimal(detail?.mcap),
                fdmcUsd: parseDyorDecimal(detail?.fdmc),
                liquidityUsd: parseDyorDecimal(detail?.liquidityUsd),
                trustScore: detail?.trustScore,
                priceChange24h: priceChangeDay ? parseFloat(priceChangeDay.changePercent) : undefined,
                volume24hUsd: volumeDay ? parseDyorDecimal(volumeDay.current) : undefined,
                traders24h: tradersDay ? parseDyorDecimal(tradersDay.current) : undefined,
                description: detail?.description,
            };
        },
        enabled: !!address,
        staleTime: 15_000,
        gcTime: 30_000,
    });
}

// ─── Price simulation hook ───────────────────────────────────────────

/**
 * Get the current price of a token by simulating a 1 TON swap.
 */
export function useSpotTokenPrice(address: string | undefined, decimals: number | undefined) {
    return useQuery({
        queryKey: ["spot-token-price", address, decimals],
        queryFn: async () => {
            if (!address || decimals === undefined) throw new Error("No address or decimals");
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
        enabled: !!address && decimals !== undefined,
        staleTime: 10_000,
        gcTime: 20_000,
        refetchInterval: 15_000,
    });
}
