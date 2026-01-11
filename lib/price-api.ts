/**
 * Cryptocurrency Price Utilities
 * 
 * Uses DeFiLlama API for price data - free, no API key, generous rate limits.
 * Caches prices for 60 seconds to minimize API calls.
 * 
 * @see https://defillama.com/docs/api
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
 * Fetch TON price in USD
 */
export async function fetchTonPrice(): Promise<number> {
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

/**
 * Get price chart data (uses CoinGecko for charts as DeFiLlama doesn't have this)
 * Falls back gracefully on rate limit
 */
export async function fetchPriceChart(
    coinId: string, 
    days: number = 7
): Promise<{ prices: [number, number][] } | null> {
    try {
        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
            { next: { revalidate: 300 } } // Cache for 5 minutes
        );
        
        if (!response.ok) {
            if (response.status === 429) {
                console.warn("[Price API] CoinGecko rate limited for chart data");
            }
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error("[Price API] Chart fetch error:", error);
        return null;
    }
}
