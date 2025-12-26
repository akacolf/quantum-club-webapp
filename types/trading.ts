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

export interface AntiDumpConfig {
    // Graduated vesting - percentages that unlock over time
    vestingSchedule: {
        immediatePercent: number; // e.g., 25
        oneHourPercent: number; // e.g., 25
        fourHourPercent: number; // e.g., 25
        twentyFourHourPercent: number; // e.g., 25
    };
    // Dynamic sell limits based on holder percentage
    sellLimits: {
        whaleThresholdPercent: number; // e.g., 5% of supply
        whaleDailyLimitPercent: number; // e.g., 10% of holdings per day
        largeHolderThresholdPercent: number; // e.g., 2% of supply
        largeHolderDailyLimitPercent: number; // e.g., 25% of holdings per day
    };
    // TWAP selling for large orders
    twapThresholdUsd: number; // e.g., 500 USD - triggers TWAP
    twapDurationMinutes: number; // e.g., 30 minutes
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

    // Anti-dump configuration
    antiDumpConfig: AntiDumpConfig;

    // Status
    status: TokenStatus;
    graduationThreshold: string; // Market cap in USD to graduate to DEX

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

export interface VestingTranche {
    amount: string;
    unlocksAt: Date;
    isUnlocked: boolean;
}

export interface HolderPosition {
    tokenId: string;
    token?: Token; // Populated on fetch
    balance: string;
    vestedBalance: string; // Currently available to sell
    vestingSchedule: VestingTranche[];
    averageBuyPrice: string;
    totalInvested: string;
    unrealizedPnl: string;
    unrealizedPnlPercent: number;
    lastSellTime?: Date;
    dailySoldAmount?: string;
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
    newVestedBalance?: string;
}

export interface CreateTokenParams {
    name: string;
    symbol: string;
    description: string;
    image: string;
    // Optional custom bonding curve (defaults will be applied if not provided)
    bondingCurve?: Partial<BondingCurveParams>;
    // Optional custom anti-dump config (defaults will be applied if not provided)
    antiDumpConfig?: Partial<AntiDumpConfig>;
}

// Default configurations
export const DEFAULT_BONDING_CURVE: BondingCurveParams = {
    type: "exponential",
    basePrice: "0.00001", // 0.00001 TON starting price
    steepness: 0.0000001, // Gradual price increase
    virtualReserve: "30", // 30 TON virtual reserve
};

export const DEFAULT_ANTI_DUMP_CONFIG: AntiDumpConfig = {
    vestingSchedule: {
        immediatePercent: 100, // 100% immediately available - no vesting
        oneHourPercent: 0,
        fourHourPercent: 0,
        twentyFourHourPercent: 0,
    },
    sellLimits: {
        whaleThresholdPercent: 100, // Effectively disabled - no one is a "whale"
        whaleDailyLimitPercent: 100, // Can sell 100% daily
        largeHolderThresholdPercent: 100, // Effectively disabled
        largeHolderDailyLimitPercent: 100, // Can sell 100% daily
    },
    twapThresholdUsd: 100000, // Effectively disabled - very high threshold
    twapDurationMinutes: 0, // No TWAP splitting
};

// Graduation threshold - industry standard at ~$10K market cap (approx 1,500-2,000 TON)
export const DEFAULT_GRADUATION_THRESHOLD = "10000";

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
