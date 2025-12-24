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

    // Stats
    holders: number;
    trades: number;
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
        immediatePercent: 50, // 50% immediately available
        oneHourPercent: 0, // Simplified: no 1h tranche
        fourHourPercent: 0, // Simplified: no 4h tranche
        twentyFourHourPercent: 50, // 50% unlocks after 6 hours (using 24h field as "delayed")
    },
    sellLimits: {
        whaleThresholdPercent: 5, // 5% of supply = whale
        whaleDailyLimitPercent: 25, // Relaxed: 25% daily (was 10%)
        largeHolderThresholdPercent: 2, // 2% of supply = large holder
        largeHolderDailyLimitPercent: 50, // Relaxed: 50% daily (was 25%)
    },
    twapThresholdUsd: 1000, // Raised from $500 to $1000
    twapDurationMinutes: 15, // Reduced from 30 to 15 minutes
};

// Graduation threshold - balanced at $50K market cap
export const DEFAULT_GRADUATION_THRESHOLD = "50000";

// Platform fees
export const PLATFORM_FEES = {
    creationFee: "1", // 1 TON to create a token
    tradingFeePercent: 1, // 1% total trading fee
    platformFeePercent: 0.5, // 0.5% goes to platform
    creatorFeePercent: 0.5, // 0.5% goes to creator
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
