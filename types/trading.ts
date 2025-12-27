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
    isOnChain: boolean; // True when deployed and confirmed

    // Bonding curve state (from blockchain)
    totalSupply: string; // Current minted supply
    currentPrice: string; // Current price in nanoTON
    marketCap: string;

    // Configuration
    bondingCurve: BondingCurveParams;
    graduationThreshold: string; // TON amount to graduate
    isGraduated: boolean;

    // Statistics (indexed from blockchain events)
    holders: number;
    trades: number;
    volume24h: number;
    priceChange24h: number;

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
}

// =====================================================
// Defaults
// =====================================================

export const DEFAULT_BONDING_CURVE: BondingCurveParams = {
    basePrice: "1000000", // 0.001 TON in nanoTON
    slope: "100000", // Price increase per token
};

// 100 TON graduation threshold (in nanoTON)
export const DEFAULT_GRADUATION_THRESHOLD_TON = "100000000000";
