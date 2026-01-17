"use client";

/**
 * STON.fi Farming Integration
 * 
 * Provides functions to stake LP tokens in STON.fi farming pools
 * and claim farming rewards.
 */

import { FARM, FARM_VERSION } from "@ston-fi/sdk";
import { StonApiClient } from "@ston-fi/api";
import { TonClient, SendMode } from "@ton/ton";
import { toNano, internal } from "@ton/core";
import { WalletContractV5R1 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";

// Farm pool info
export interface FarmPool {
    address: string;
    lpAddress: string;
    rewardTokenAddress: string;
    poolName: string;
    apr?: number;
    tvl?: number;
    minStake?: string;
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

// Initialize TON client
function getTonClient(isTestnet: boolean = false) {
    return new TonClient({
        endpoint: isTestnet 
            ? "https://testnet.toncenter.com/api/v2/jsonRPC"
            : "https://toncenter.com/api/v2/jsonRPC",
    });
}

// Get wallet from mnemonic
async function getWallet(mnemonic: string[], tonClient: TonClient) {
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
    });
    return {
        wallet,
        keyPair,
        contract: tonClient.open(wallet),
        address: wallet.address,
    };
}

/**
 * Fetch available farming pools from STON.fi API
 */
export async function fetchFarmingPools(): Promise<FarmPool[]> {
    try {
        const stonApi = new StonApiClient();
        const farms = await stonApi.getFarms({});
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return farms.map((farm: any) => {
            // STON.fi API returns APY as a decimal (e.g., 0.25 = 25%)
            let apr = farm.apy ? parseFloat(farm.apy) * 100 : undefined;
            
            // Cap unrealistic APR values at 1000% (some pools have extreme values)
            if (apr !== undefined && apr > 1000) {
                apr = undefined; // Hide pools with unrealistic APR
            }
            
            return {
                address: farm.minterAddress || "",
                lpAddress: farm.lpTokenMinter || "",
                rewardTokenAddress: farm.rewards?.[0]?.address || "",
                poolName: `Farm ${farm.minterAddress?.slice(0, 8) || "Unknown"}`,
                apr,
                tvl: farm.tvl ? parseFloat(farm.tvl) : undefined,
                minStake: farm.minStakeDurationS || "0",
            };
        }).filter(f => f.apr === undefined || f.apr <= 1000); // Filter out extreme APRs
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
    userAddress: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isTestnet: boolean = false
): Promise<FarmPosition[]> {
    try {
        const stonApi = new StonApiClient();
        const farms = await stonApi.getFarms({});
        const positions: FarmPosition[] = [];
        
        // Check each farm for user's NFT positions from API response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const farm of farms as any[]) {
            // Check if user has NFT positions in this farm
            if (farm.nftInfos && farm.nftInfos.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        const tonClient = getTonClient(isTestnet);
        const { keyPair, contract, address } = await getWallet(mnemonic, tonClient);
        
        // Get farm NFT minter contract
        const farmNftMinter = tonClient.open(
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
        const tonClient = getTonClient(isTestnet);
        const { keyPair, contract } = await getWallet(mnemonic, tonClient);
        
        // Get farm NFT item contract
        const farmNftItem = tonClient.open(
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
        const tonClient = getTonClient(isTestnet);
        const { keyPair, contract } = await getWallet(mnemonic, tonClient);
        
        // Get farm NFT item contract
        const farmNftItem = tonClient.open(
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
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Export FARM_VERSION for reference
export { FARM_VERSION };
