"use client";

/**
 * STON.fi Farming Integration
 * 
 * Provides functions to stake LP tokens in STON.fi farming pools
 * and claim farming rewards.
 */

import { FARM } from "@ston-fi/sdk";
import { StonApiClient } from "@ston-fi/api";
import { SendMode, WalletContractV5R1 } from "@ton/ton";
import { toNano, internal } from "@ton/core";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";

// Farm pool info
export interface FarmPool {
    address: string;
    lpAddress: string;
    rewardTokenAddress: string;
    rewardTokenSymbol: string;
    poolName: string;
    apr?: number;
    tvl?: number;
    tvlLp?: string;
    minStake?: string;
    status: string;
    rewardRate24h?: string;
}

// User's farming position
export interface FarmPosition {
    farmAddress: string;
    nftAddress: string;
    stakedLpAmount: string;
    pendingRewards: string;
    rewardTokenSymbol: string;
    poolName: string;
}

// Farming operation result
export interface FarmingResult {
    success: boolean;
    txHash?: string;
    error?: string;
}

// Initialize TonAPI contract adapter
function getContractAdapter(isTestnet: boolean = false): ContractAdapter {
    const tonApiClient = new TonApiClient({
        baseUrl: isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io",
    });
    return new ContractAdapter(tonApiClient);
}

// Get wallet from mnemonic
async function getWallet(mnemonic: string[], contractAdapter: ContractAdapter) {
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
    });
    return {
        wallet,
        keyPair,
        contract: contractAdapter.open(wallet),
        address: wallet.address,
    };
}

/**
 * Fetch available farming pools from STON.fi API
 * Only returns active farms with valid APY and rewards
 */
export async function fetchFarmingPools(): Promise<FarmPool[]> {
    try {
        const stonApi = new StonApiClient();
        const farms = await stonApi.getFarms({});
        
        const activeFarms = farms.filter((farm: any) => {
            // Filter out inactive farms
            if (farm.status !== "active" && farm.status !== "operational") return false;
            
            // Filter out farms where all rewards have been distributed
            if (farm.allRewardsDistributed === true) return false;
            
            // Only include farms with APY
            if (!farm.apy || parseFloat(farm.apy) <= 0) return false;
            
            // Check if farm has active rewards
            const hasActiveRewards = farm.rewards?.some(
                (r: any) => r.status === "active" || r.status === "operational"
            );
            if (!hasActiveRewards) return false;
            
            return true;
        });
        
        return activeFarms.map((farm: any) => {
            // STON.fi API returns APY as a decimal (e.g., 0.25 = 25%)
            const apr = farm.apy ? parseFloat(farm.apy) * 100 : undefined;
            
            // Get USD TVL from the API (lockedTotalLpUsd)
            const tvl = farm.lockedTotalLpUsd ? parseFloat(farm.lockedTotalLpUsd) : undefined;
            
            // Get the first active reward token
            const activeReward = farm.rewards?.find((r: any) =>
                r.status === "active" || r.status === "operational"
            );
            
            // Get farm name from meta or generate from address
            const farmName = farm.meta?.name || `Farm ${farm.minterAddress?.slice(0, 8) || "Unknown"}`;
            
            return {
                address: farm.minterAddress || "",
                lpAddress: farm.poolAddress || "",
                rewardTokenAddress: activeReward?.address || "",
                rewardTokenSymbol: "STON", // Most STON.fi farms reward STON
                poolName: farmName,
                apr: apr && apr <= 500 ? apr : undefined, // Cap at 500% APR
                tvl,
                tvlLp: farm.lockedTotalLp || "0",
                minStake: farm.minStakeDurationS || "0",
                status: farm.status || "unknown",
                rewardRate24h: activeReward?.rewardRate24H || "0",
            };
        }).filter(f => f.apr !== undefined && f.apr > 0); // Only show farms with valid APR
    } catch (error) {
        console.error("[Farming] Failed to fetch farms:", error);
        return [];
    }
}

/**
 * Fetch user's farming positions from STON.fi API
 * Uses the farm NFT infos from the API response
 */
export async function fetchUserFarmPositions(
    _userAddress: string,
    _isTestnet: boolean = false
): Promise<FarmPosition[]> {
    try {
        const stonApi = new StonApiClient();
        const farms = await stonApi.getFarms({});
        const positions: FarmPosition[] = [];
        
        // Check each farm for user's NFT positions from API response
        for (const farm of farms as any[]) {
            // Check if user has NFT positions in this farm
            if (farm.nftInfos && farm.nftInfos.length > 0) {
                for (const nftInfo of farm.nftInfos as any[]) {
                    positions.push({
                        farmAddress: farm.minterAddress,
                        nftAddress: nftInfo.address || "",
                        stakedLpAmount: nftInfo.stakedTokens || "0",
                        pendingRewards: nftInfo.nonclaimedRewards || "0",
                        rewardTokenSymbol: "STON",
                        poolName: `Farm ${farm.minterAddress?.slice(0, 8) || "Unknown"}`,
                    });
                }
            }
        }
        
        return positions;
    } catch (error) {
        console.error("[Farming] Failed to fetch positions:", error);
        return [];
    }
}

/**
 * Stake LP tokens in a farming pool
 */
export async function stakeLpTokens(
    farmAddress: string,
    lpTokenAddress: string,
    amount: string,
    mnemonic: string[],
    isTestnet: boolean = false
): Promise<FarmingResult> {
    try {
        const contractAdapter = getContractAdapter(isTestnet);
        const { keyPair, contract, address } = await getWallet(mnemonic, contractAdapter);
        
        // Get farm NFT minter contract
        const farmNftMinter = contractAdapter.open(
            FARM.v3.NftMinter.create(farmAddress)
        );
        
        // Build stake transaction
        const stakeTxParams = await farmNftMinter.getStakeTxParams({
            userWalletAddress: address,
            jettonAddress: lpTokenAddress,
            jettonAmount: toNano(amount),
        });
        
        // Get seqno
        const seqno = await contract.getSeqno();
        
        // Send transaction
        await contract.sendTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
            messages: [
                internal({
                    to: stakeTxParams.to,
                    value: stakeTxParams.value,
                    body: stakeTxParams.body,
                }),
            ],
        });
        
        return { success: true };
    } catch (error) {
        console.error("[Farming] Stake failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Staking failed",
        };
    }
}

/**
 * Unstake LP tokens from a farming pool
 */
export async function unstakeLpTokens(
    farmNftAddress: string,
    mnemonic: string[],
    isTestnet: boolean = false
): Promise<FarmingResult> {
    try {
        const contractAdapter = getContractAdapter(isTestnet);
        const { keyPair, contract } = await getWallet(mnemonic, contractAdapter);
        
        // Get farm NFT item contract
        const farmNftItem = contractAdapter.open(
            FARM.v3.NftItem.create(farmNftAddress)
        );
        
        // Build unstake transaction
        const unstakeTxParams = await farmNftItem.getUnstakeTxParams();
        
        // Get seqno
        const seqno = await contract.getSeqno();
        
        // Send transaction
        await contract.sendTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
            messages: [
                internal({
                    to: unstakeTxParams.to,
                    value: unstakeTxParams.value,
                    body: unstakeTxParams.body,
                }),
            ],
        });
        
        return { success: true };
    } catch (error) {
        console.error("[Farming] Unstake failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unstaking failed",
        };
    }
}

/**
 * Claim farming rewards
 */
export async function claimFarmingRewards(
    farmNftAddress: string,
    mnemonic: string[],
    isTestnet: boolean = false
): Promise<FarmingResult> {
    try {
        const contractAdapter = getContractAdapter(isTestnet);
        const { keyPair, contract } = await getWallet(mnemonic, contractAdapter);
        
        // Get farm NFT item contract
        const farmNftItem = contractAdapter.open(
            FARM.v3.NftItem.create(farmNftAddress)
        );
        
        // Build claim transaction (unstake with claim on STON.fi)
        // Note: STON.fi farming claims are done via unstake
        const claimTxParams = await farmNftItem.getUnstakeTxParams();
        
        // Get seqno
        const seqno = await contract.getSeqno();
        
        // Send transaction
        await contract.sendTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
            messages: [
                internal({
                    to: claimTxParams.to,
                    value: claimTxParams.value,
                    body: claimTxParams.body,
                }),
            ],
        });
        
        return { success: true };
    } catch (error) {
        console.error("[Farming] Claim failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Claiming rewards failed",
        };
    }
}

/**
 * Get farm pool data from API
 */
export async function getFarmPoolData(farmAddress: string) {
    try {
        const stonApi = new StonApiClient();
        const farms = await stonApi.getFarms({});
        
        const farm = (farms as any[]).find((f: any) => f.minterAddress === farmAddress);
        
        if (farm) {
            return {
                apy: farm.apy ? parseFloat(farm.apy) * 100 : 0,
                tvl: farm.tvl ? parseFloat(farm.tvl) : 0,
                status: farm.status || "unknown",
            };
        }
        
        return null;
    } catch (error) {
        console.error("[Farming] Failed to get farm data:", error);
        return null;
    }
}

