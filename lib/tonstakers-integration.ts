"use client";

/**
 * TON Stakers SDK Integration
 * 
 * This module provides a wrapper around the tonstakers-sdk that works with our
 * mnemonic-based wallet system. It creates a custom wallet connector that
 * implements the IWalletConnector interface expected by the SDK.
 */

import { Tonstakers } from "tonstakers-sdk";
import { toNano, Address, Cell, internal, external, beginCell, storeMessage } from "@ton/core";
import { WalletContractV5R1, WalletContractV4, WalletContractV3R2 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { getContractAdapter as getCentralAdapter } from "@/lib/ton-api";
import { env } from "@/env";

// Custom wallet connector interface matching tonstakers-sdk expectations
interface WalletConnectorLike {
    wallet: {
        account?: {
            address: string;
            chain: string;
        };
    };
    sendTransaction: (transactionDetails: {
        validUntil: number;
        messages: Array<{
            address: string;
            amount: string;
            payload: string;
        }>;
    }) => Promise<{ boc: string }>;
    onStatusChange: (callback: (wallet: unknown) => void) => void;
}

// Staking pool info from TON Stakers
export interface TonStakersInfo {
    apy: number;
    tvl: number;
    stakersCount: number;
    stakedBalance: number;
    availableBalance: number;
    instantLiquidity: number;
    rates: {
        TONUSD: number;
        tsTONTON: number;
        tsTONTONProjected: number;
    };
}

// Result from staking operation
export interface StakingOperationResult {
    success: boolean;
    txHash?: string;
    error?: string;
}

// Create a custom wallet connector for our mnemonic-based wallet
function createWalletConnector(
    walletAddress: string,
    mnemonic: string[],
    isTestnet: boolean = false,
    telegramId: string = ""
): WalletConnectorLike {
    let statusCallback: ((wallet: any) => void) | null = null;

    return {
        wallet: {
            account: {
                address: walletAddress,
                chain: isTestnet ? "-3" : "-239", // TON chain IDs
            },
        },
        
        sendTransaction: async (transactionDetails) => {
            // Get keypair from mnemonic
            const keypair = await mnemonicToPrivateKey(mnemonic);
            
            // Get the stored wallet version to create the correct wallet contract
            const storedVersion = localStorage.getItem(`quantum_wallet_version_${telegramId}`) || "v5r1";
            let wallet;
            switch (storedVersion) {
                case "v4r2":
                    wallet = WalletContractV4.create({ workchain: 0, publicKey: keypair.publicKey });
                    break;
                case "v3r2":
                    wallet = WalletContractV3R2.create({ workchain: 0, publicKey: keypair.publicKey });
                    break;
                case "v5r1":
                default:
                    wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keypair.publicKey });
                    break;
            }

            const adapter = isTestnet
                ? new ContractAdapter(new TonApiClient({ baseUrl: "https://testnet.tonapi.io", apiKey: env.NEXT_PUBLIC_TONAPI_KEY }))
                : getCentralAdapter();
            const contract = adapter.open(wallet);
            
            // Get seqno
            let seqno = 0;
            try {
                seqno = await contract.getSeqno();
            } catch {
                seqno = 0;
            }
            
            // Build internal messages from transaction details
            const messages = transactionDetails.messages.map(msg => {
                let body: Cell | undefined;
                if (msg.payload) {
                    try {
                        body = Cell.fromBase64(msg.payload);
                    } catch {
                        // payload might be empty or invalid
                    }
                }
                
                return internal({
                    to: Address.parse(msg.address),
                    value: BigInt(msg.amount),
                    body,
                    bounce: false,
                });
            });
            
            // Create transfer (use type assertion due to varying wallet contract signatures)
            const transfer = (wallet as any).createTransfer({
                seqno,
                secretKey: keypair.secretKey,
                messages,
                sendMode: 3, // PAY_GAS_SEPARATELY + IGNORE_ERRORS
            }) as Cell;
            
            // Build external message
            const externalMsg = external({
                to: wallet.address,
                init: seqno === 0 ? wallet.init : undefined,
                body: transfer,
            });
            
            // Serialize to BOC
            const boc = beginCell().store(storeMessage(externalMsg)).endCell().toBoc();
            const bocBase64 = boc.toString("base64");
            
            // Send transaction using our server-side proxy
            const { sendBlockchainMessage } = await import("./tonapi-client");
            await sendBlockchainMessage(bocBase64, isTestnet);
            
            return { boc: bocBase64 };
        },
        
        onStatusChange: (callback) => {
            statusCallback = callback;
            // Immediately notify that wallet is connected
            if (statusCallback) {
                statusCallback({
                    account: {
                        address: walletAddress,
                        chain: isTestnet ? "-3" : "-239",
                    },
                });
            }
        },
    };
}

// Singleton instance for TON Stakers
let tonstakersInstance: Tonstakers | null = null;
let currentWalletAddress: string | null = null;

/**
 * Initialize or get TON Stakers SDK instance
 */
export async function getTonStakers(
    walletAddress: string,
    mnemonic: string[],
    isTestnet: boolean = false,
    telegramId: string = ""
): Promise<Tonstakers> {
    // If instance exists with same wallet, return it
    if (tonstakersInstance && currentWalletAddress === walletAddress) {
        return tonstakersInstance;
    }

    // Create new instance
    const connector = createWalletConnector(walletAddress, mnemonic, isTestnet, telegramId);
    
    tonstakersInstance = new Tonstakers({
        connector: connector as any,
        tonApiKey: env.NEXT_PUBLIC_TONAPI_KEY,
    });
    
    currentWalletAddress = walletAddress;
    
    // Wait for initialization
    await new Promise<void>((resolve) => {
        const checkReady = () => {
            if (tonstakersInstance?.ready) {
                resolve();
            } else {
                setTimeout(checkReady, 100);
            }
        };
        // Give it a moment to initialize
        setTimeout(checkReady, 500);
    });
    
    return tonstakersInstance;
}

/**
 * Get TON Stakers pool information
 */
export async function getTonStakersInfo(
    walletAddress: string,
    mnemonic: string[],
    isTestnet: boolean = false,
    telegramId: string = ""
): Promise<TonStakersInfo> {
    const sdk = await getTonStakers(walletAddress, mnemonic, isTestnet, telegramId);
    
    const [apy, tvl, stakersCount, stakedBalance, availableBalance, instantLiquidity, rates] = await Promise.all([
        sdk.getCurrentApy(),
        sdk.getTvl(),
        sdk.getStakersCount(),
        sdk.getStakedBalance().catch(() => 0),
        sdk.getAvailableBalance().catch(() => 0),
        sdk.getInstantLiquidity(),
        sdk.getRates(),
    ]);
    
    return {
        apy,
        tvl,
        stakersCount,
        stakedBalance,
        availableBalance,
        instantLiquidity,
        rates,
    };
}

/**
 * Stake TON using TON Stakers SDK
 */
export async function stakeTon(
    amount: string,
    walletAddress: string,
    mnemonic: string[],
    isTestnet: boolean = false,
    telegramId: string = ""
): Promise<StakingOperationResult> {
    try {
        const sdk = await getTonStakers(walletAddress, mnemonic, isTestnet, telegramId);
        const amountNano = toNano(amount);
        
        const result = await sdk.stake(amountNano);
        
        return {
            success: true,
            txHash: result.boc ? Cell.fromBase64(result.boc).hash().toString("hex") : undefined,
        };
    } catch (error) {
        console.error("[TonStakers] Stake failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Staking failed",
        };
    }
}

/**
 * Unstake tsTON (standard unstake - best rate, takes ~18-36 hours)
 */
export async function unstakeTsTon(
    amount: string,
    walletAddress: string,
    mnemonic: string[],
    isTestnet: boolean = false,
    telegramId: string = ""
): Promise<StakingOperationResult> {
    try {
        const sdk = await getTonStakers(walletAddress, mnemonic, isTestnet, telegramId);
        const amountNano = toNano(amount);
        
        const result = await sdk.unstakeBestRate(amountNano);
        
        return {
            success: true,
            txHash: result.boc ? Cell.fromBase64(result.boc).hash().toString("hex") : undefined,
        };
    } catch (error) {
        console.error("[TonStakers] Unstake failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unstaking failed",
        };
    }
}

/**
 * Instant unstake tsTON (lower rate, but immediate)
 */
export async function unstakeInstantTsTon(
    amount: string,
    walletAddress: string,
    mnemonic: string[],
    isTestnet: boolean = false,
    telegramId: string = ""
): Promise<StakingOperationResult> {
    try {
        const sdk = await getTonStakers(walletAddress, mnemonic, isTestnet, telegramId);
        const amountNano = toNano(amount);
        
        const result = await sdk.unstakeInstant(amountNano);
        
        return {
            success: true,
            txHash: result.boc ? Cell.fromBase64(result.boc).hash().toString("hex") : undefined,
        };
    } catch (error) {
        console.error("[TonStakers] InstantUnstake failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Instant unstaking failed",
        };
    }
}

/**
 * Get active withdrawal NFTs (pending unstakes)
 */
export async function getActiveWithdrawals(
    walletAddress: string,
    mnemonic: string[],
    isTestnet: boolean = false,
    telegramId: string = ""
) {
    try {
        const sdk = await getTonStakers(walletAddress, mnemonic, isTestnet, telegramId);
        return await sdk.getActiveWithdrawalNFTs();
    } catch (error) {
        console.error("[TonStakers] GetActiveWithdrawals failed:", error);
        return [];
    }
}
