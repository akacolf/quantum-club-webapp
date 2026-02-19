"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSwappableAssets, createStonApiClient, fromUnits, TON_ADDRESS } from "@/lib/stonfi";
import { tonApiGet } from "@/lib/tonapi-client";
import type { SpotToken } from "@/types/spot-trading";

/**
 * Fetch all swappable Jetton tokens from STON.fi with pricing data.
 * Uses dexPriceUsd from the API and fetches pool volume data.
 */
export function useSpotTokens() {
    return useQuery<SpotToken[]>({
        queryKey: ["spot-tokens"],
        queryFn: async () => {
            const [assets, pools] = await Promise.all([
                fetchSwappableAssets(),
                fetchPoolVolumes(),
            ]);

            // Build volume map from pools: tokenAddress → volume24HUsd
            const volumeMap = new Map<string, number>();
            for (const pool of pools) {
                const vol = parseFloat(pool.volume24HUsd || "0");
                if (vol > 0) {
                    // Add volume to both tokens in the pool
                    for (const addr of [pool.token0Address, pool.token1Address]) {
                        volumeMap.set(addr, (volumeMap.get(addr) || 0) + vol);
                    }
                }
            }

            // Filter to Jettons only, enrich with market data
            return assets
                .filter((a) => a.kind === "Jetton")
                .map((a) => ({
                    ...a,
                    priceUsd: a.dexPriceUsd ? parseFloat(a.dexPriceUsd) : undefined,
                    volume24h: volumeMap.get(a.contractAddress) || 0,
                }))
                .sort((a, b) => {
                    // Sort by volume descending
                    return (b.volume24h || 0) - (a.volume24h || 0);
                });
        },
        staleTime: 30_000,
        gcTime: 60_000,
    });
}

interface PoolData {
    address: string;
    token0Address: string;
    token1Address: string;
    volume24HUsd?: string;
    reserve0: string;
    reserve1: string;
    lpTotalSupplyUsd?: string;
}

async function fetchPoolVolumes(): Promise<PoolData[]> {
    try {
        const client = createStonApiClient();
        const pools = await client.getPools();
        return pools.map((p) => ({
            address: p.address,
            token0Address: p.token0Address,
            token1Address: p.token1Address,
            volume24HUsd: (p as Record<string, unknown>).volume24HUsd as string | undefined,
            reserve0: p.reserve0,
            reserve1: p.reserve1,
            lpTotalSupplyUsd: p.lpTotalSupplyUsd ?? undefined,
        }));
    } catch (error) {
        console.error("Failed to fetch pool volumes:", error);
        return [];
    }
}

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
 * Fetch pool data for a specific token (paired with TON) for volume and liquidity.
 */
export function useSpotTokenPool(tokenAddress: string | undefined) {
    return useQuery({
        queryKey: ["spot-token-pool", tokenAddress],
        queryFn: async () => {
            if (!tokenAddress) throw new Error("No address");
            const client = createStonApiClient();
            const pools = await client.getPoolsByAssetPair({
                asset0Address: TON_ADDRESS,
                asset1Address: tokenAddress,
            });
            if (!pools || pools.length === 0) return null;
            const pool = pools[0];
            return {
                address: pool.address,
                volume24HUsd: (pool as Record<string, unknown>).volume24HUsd as string | undefined,
                reserve0: pool.reserve0,
                reserve1: pool.reserve1,
                lpTotalSupplyUsd: pool.lpTotalSupplyUsd ?? undefined,
                apy1D: pool.apy1D ?? undefined,
                apy7D: pool.apy7D ?? undefined,
                lpFee: pool.lpFee,
            };
        },
        enabled: !!tokenAddress,
        staleTime: 15_000,
        gcTime: 30_000,
    });
}

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
                offerUnits: "1000000000", // 1 TON
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
