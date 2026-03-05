/**
 * Cryptocurrency Price Utilities
 *
 * TON price: TonAPI (primary), DeFiLlama (fallback)
 * Multi-chain prices (BTC/ETH/SOL/TRX): DeFiLlama (free, no API key)
 * Caches prices for 60 seconds to minimize API calls.
 */

// Price cache with 60-second TTL
interface PriceCache {
    price: number;
    timestamp: number;
}

const priceCache: Record<string, PriceCache> = {};
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// DeFiLlama coin IDs
const COIN_IDS: Record<string, string> = {
    ton: "coingecko:the-open-network",
    btc: "coingecko:bitcoin",
    eth: "coingecko:ethereum",
    sol: "coingecko:solana",
    trx: "coingecko:tron",
};

/**
 * Get price for a specific coin from cache or API
 */
async function fetchPriceFromApi(coinId: string): Promise<number> {
    try {
        const response = await fetch(
            `https://coins.llama.fi/prices/current/${coinId}`,
            { next: { revalidate: 60 } }
        );
        
        if (!response.ok) {
            console.warn(`[Price API] Failed to fetch ${coinId}: ${response.status}`);
            return 0;
        }
        
        const data = await response.json();
        return data.coins?.[coinId]?.price ?? 0;
    } catch (error) {
        console.error(`[Price API] Error fetching ${coinId}:`, error);
        return 0;
    }
}

/**
 * Get cached price or fetch new one
 */
async function getCachedPrice(symbol: string): Promise<number> {
    const coinId = COIN_IDS[symbol.toLowerCase()];
    if (!coinId) {
        console.warn(`[Price API] Unknown coin symbol: ${symbol}`);
        return 0;
    }
    
    const cached = priceCache[symbol.toLowerCase()];
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
        return cached.price;
    }
    
    const price = await fetchPriceFromApi(coinId);
    priceCache[symbol.toLowerCase()] = { price, timestamp: now };
    return price;
}

/**
 * Fetch TON price in USD.
 * Primary: TonAPI, Fallback: DeFiLlama.
 */
export async function fetchTonPrice(): Promise<number> {
    const cached = priceCache["ton"];
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) return cached.price;

    // Try TonAPI first (server action — keeps API key secure)
    try {
        const { tonApiGet } = await import("@/lib/tonapi-client");
        const data = await tonApiGet<{ rates: Record<string, { prices: Record<string, number> }> }>(
            `/v2/rates?tokens=ton&currencies=usd`
        );
        const price = data.rates?.ton?.prices?.USD ?? 0;
        if (price > 0) {
            priceCache["ton"] = { price, timestamp: now };
            return price;
        }
    } catch { /* fallback below */ }

    // Fallback: DeFiLlama
    return getCachedPrice("ton");
}

/**
 * Fetch Bitcoin price in USD
 */
export async function fetchBtcPrice(): Promise<number> {
    return getCachedPrice("btc");
}

/**
 * Fetch Ethereum price in USD
 */
export async function fetchEthPrice(): Promise<number> {
    return getCachedPrice("eth");
}

/**
 * Fetch Solana price in USD
 */
export async function fetchSolPrice(): Promise<number> {
    return getCachedPrice("sol");
}

/**
 * Fetch Tron price in USD
 */
export async function fetchTrxPrice(): Promise<number> {
    return getCachedPrice("trx");
}

/**
 * Fetch all major crypto prices at once (more efficient)
 */
export async function fetchAllPrices(): Promise<{
    ton: number;
    btc: number;
    eth: number;
    sol: number;
    trx: number;
}> {
    try {
        const allCoinIds = Object.values(COIN_IDS).join(",");
        const response = await fetch(
            `https://coins.llama.fi/prices/current/${allCoinIds}`,
            { next: { revalidate: 60 } }
        );
        
        if (!response.ok) {
            console.warn(`[Price API] Batch fetch failed: ${response.status}`);
            return { ton: 0, btc: 0, eth: 0, sol: 0, trx: 0 };
        }
        
        const data = await response.json();
        const now = Date.now();
        
        const result = {
            ton: data.coins?.[COIN_IDS.ton]?.price ?? 0,
            btc: data.coins?.[COIN_IDS.btc]?.price ?? 0,
            eth: data.coins?.[COIN_IDS.eth]?.price ?? 0,
            sol: data.coins?.[COIN_IDS.sol]?.price ?? 0,
            trx: data.coins?.[COIN_IDS.trx]?.price ?? 0,
        };
        
        // Update cache
        Object.entries(result).forEach(([symbol, price]) => {
            priceCache[symbol] = { price, timestamp: now };
        });
        
        return result;
    } catch (error) {
        console.error("[Price API] Batch fetch error:", error);
        return { ton: 0, btc: 0, eth: 0, sol: 0, trx: 0 };
    }
}

