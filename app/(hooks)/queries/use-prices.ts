import { useQuery } from "@tanstack/react-query";
import { tonApiGet } from "@/lib/tonapi-client";

// DeFiLlama coin IDs (for non-TON chains only)
const DEFI_LLAMA_COIN_IDS: Record<string, string> = {
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

interface TonApiRatesResponse {
    rates: Record<string, {
        prices: Record<string, number>;
    }>;
}

async function fetchAllPricesFromApi(): Promise<AllPrices> {
    // Fetch TON price from TonAPI
    let tonPrice = 0;
    try {
        const tonData = await tonApiGet<TonApiRatesResponse>(
            `/v2/rates?tokens=ton&currencies=usd`
        );
        tonPrice = tonData.rates?.ton?.prices?.USD ?? 0;
    } catch {
        // Fallback: fetch from DeFiLlama
        try {
            const res = await fetch(`https://coins.llama.fi/prices/current/coingecko:the-open-network`);
            if (res.ok) {
                const data = await res.json();
                tonPrice = data.coins?.["coingecko:the-open-network"]?.price ?? 0;
            }
        } catch { /* give up */ }
    }

    // Fetch BTC, ETH, SOL, TRX from DeFiLlama (TonAPI only covers TON ecosystem)
    let btc = 0, eth = 0, sol = 0, trx = 0;
    try {
        const allCoinIds = Object.values(DEFI_LLAMA_COIN_IDS).join(",");
        const response = await fetch(`https://coins.llama.fi/prices/current/${allCoinIds}`);
        if (response.ok) {
            const data = await response.json();
            btc = data.coins?.[DEFI_LLAMA_COIN_IDS.btc]?.price ?? 0;
            eth = data.coins?.[DEFI_LLAMA_COIN_IDS.eth]?.price ?? 0;
            sol = data.coins?.[DEFI_LLAMA_COIN_IDS.sol]?.price ?? 0;
            trx = data.coins?.[DEFI_LLAMA_COIN_IDS.trx]?.price ?? 0;
        }
    } catch { /* give up */ }

    return { ton: tonPrice, btc, eth, sol, trx };
}

/**
 * Fetch all crypto prices. TON from TonAPI, others from DeFiLlama.
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
