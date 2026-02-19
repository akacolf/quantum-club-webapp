import type { SwapAsset } from "@/lib/stonfi";

export interface SpotToken extends SwapAsset {
    priceTon?: number;
    priceUsd?: number;
    holders?: number;
    totalSupply?: string;
    volume24h?: number;
    marketCapUsd?: number;
    description?: string;
}

export type SpotSortBy = "name" | "holders" | "price";

export type SpotTradeDirection = "buy" | "sell";

export interface SpotTradeRecord {
    tokenAddress: string;
    tokenSymbol: string;
    tokenName: string;
    direction: SpotTradeDirection;
    amountIn: string;
    amountOut: string;
    walletAddress: string;
    resolverName: string;
    quoteId: string;
    timestamp: unknown; // serverTimestamp
}
