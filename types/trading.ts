// Trading Platform Types
// Core types for the QC Trade token trading platform

export interface TokenMetadata {
    id: string;
    name: string;
    symbol: string;
    description: string;
    image: string;
    creatorId: string;
    creatorAddress?: string; // Wallet address of creator
    creatorUsername?: string;
    createdAt: Date;
}

export interface BondingCurveParams {
    type: "exponential";
    basePrice: string; // Starting price in TON (e.g., "0.000001")
    steepness: number; // k value - determines how fast price rises
    virtualReserve: string; // Virtual TON reserve for initial liquidity
}

export type TokenStatus = "bonding" | "graduated" | "paused";

export interface Token extends TokenMetadata {
    // Supply & pricing
    totalSupply: string;
    currentPrice: string;
    marketCap: string;
    volume24h: string;
    priceChange24h: number; // percentage

    // Bonding curve
    bondingCurve: BondingCurveParams;

    // Status
    status: TokenStatus;
    graduationThreshold: string; // Market cap in TON to graduate to DEX (default: 2000 TON)

    // On-chain deployment status
    isOnChain?: boolean; // Whether Jetton is deployed on TON blockchain
    deploymentPending?: boolean; // Whether deployment is in progress
    deployedAt?: Date; // When deployed on-chain

    // DEX info (only populated when status === "graduated")
    dexPoolAddress?: string; // STON.fi pool address
    jettonMasterAddress?: string; // Token's jetton master for DEX trading
    graduatedAt?: Date; // When the token graduated
    collectedTon?: string; // Total TON collected during bonding phase

    // Stats
    holders: number;
    trades: number;
    trades24h?: number; // 24h trade count
    reserveBalance?: string; // TON collected in bonding curve
}

export interface HolderPosition {
    tokenId: string;
    token?: Token; // Populated on fetch
    balance: string;
    averageBuyPrice: string;
    totalInvested: string;
    unrealizedPnl: string;
    unrealizedPnlPercent: number;
}

export interface Trade {
    id: string;
    tokenId: string;
    type: "buy" | "sell";
    userId: string;
    username?: string;
    amount: string; // Token amount
    price: string; // Price per token in TON
    totalTon: string; // Total TON spent/received
    timestamp: Date;
    txHash?: string;
    status: "pending" | "completed" | "failed";
}

export interface TradeResult {
    success: boolean;
    trade?: Trade;
    error?: string;
    newBalance?: string;
}

export interface CreateTokenParams {
    name: string;
    symbol: string;
    description: string;
    image: string;
    // Optional custom bonding curve (defaults will be applied if not provided)
    bondingCurve?: Partial<BondingCurveParams>;
}

// Default configurations
export const DEFAULT_BONDING_CURVE: BondingCurveParams = {
    type: "exponential",
    basePrice: "0.00001", // 0.00001 TON starting price
    steepness: 0.0000001, // Gradual price increase
    virtualReserve: "30", // 30 TON virtual reserve
};

// Graduation threshold in TON (when market cap reaches this amount in TON, token can graduate to DEX)
export const DEFAULT_GRADUATION_THRESHOLD_TON = "2000";

// Platform fees
export const PLATFORM_FEES = {
    creationFee: "0.5", // 0.5 TON to create a token (covers ~0.25 TON network fee + platform costs)
    tradingFeePercent: 1, // 1% total trading fee
    platformFeePercent: 0.5, // 0.5% goes to platform
    creatorFeePercent: 0.5, // 0.5% goes to creator
    graduationFeePercent: 2, // 2% of collected TON on graduation
};

// Token chat message type (extends existing chat)
export interface TokenChatMessage {
    id: string;
    tokenId: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: Date;
}
