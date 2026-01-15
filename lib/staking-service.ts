"use client";

/**
 * TON Staking Service
 * Integrates with liquid staking protocols (TON Stakers, Bemo, Hipo)
 */

import { Address, toNano, Cell, internal, SendMode, beginCell } from "@ton/core";
import { WalletContractV5R1 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";

// Staking pool configurations
export interface StakingPool {
    id: string;
    name: string;
    icon: string;
    description: string;
    liquidToken: string;
    liquidTokenIcon: string;
    apy: number;
    minStake: number;
    poolAddress: string;
    jettonMasterAddress: string;
    unstakeTime: string;
    isInstantUnstake: boolean;
    features: string[];
    riskLevel: "low" | "medium" | "high";
}

// Main TON staking pools on mainnet
export const STAKING_POOLS: StakingPool[] = [
    {
        id: "tonstakers",
        name: "TON Stakers",
        icon: "/png/tonstakers-logo.jpg",
        description: "The largest liquid staking pool on TON",
        liquidToken: "tsTON",
        liquidTokenIcon: "/svg/ton-logo.svg",
        apy: 4.8,
        minStake: 1,
        // TON Stakers pool contract address (mainnet)
        poolAddress: "EQCkWxfyhAkim3g2DjKQQg8T5P4g-Q1-K_jErGcDJZ4i-vqR",
        jettonMasterAddress: "EQC98_qAmNEptUtPc7W6xdHh_ZHrBUFpw5Ft_IzNU20QAJav",
        unstakeTime: "~0 seconds (instant)",
        isInstantUnstake: true,
        features: ["Liquid staking", "Instant unstake", "DeFi compatible", "Auto-compound"],
        riskLevel: "low",
    },
    {
        id: "bemo",
        name: "Bemo Finance",
        icon: "/svg/ton-logo.svg",
        description: "Decentralized liquid staking protocol",
        liquidToken: "stTON",
        liquidTokenIcon: "/svg/ton-logo.svg",
        apy: 5.1,
        minStake: 0.5,
        // Bemo pool contract (mainnet)
        poolAddress: "EQDNhy-nxYFgUqzfUzImBEP67JqsyMIcyk2S5_RwNNEYku0k",
        jettonMasterAddress: "EQDNhy-nxYFgUqzfUzImBEP67JqsyMIcyk2S5_RwNNEYku0k",
        unstakeTime: "~0 seconds (instant)",
        isInstantUnstake: true,
        features: ["Liquid staking", "No minimum", "Governance", "Auto-compound"],
        riskLevel: "low",
    },
    {
        id: "hipo",
        name: "Hipo Finance",
        icon: "/svg/ton-logo.svg",
        description: "Decentralized staking with hTON",
        liquidToken: "hTON",
        liquidTokenIcon: "/svg/ton-logo.svg",
        apy: 4.6,
        minStake: 10,
        // Hipo treasury (mainnet)
        poolAddress: "EQBNo5qAG8I8J6IxGaz15SfQVB-kX98YhKV_mT36Xo5vYxUa",
        jettonMasterAddress: "EQBNo5qAG8I8J6IxGaz15SfQVB-kX98YhKV_mT36Xo5vYxUa",
        unstakeTime: "~36 hours",
        isInstantUnstake: false,
        features: ["Decentralized", "Community governed", "Open source"],
        riskLevel: "low",
    },
];

// Staking operation result
export interface StakingResult {
    success: boolean;
    txHash?: string;
    error?: string;
    estimatedLiquidTokens?: string;
}

// User's staking position
export interface StakingPosition {
    poolId: string;
    poolName: string;
    liquidTokenBalance: string;
    liquidTokenSymbol: string;
    stakedTonValue: string;
    earnedRewards: string;
    apy: number;
}

/**
 * Build stake transaction for liquid staking pools
 * Most TON liquid staking pools accept TON with a simple transfer with a specific comment/body
 */
export async function buildStakeTransaction(
    pool: StakingPool,
    amountTon: string
): Promise<{
    to: Address;
    value: bigint;
    body: Cell;
} | null> {
    try {
        const amount = toNano(amountTon);
        const poolAddress = Address.parse(pool.poolAddress);

        // Build stake body based on pool protocol
        let body: Cell;

        switch (pool.id) {
            case "tonstakers":
                // TON Stakers uses op=0x47d54391 for deposit
                body = beginCell()
                    .storeUint(0x47d54391, 32) // op: deposit
                    .storeUint(0, 64) // query_id
                    .endCell();
                break;

            case "bemo":
                // Bemo uses a simple transfer with specific forward_ton_amount
                body = beginCell()
                    .storeUint(0, 32) // Simple transfer
                    .storeStringTail("Stake TON") // Optional comment
                    .endCell();
                break;

            case "hipo":
                // Hipo uses op=0x7bcd1fef for deposit
                body = beginCell()
                    .storeUint(0x7bcd1fef, 32) // op: deposit
                    .storeUint(0, 64) // query_id
                    .endCell();
                break;

            default:
                // Default: simple transfer with comment
                body = beginCell()
                    .storeUint(0, 32)
                    .storeStringTail("Stake")
                    .endCell();
        }

        // Add gas for the staking operation
        const gasAmount = toNano("0.05");
        const totalAmount = amount + gasAmount;

        return {
            to: poolAddress,
            value: totalAmount,
            body,
        };
    } catch (error) {
        console.error("Failed to build stake transaction:", error);
        return null;
    }
}

/**
 * Execute stake transaction
 */
export async function executeStake(
    pool: StakingPool,
    amountTon: string,
    mnemonic: string[]
): Promise<StakingResult> {
    try {
        // Build transaction
        const txParams = await buildStakeTransaction(pool, amountTon);
        if (!txParams) {
            return { success: false, error: "Failed to build stake transaction" };
        }

        // Initialize clients
        const tonApiClient = new TonApiClient({
            baseUrl: "https://tonapi.io",
        });
        const contractAdapter = new ContractAdapter(tonApiClient);

        // Create wallet from mnemonic
        const keyPair = await mnemonicToPrivateKey(mnemonic);
        const wallet = WalletContractV5R1.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
        });
        const contract = contractAdapter.open(wallet);

        // Get current seqno
        const seqno = await contract.getSeqno();

        // Send transaction
        await contract.sendTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
            messages: [
                internal({
                    to: txParams.to,
                    value: txParams.value,
                    body: txParams.body,
                }),
            ],
        });

        // Calculate estimated liquid tokens (1:1 ratio for simplicity)
        // In production, query the actual exchange rate from the pool contract
        const estimatedLiquidTokens = amountTon;

        return {
            success: true,
            estimatedLiquidTokens,
        };
    } catch (error) {
        console.error("Stake execution failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Transaction failed",
        };
    }
}

/**
 * Build unstake transaction
 * For liquid staking, unstake means burning the liquid token to get TON back
 */
export async function buildUnstakeTransaction(
    pool: StakingPool,
    liquidTokenAmount: string,
    userWalletAddress: string,
    jettonWalletAddress: string
): Promise<{
    to: Address;
    value: bigint;
    body: Cell;
} | null> {
    try {
        const amount = toNano(liquidTokenAmount);
        const jettonWallet = Address.parse(jettonWalletAddress);

        // Build burn body - standard jetton burn message
        const body = beginCell()
            .storeUint(0x595f07bc, 32) // op: burn
            .storeUint(0, 64) // query_id
            .storeCoins(amount) // amount to burn
            .storeAddress(Address.parse(userWalletAddress)) // response_destination
            .storeUint(0, 1) // custom_payload (empty)
            .endCell();

        return {
            to: jettonWallet,
            value: toNano("0.1"), // Gas for burn
            body,
        };
    } catch (error) {
        console.error("Failed to build unstake transaction:", error);
        return null;
    }
}

/**
 * Fetch live APY data from staking pools
 * In production, this would query on-chain or API data
 */
export async function fetchLiveApyData(): Promise<Map<string, number>> {
    const apyData = new Map<string, number>();
    
    try {
        // For now, return static APY with small variations
        // In production, query from:
        // - TON Stakers API
        // - Bemo smart contract
        // - Hipo smart contract
        for (const pool of STAKING_POOLS) {
            // Simulate APY variation
            const variation = (Math.random() - 0.5) * 0.4; // ±0.2%
            apyData.set(pool.id, pool.apy + variation);
        }
    } catch (error) {
        console.error("Failed to fetch live APY:", error);
        // Fall back to static values
        for (const pool of STAKING_POOLS) {
            apyData.set(pool.id, pool.apy);
        }
    }
    
    return apyData;
}

/**
 * Calculate estimated rewards
 */
export function calculateRewards(
    stakedAmount: number,
    apy: number
): {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
} {
    const yearlyRewards = stakedAmount * (apy / 100);
    return {
        daily: yearlyRewards / 365,
        weekly: yearlyRewards / 52,
        monthly: yearlyRewards / 12,
        yearly: yearlyRewards,
    };
}

/**
 * Get staking pool by ID
 */
export function getPoolById(poolId: string): StakingPool | undefined {
    return STAKING_POOLS.find(p => p.id === poolId);
}

/**
 * Validate stake amount
 */
export function validateStakeAmount(
    pool: StakingPool,
    amountTon: number,
    availableBalance: number
): { valid: boolean; error?: string } {
    if (amountTon <= 0) {
        return { valid: false, error: "Please enter a valid amount" };
    }
    
    if (amountTon < pool.minStake) {
        return { valid: false, error: `Minimum stake is ${pool.minStake} TON` };
    }
    
    // Reserve 0.1 TON for gas
    const maxAvailable = availableBalance - 0.1;
    if (amountTon > maxAvailable) {
        return { valid: false, error: "Insufficient balance (keeping 0.1 TON for gas)" };
    }
    
    return { valid: true };
}
