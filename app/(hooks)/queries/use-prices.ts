import { useQuery } from "@tanstack/react-query";

// DeFiLlama coin IDs
const COIN_IDS: Record<string, string> = {
    ton: "coingecko:the-open-network",
    btc: "coingecko:bitcoin",
    eth: "coingecko:ethereum",
    sol: "coingecko:solana",
    trx: "coingecko:tron",
};

interface AllPrices {
    ton: number;
    btc: number;
    eth: number;
    sol: number;
    trx: number;
}

async function fetchAllPricesFromApi(): Promise<AllPrices> {
    const allCoinIds = Object.values(COIN_IDS).join(",");
    const response = await fetch(
        `https://coins.llama.fi/prices/current/${allCoinIds}`
    );

    if (!response.ok) {
        throw new Error(`Price API batch fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return {
        ton: data.coins?.[COIN_IDS.ton]?.price ?? 0,
        btc: data.coins?.[COIN_IDS.btc]?.price ?? 0,
        eth: data.coins?.[COIN_IDS.eth]?.price ?? 0,
        sol: data.coins?.[COIN_IDS.sol]?.price ?? 0,
        trx: data.coins?.[COIN_IDS.trx]?.price ?? 0,
    };
}

async function fetchSinglePrice(symbol: string): Promise<number> {
    const coinId = COIN_IDS[symbol.toLowerCase()];
    if (!coinId) return 0;

    const response = await fetch(
        `https://coins.llama.fi/prices/current/${coinId}`
    );
    if (!response.ok) return 0;

    const data = await response.json();
    return data.coins?.[coinId]?.price ?? 0;
}

/**
 * Fetch all crypto prices in a single batch request.
 * Cached for 60s via TanStack Query staleTime.
 */
export function useAllPrices() {
    return useQuery<AllPrices>({
        queryKey: ["prices", "all"],
        queryFn: fetchAllPricesFromApi,
        staleTime: 60_000,
        refetchInterval: 60_000,
    });
}

/**
 * Fetch a single coin price.
 */
export function useCoinPrice(symbol: string, enabled = true) {
    return useQuery<number>({
        queryKey: ["prices", symbol.toLowerCase()],
        queryFn: () => fetchSinglePrice(symbol),
        staleTime: 60_000,
        enabled,
    });
}

/**
 * Fetch price chart data from CoinGecko.
 */
export function usePriceChart(coinId: string, days = 7, enabled = true) {
    return useQuery<{ prices: [number, number][] } | null>({
        queryKey: ["priceChart", coinId, days],
        queryFn: async () => {
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
            );
            if (!response.ok) return null;
            return response.json();
        },
        staleTime: 5 * 60_000,
        enabled,
    });
}
