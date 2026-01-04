/**
 * Trading Platform Types
 * Types for QC RocketStart on-chain trading platform
 * 
 * All trading happens on TON blockchain via smart contracts
 */

// =====================================================
// Token Types
// =====================================================

export interface Token {
    // Identity
    id: string;
    name: string;
    nameLower: string;
    symbol: string;
    symbolLower: string;
    description: string;
    image: string;

    // Creator
    creatorId: string;
    creatorWallet: string;
    creatorUsername?: string;

    // On-chain data
    jettonMasterAddress: string; // Jetton Master contract address
    isOnChain: boolean; // True when created via the platform
    isDeployed: boolean; // True when contract is verified active on blockchain

    // Supply info
    maxSupply: string; // Maximum supply (1 billion * 10^9)
    totalSupply: string; // Current minted supply (circulating)
    circulatingSupply: string; // Same as totalSupply for mint-on-demand model
    tonReserve: string; // TON locked in bonding curve

    // Price data
    currentPrice: string; // Current price in nanoTON
    marketCap: string;

    // Configuration
    bondingCurve: BondingCurveParams;
    graduationThreshold: string; // TON amount to graduate
    isGraduated: boolean;
    mintable?: boolean; // False when max supply reached or graduated

    // Statistics (indexed from blockchain events)
    holders: number;
    trades: number;
    volume24h: number;
    priceChange24h: number;

    // Creator earnings (accumulated from 0.5% trading fee)
    creatorEarnings?: string; // Total earnings in nanoTON

    // DEX info (when graduated)
    dexPoolAddress?: string;
    graduatedAt?: Date;

    // Timestamps
    createdAt: Date;
    deployedAt?: Date;
}

export interface BondingCurveParams {
    basePrice: string; // Initial price in nanoTON
    slope: string; // Price increase per token
}

// =====================================================
// User Positions
// =====================================================

export interface HolderPosition {
    tokenId: string;
    token?: Token;
    balance: string; // On-chain balance
    averageBuyPrice: string;
    totalInvested: string;
    currentValue: string;
    pnl: number;
    pnlPercent: number;
}

// =====================================================
// Trade Types
// =====================================================

export interface Trade {
    id: string;
    tokenId: string;
    type: "buy" | "sell";
    userId: string;
    walletAddress: string;
    username?: string;
    amount: string; // Token amount
    price: string; // Price per token
    totalTon: string;
    txHash?: string;
    timestamp: Date;
    status: "pending" | "completed" | "failed";
}

export interface TradeResult {
    success: boolean;
    error?: string;
    txHash?: string;
    trade?: Trade;
    newBalance?: string;
}

// =====================================================
// Token Creation
// =====================================================

export interface CreateTokenParams {
    name: string;
    symbol: string;
    description: string;
    image: string;
    initialBuyAmount?: string; // Optional initial buy in TON (0-100 TON)
}

// =====================================================
// Slippage Settings
// =====================================================

export interface SlippageSettings {
    tolerance: number; // Percentage (e.g., 1 = 1%)
    isCustom: boolean;
}

// =====================================================
// Creator Earnings
// =====================================================

export interface CreatorEarnings {
    tokenId: string;
    tokenSymbol: string;
    totalEarnings: string; // In nanoTON
    tradeCount: number;
    lastUpdated: Date;
}

// =====================================================
// Defaults
// =====================================================

export const DEFAULT_BONDING_CURVE: BondingCurveParams = {
    basePrice: "1000", // 0.000001 TON in nanoTON
    slope: "100000", // Price increase per token
};

// 2000 TON graduation threshold (in nanoTON)
export const DEFAULT_GRADUATION_THRESHOLD_TON = "2000000000000";

// Max supply: 1 billion tokens with 9 decimals
export const MAX_SUPPLY = "1000000000000000000";
export const MAX_SUPPLY_FORMATTED = "1,000,000,000";

// Slippage defaults
export const DEFAULT_SLIPPAGE = 1; // 1%
export const SLIPPAGE_OPTIONS = [0.5, 1, 3, 5];

// Initial buy limits
export const MIN_INITIAL_BUY = 0; // Can skip initial buy
export const MAX_INITIAL_BUY = 100; // Max 100 TON initial buy
