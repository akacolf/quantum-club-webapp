import { useQuery } from "@tanstack/react-query";

interface PricePoint {
    time: string;
    price: number;
}

type ChartPeriod = "1H" | "1D" | "1W" | "1M" | "6M" | "1Y";

function formatTimeLabel(date: Date, period: ChartPeriod): string {
    if (period === "1H" || period === "1D") {
        return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (period === "1W" || period === "1M") {
        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

async function fetchPriceHistory(
    symbol: string,
    jettonAddress: string | undefined,
    period: ChartPeriod,
    isTestnet: boolean,
): Promise<PricePoint[]> {
    // For ETH, BTC, SOL, TRX use CoinGecko API
    if (["ETH", "BTC", "SOL", "TRX"].includes(symbol)) {
        const coinIds: Record<string, string> = { ETH: "ethereum", BTC: "bitcoin", SOL: "solana", TRX: "tron" };
        const coinId = coinIds[symbol];
        const days = { "1H": "1", "1D": "1", "1W": "7", "1M": "30", "6M": "180", "1Y": "365" }[period];

        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
        );

        if (response.ok) {
            const data = await response.json();
            const prices: [number, number][] = data.prices || [];

            if (prices.length > 0) {
                const maxPoints = period === "1H" ? 60 : period === "1D" ? 96 : 100;
                const step = Math.max(1, Math.floor(prices.length / maxPoints));
                const sampledPrices = prices.filter((_, i) => i % step === 0);

                return sampledPrices.map((point) => ({
                    time: formatTimeLabel(new Date(point[0]), period),
                    price: point[1],
                }));
            }
        }
        return [];
    }

    // For TON and other tokens, use TonAPI via authenticated proxy
    const { tonApiGet } = await import("@/lib/tonapi-client");
    const tokenId = symbol === "TON" ? "ton" : jettonAddress;
    if (!tokenId) throw new Error("No token identifier");

    const now = Math.floor(Date.now() / 1000);
    const offsets: Record<ChartPeriod, number> = {
        "1H": 3600, "1D": 86400, "1W": 604800, "1M": 2592000, "6M": 15552000, "1Y": 31536000,
    };
    const startTime = now - offsets[period];

    const data = await tonApiGet<{ points: [number, number][] }>(
        `/v2/rates/chart?token=${tokenId}&currency=usd&start_date=${startTime}&end_date=${now}`,
        { testnet: isTestnet },
    );

    const points: [number, number][] = data.points || [];
    if (points.length > 0) {
        return points.map((point) => ({
            time: formatTimeLabel(new Date(point[0] * 1000), period),
            price: point[1],
        }));
    }
    return [];
}

export function usePriceHistoryQuery(
    symbol: string | undefined,
    jettonAddress: string | undefined,
    period: ChartPeriod,
    isTestnet: boolean,
) {
    return useQuery<PricePoint[]>({
        queryKey: ["price-history", symbol, jettonAddress, period, isTestnet],
        queryFn: () => fetchPriceHistory(symbol!, jettonAddress, period, isTestnet),
        enabled: !!symbol,
        staleTime: 30_000,
        refetchInterval: period === "1H" ? 30_000 : undefined,
    });
}
