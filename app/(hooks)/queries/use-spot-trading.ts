"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSwappableAssets, simulateSwap, fromUnits, TON_ADDRESS } from "@/lib/stonfi";
import { tonApiGet } from "@/lib/tonapi-client";
import type { SpotToken } from "@/types/spot-trading";

/**
 * Fetch all swappable Jetton tokens from STON.fi (excludes native TON).
 */
export function useSpotTokens() {
    return useQuery<SpotToken[]>({
        queryKey: ["spot-tokens"],
        queryFn: async () => {
            const assets = await fetchSwappableAssets();
            // Filter to Jettons only (exclude native TON)
            return assets
                .filter((a) => a.kind === "Jetton")
                .map((a) => ({ ...a }));
        },
        staleTime: 30_000,
        gcTime: 60_000,
    });
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
            };
        },
        enabled: !!address,
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
            // Simulate swapping 1 TON to this token
            const onetonUnits = "1000000000"; // 1 TON in nanotons
            const result = await simulateSwap(TON_ADDRESS, address, onetonUnits);
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
