import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Address } from "@ton/core";

interface Trade {
    id: string;
    type: "buy" | "sell";
    walletAddress: string;
    tokenAmount: number;
    tonAmount: number;
    timestamp: Date;
    hash: string;
}

interface TradeEvent {
    timestamp: number;
    type: "buy" | "sell";
    tonAmount: number;
    tokenAmount: number;
    price: number;
    hash: string;
}

function parseTrades(data: any, isTestnet: boolean): Trade[] {
    const tradeEvents: Trade[] = [];
    for (const tx of data.transactions || []) {
        if (!tx.success) continue;
        const inMsg = tx.in_msg;
        if (!inMsg?.op_code) continue;
        const hash = tx.hash || "";
        const timestamp = new Date((tx.utime || 0) * 1000);

        if (inMsg.op_code === "0xaf750d34") {
            const senderAddr = inMsg.source?.address || "";
            const tonValue = (inMsg.value || 0) / 1e9;
            let tokenAmount = 0;
            for (const outMsg of tx.out_msgs || []) {
                if (outMsg.decoded_body?.amount) {
                    tokenAmount = Number(outMsg.decoded_body.amount) / 1e9;
                    break;
                }
            }
            if (tonValue > 0.01 && tokenAmount > 0) {
                let formattedAddr = senderAddr;
                try {
                    formattedAddr = Address.parse(senderAddr).toString({ bounceable: false, testOnly: isTestnet });
                } catch { /* ignore */ }
                tradeEvents.push({ id: hash, type: "buy", walletAddress: formattedAddr, tonAmount: tonValue, tokenAmount, timestamp, hash });
            }
        } else if (inMsg.op_code === "0x7bdd97de") {
            const sellerAddress = inMsg.decoded_body?.from_address || inMsg.decoded_body?.sender || "";
            const tokenAmount = Number(inMsg.decoded_body?.amount || 0) / 1e9;
            let tonValue = 0;
            for (const outMsg of tx.out_msgs || []) {
                if (outMsg.value) {
                    tonValue = Math.max(tonValue, (outMsg.value || 0) / 1e9);
                }
            }
            if (tonValue > 0.01 && tokenAmount > 0) {
                let formattedAddr = sellerAddress;
                try {
                    formattedAddr = Address.parse(sellerAddress).toString({ bounceable: false, testOnly: isTestnet });
                } catch { /* ignore */ }
                tradeEvents.push({ id: hash, type: "sell", walletAddress: formattedAddr, tonAmount: tonValue, tokenAmount, timestamp, hash });
            }
        }
    }
    return tradeEvents;
}

function parseTradeEvents(data: any): TradeEvent[] {
    const tradeEvents: TradeEvent[] = [];
    for (const tx of data.transactions || []) {
        if (!tx.success) continue;
        const inMsg = tx.in_msg;
        if (!inMsg?.op_code) continue;
        const hash = tx.hash || "";
        const timestamp = (tx.utime || 0) * 1000;

        if (inMsg.op_code === "0xaf750d34") {
            const tonValue = (inMsg.value || 0) / 1e9;
            let tokenAmount = 0;
            for (const outMsg of tx.out_msgs || []) {
                if (outMsg.decoded_body?.amount) {
                    tokenAmount = Number(outMsg.decoded_body.amount) / 1e9;
                    break;
                }
            }
            if (tonValue > 0.01 && tokenAmount > 0) {
                const price = tonValue / tokenAmount;
                tradeEvents.push({ timestamp, type: "buy", tonAmount: tonValue, tokenAmount, price, hash });
            }
        } else if (inMsg.op_code === "0x7bdd97de") {
            const tokenAmount = Number(inMsg.decoded_body?.amount || 0) / 1e9;
            let tonValue = 0;
            for (const outMsg of tx.out_msgs || []) {
                if (outMsg.value) {
                    tonValue = Math.max(tonValue, (outMsg.value || 0) / 1e9);
                }
            }
            if (tonValue > 0.01 && tokenAmount > 0) {
                const price = tonValue / tokenAmount;
                tradeEvents.push({ timestamp, type: "sell", tonAmount: tonValue, tokenAmount, price, hash });
            }
        }
    }
    return tradeEvents;
}

/**
 * Fetch live trades for a specific token's jetton address.
 */
export function useLiveTrades(jettonAddress: string | undefined, isTestnet: boolean, refetchMs = 15000) {
    return useQuery<Trade[]>({
        queryKey: ["liveTrades", jettonAddress, isTestnet],
        queryFn: async () => {
            if (!jettonAddress) return [];
            const { tonApiGet } = await import("@/lib/tonapi-client");
            const data = await tonApiGet<{ transactions?: unknown[] }>(
                `/v2/blockchain/accounts/${jettonAddress}/transactions?limit=50`,
                { testnet: isTestnet }
            );
            const trades = parseTrades(data, isTestnet);
            trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            return trades.slice(0, 20);
        },
        enabled: !!jettonAddress,
        staleTime: 10_000,
        refetchInterval: refetchMs,
    });
}

/**
 * Fetch trade events for price chart data.
 */
export function useTradeEvents(jettonAddress: string | undefined, refetchMs = 30000) {
    return useQuery<TradeEvent[]>({
        queryKey: ["tradeEvents", jettonAddress],
        queryFn: async () => {
            if (!jettonAddress) return [];
            const { tonApiGet } = await import("@/lib/tonapi-client");
            const data = await tonApiGet<{ transactions?: unknown[] }>(
                `/v2/blockchain/accounts/${jettonAddress}/transactions?limit=100`,
                { testnet: false }
            );
            const events = parseTradeEvents(data);
            events.sort((a, b) => a.timestamp - b.timestamp);
            return events;
        },
        enabled: !!jettonAddress,
        staleTime: 15_000,
        refetchInterval: refetchMs,
    });
}

/**
 * Fetch live price for a single coin (5s refresh).
 * TON price from TonAPI, other chains from DeFiLlama.
 */
export function useLivePrice(symbol: string | undefined, refetchMs = 5000) {
    return useQuery<number | null>({
        queryKey: ["livePrice", symbol],
        queryFn: async () => {
            if (!symbol) return null;

            // TON and TON-ecosystem tokens → TonAPI
            if (symbol === "TON") {
                const { tonApiGet } = await import("@/lib/tonapi-client");
                const data = await tonApiGet<{ rates: Record<string, { prices: Record<string, number> }> }>(
                    `/v2/rates?tokens=ton&currencies=usd`
                );
                // TonAPI returns the key as uppercase "TON"
                return data.rates?.TON?.prices?.USD ?? data.rates?.ton?.prices?.USD ?? null;
            }

            // Non-TON chains → DeFiLlama
            const coinIdMap: Record<string, string> = {
                ETH: "coingecko:ethereum",
                BTC: "coingecko:bitcoin",
                SOL: "coingecko:solana",
                TRX: "coingecko:tron",
            };
            const coinId = coinIdMap[symbol];
            if (!coinId) return null;

            const response = await fetch(`https://coins.llama.fi/prices/current/${coinId}`);
            if (!response.ok) return null;
            const data = await response.json();
            return data.coins?.[coinId]?.price ?? null;
        },
        enabled: !!symbol,
        staleTime: 3_000,
        refetchInterval: refetchMs,
    });
}

/**
 * Fetch price alerts for a user.
 */
export function usePriceAlerts(telegramId: string | null) {
    return useQuery<Array<{
        id: string;
        telegramId: string;
        symbol: string;
        targetPrice: number;
        direction: "above" | "below";
        createdAt: number;
        triggered: boolean;
        notified: boolean;
        triggeredAt?: number;
        triggeredPrice?: number;
    }>>({
        queryKey: ["priceAlerts", telegramId],
        queryFn: async () => {
            if (!telegramId) return [];
            const { fetchPriceAlerts } = await import("@/app/(hooks)/actions");
            const result = await fetchPriceAlerts({});
            return (result?.data?.alerts || []) as Array<{
                id: string; telegramId: string; symbol: string;
                targetPrice: number; direction: "above" | "below";
                createdAt: number; triggered: boolean; notified: boolean;
                triggeredAt?: number; triggeredPrice?: number;
            }>;
        },
        enabled: !!telegramId,
        staleTime: 30_000,
    });
}

/**
 * Fetch on-chain stats (holders, trades, volume) for a token.
 */
export const EMPTY_ON_CHAIN_STATS = { holders: 0, trades: 0, volume24h: 0 };

export function useOnChainStats(jettonAddress: string | undefined, isTestnet: boolean) {
    return useQuery<{ holders: number; trades: number; volume24h: number }>({
        queryKey: ["onChainStats", jettonAddress, isTestnet],
        queryFn: async () => {
            if (!jettonAddress) return EMPTY_ON_CHAIN_STATS;
            const { tonApiGet } = await import("@/lib/tonapi-client");

            const [holdersData, txData] = await Promise.all([
                tonApiGet<{ total?: number }>(
                    `/v2/jettons/${jettonAddress}/holders?limit=1`,
                    { testnet: isTestnet }
                ),
                tonApiGet<{ transactions?: Array<{
                    success?: boolean;
                    in_msg?: { op_code?: string; value?: number };
                    utime?: number;
                }> }>(
                    `/v2/blockchain/accounts/${jettonAddress}/transactions?limit=50`,
                    { testnet: isTestnet }
                ),
            ]);

            const holdersCount = holdersData.total || 0;

            let tradesCount = 0;
            let volume24h = 0;
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

            for (const tx of txData.transactions || []) {
                if (!tx.success) continue;
                const opCode = tx.in_msg?.op_code;
                if (opCode === "0xaf750d34" || opCode === "0x7bdd97de") {
                    tradesCount++;
                    const txTime = (tx.utime || 0) * 1000;
                    if (txTime > oneDayAgo) {
                        volume24h += (tx.in_msg?.value || 0) / 1e9;
                    }
                }
            }

            return { holders: holdersCount, trades: tradesCount, volume24h };
        },
        enabled: !!jettonAddress,
        retry: false,
        staleTime: Infinity,
        placeholderData: keepPreviousData,
    });
}

interface GlobalTrade {
    id: string;
    tokenId: string;
    tokenSymbol: string;
    tokenName: string;
    jettonAddress: string;
    type: "buy" | "sell";
    walletAddress: string;
    tokenAmount: number;
    tonAmount: number;
    timestamp: Date;
    hash: string;
}

interface TokenInfo {
    id: string;
    symbol: string;
    name: string;
    jettonMasterAddress: string;
}

/**
 * Fetch global live trades across multiple tokens.
 */
export function useGlobalTrades(
    tokens: TokenInfo[],
    isTestnet: boolean,
    refetchMs = 20000,
) {
    const tokenKeys = tokens.map(t => t.id).sort().join(",");

    return useQuery<GlobalTrade[]>({
        queryKey: ["globalTrades", tokenKeys, isTestnet],
        queryFn: async () => {
            const allTokens = tokens
                .filter((t, i, arr) =>
                    t.jettonMasterAddress &&
                    arr.findIndex(x => x.id === t.id) === i
                )
                .slice(0, 5);

            if (allTokens.length === 0) return [];

            const { tonApiGet } = await import("@/lib/tonapi-client");
            const allTrades: GlobalTrade[] = [];

            await Promise.all(
                allTokens.map(async (token) => {
                    try {
                        const data = await tonApiGet<{ transactions?: unknown[] }>(
                            `/v2/blockchain/accounts/${token.jettonMasterAddress}/transactions?limit=10`,
                            { testnet: isTestnet }
                        );

                        for (const tx of (data.transactions || []) as Array<{
                            success?: boolean; hash?: string; utime?: number;
                            in_msg?: any; out_msgs?: any[];
                        }>) {
                            if (!tx.success) continue;
                            const inMsg = tx.in_msg;
                            if (!inMsg?.op_code) continue;
                            const timestamp = new Date((tx.utime || 0) * 1000);
                            const hash = tx.hash || "";

                            if (inMsg.op_code === "0xaf750d34") {
                                const tonValue = (inMsg.value || 0) / 1e9;
                                const senderAddress = inMsg.source?.address || "";
                                let tokenAmount = 0;
                                for (const outMsg of tx.out_msgs || []) {
                                    if (outMsg.decoded_body?.amount) {
                                        tokenAmount = Number(outMsg.decoded_body.amount) / 1e9;
                                        break;
                                    }
                                }
                                if (tonValue > 0.01 && tokenAmount > 0) {
                                    allTrades.push({
                                        id: hash, tokenId: token.id, tokenSymbol: token.symbol,
                                        tokenName: token.name, jettonAddress: token.jettonMasterAddress,
                                        type: "buy", walletAddress: senderAddress, tonAmount: tonValue,
                                        tokenAmount, timestamp, hash,
                                    });
                                }
                            } else if (inMsg.op_code === "0x7bdd97de") {
                                const tokenAmount = Number(inMsg.decoded_body?.amount || 0) / 1e9;
                                let tonValue = 0;
                                for (const outMsg of tx.out_msgs || []) {
                                    if (outMsg.value) tonValue = Math.max(tonValue, (outMsg.value || 0) / 1e9);
                                }
                                const sellerAddress = inMsg.decoded_body?.sender || inMsg.decoded_body?.from_address || "";
                                if (tonValue > 0.01 && tokenAmount > 0) {
                                    allTrades.push({
                                        id: hash, tokenId: token.id, tokenSymbol: token.symbol,
                                        tokenName: token.name, jettonAddress: token.jettonMasterAddress,
                                        type: "sell", walletAddress: sellerAddress, tonAmount: tonValue,
                                        tokenAmount, timestamp, hash,
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        console.warn(`Failed to fetch trades for ${token.symbol}:`, error);
                    }
                })
            );

            allTrades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            return allTrades.slice(0, 10);
        },
        enabled: tokens.length > 0,
        staleTime: 10_000,
        refetchInterval: refetchMs,
    });
}
