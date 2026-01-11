/**
 * Unified TON API utilities using Orbs Network
 * 
 * Orbs Network provides decentralized, rate-limit-free access to TON.
 * This module centralizes all TON API calls to avoid hitting rate limits.
 * 
 * @see https://www.orbs.com/ton-access
 */

import { TonClient, Address } from "@ton/ton";
import { getHttpEndpoint } from "@orbs-network/ton-access";

// =====================================================
// Configuration
// =====================================================

const NETWORK = (process.env.NEXT_PUBLIC_TON_NETWORK || "mainnet") as "mainnet" | "testnet";
const IS_TESTNET = NETWORK === "testnet";

// Cache for Orbs endpoints
let cachedEndpoint: string | null = null;
let cachedClient: TonClient | null = null;
let initPromise: Promise<TonClient> | null = null;

// =====================================================
// Core Client Management
// =====================================================

/**
 * Get the Orbs Network endpoint (cached)
 */
export async function getOrbsEndpoint(): Promise<string> {
    if (cachedEndpoint) return cachedEndpoint;
    
    cachedEndpoint = await getHttpEndpoint({ network: NETWORK });
    console.log(`[TON-API] Using Orbs endpoint: ${cachedEndpoint}`);
    return cachedEndpoint;
}

/**
 * Get or create a TonClient using Orbs Network
 * This is rate-limit-free and decentralized
 */
export async function getTonClient(): Promise<TonClient> {
    if (cachedClient) return cachedClient;
    
    // Prevent multiple simultaneous initializations
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        const endpoint = await getOrbsEndpoint();
        cachedClient = new TonClient({ endpoint });
        return cachedClient;
    })();
    
    return initPromise;
}

/**
 * Create a new TonClient synchronously with fallback
 * Used for initial render before async client is ready
 */
export function createTonClientSync(): TonClient {
    return new TonClient({
        endpoint: IS_TESTNET
            ? "https://testnet.toncenter.com/api/v2/jsonRPC"
            : "https://toncenter.com/api/v2/jsonRPC",
    });
}

// =====================================================
// Account Queries (replaces TONAPI calls)
// =====================================================

export interface AccountInfo {
    address: string;
    balance: bigint;
    status: "active" | "uninit" | "frozen" | "nonexist";
    lastTransactionLt: bigint | null;
    lastTransactionHash: string | null;
}

/**
 * Get account info (balance, status, etc.) using Orbs
 * Replaces: tonapi.io/v2/accounts/{address}
 */
export async function getAccountInfo(address: string): Promise<AccountInfo | null> {
    try {
        const client = await getTonClient();
        const addr = Address.parse(address);
        const state = await client.getContractState(addr);
        
        return {
            address: addr.toString(),
            balance: state.balance,
            status: state.state as "active" | "uninit" | "frozen" | "nonexist",
            lastTransactionLt: state.lastTransaction?.lt ? BigInt(state.lastTransaction.lt) : null,
            lastTransactionHash: state.lastTransaction?.hash ?? null,
        };
    } catch (error) {
        console.error(`[TON-API] Failed to get account info for ${address}:`, error);
        return null;
    }
}

/**
 * Get account balance in nanoTON
 * Replaces direct balance queries to tonapi.io
 */
export async function getBalance(address: string): Promise<bigint> {
    try {
        const client = await getTonClient();
        const addr = Address.parse(address);
        const balance = await client.getBalance(addr);
        return balance;
    } catch (error) {
        console.error(`[TON-API] Failed to get balance for ${address}:`, error);
        return BigInt(0);
    }
}

/**
 * Check if a contract is deployed and active
 * Replaces: tonapi.io/v2/accounts/{address} status check
 */
export async function isContractActive(address: string): Promise<boolean> {
    try {
        const client = await getTonClient();
        const addr = Address.parse(address);
        const state = await client.getContractState(addr);
        return state.state === "active";
    } catch (error) {
        console.error(`[TON-API] Failed to check contract status for ${address}:`, error);
        return false;
    }
}

// =====================================================
// Contract Queries (GET Methods)
// =====================================================

/**
 * Run a GET method on a contract
 * This is the core primitive for reading contract state
 */
export async function runGetMethod(
    address: string,
    method: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args?: any[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    try {
        const client = await getTonClient();
        const addr = Address.parse(address);
        const result = await client.runMethod(addr, method, args);
        return result;
    } catch (error) {
        // Don't log expected errors (contract doesn't exist, etc.)
        const msg = error instanceof Error ? error.message : "";
        if (!msg.includes("exit_code: -13") && !msg.includes("exit code: -13")) {
            console.error(`[TON-API] GET method ${method} failed for ${address}:`, error);
        }
        throw error;
    }
}

// =====================================================
// Jetton-Specific Queries
// =====================================================

export interface JettonInfo {
    totalSupply: bigint;
    mintable: boolean;
    adminAddress: string;
}

/**
 * Get Jetton master data (TEP-74: get_jetton_data)
 * Replaces: tonapi.io/v2/jettons/{address}
 */
export async function getJettonInfo(jettonAddress: string): Promise<JettonInfo | null> {
    try {
        const result = await runGetMethod(jettonAddress, "get_jetton_data");
        
        return {
            totalSupply: result.stack.readBigNumber(),
            mintable: result.stack.readNumber() === -1,
            adminAddress: result.stack.readAddress()?.toString() ?? "",
        };
    } catch {
        return null;
    }
}

/**
 * Get jetton wallet address for an owner
 * Replaces: tonapi.io queries for wallet address
 */
export async function getJettonWalletAddress(
    jettonMasterAddress: string,
    ownerAddress: string
): Promise<string | null> {
    try {
        const client = await getTonClient();
        const { beginCell } = await import("@ton/core");
        
        const ownerSlice = {
            type: "slice" as const,
            cell: beginCell().storeAddress(Address.parse(ownerAddress)).endCell(),
        };
        
        const result = await client.runMethod(
            Address.parse(jettonMasterAddress),
            "get_wallet_address",
            [ownerSlice]
        );
        
        const walletAddress = result.stack.readAddress();
        return walletAddress?.toString() ?? null;
    } catch {
        return null;
    }
}

/**
 * Get jetton balance for an owner
 * Replaces: tonapi.io/v2/accounts/{address}/jettons
 */
export async function getJettonBalanceForOwner(
    jettonMasterAddress: string,
    ownerAddress: string
): Promise<bigint> {
    try {
        const walletAddress = await getJettonWalletAddress(jettonMasterAddress, ownerAddress);
        if (!walletAddress) return BigInt(0);
        
        const result = await runGetMethod(walletAddress, "get_wallet_data");
        return result.stack.readBigNumber();
    } catch {
        return BigInt(0);
    }
}

// =====================================================
// Bonding Curve Queries (QC-specific)
// =====================================================

export interface BondingCurveData {
    totalSupply: bigint;
    tonReserve: bigint;
    basePrice: bigint;
    slope: bigint;
    maxSupply: bigint;
    isGraduated: boolean;
    graduationThreshold: bigint;
}

/**
 * Get bonding curve data from QC jetton contract
 * Replaces: tonapi.io/v2/blockchain/accounts/{address}/methods/get_curve_data
 */
export async function getBondingCurveData(jettonAddress: string): Promise<BondingCurveData | null> {
    try {
        const result = await runGetMethod(jettonAddress, "get_curve_data");
        
        return {
            totalSupply: result.stack.readBigNumber(),
            tonReserve: result.stack.readBigNumber(),
            basePrice: result.stack.readBigNumber(),
            slope: result.stack.readBigNumber(),
            maxSupply: result.stack.readBigNumber(),
            isGraduated: result.stack.readNumber() === -1,
            graduationThreshold: result.stack.readBigNumber(),
        };
    } catch {
        return null;
    }
}

/**
 * Preview buy amount from on-chain contract
 */
export async function previewBuy(
    jettonAddress: string,
    tonAmount: bigint
): Promise<bigint | null> {
    try {
        const amountCell = {
            type: "int" as const,
            value: tonAmount,
        };
        
        const result = await runGetMethod(jettonAddress, "preview_buy", [amountCell]);
        return result.stack.readBigNumber();
    } catch {
        return null;
    }
}

/**
 * Preview sell amount from on-chain contract
 */
export async function previewSell(
    jettonAddress: string,
    tokenAmount: bigint
): Promise<bigint | null> {
    try {
        const amountCell = {
            type: "int" as const,
            value: tokenAmount,
        };
        
        const result = await runGetMethod(jettonAddress, "preview_sell", [amountCell]);
        return result.stack.readBigNumber();
    } catch {
        return null;
    }
}

// =====================================================
// Price Data (for wallet page charts)
// =====================================================

/**
 * Get TON price in USD using DeFiLlama (free, no rate limits)
 */
export async function getTonPriceUsd(): Promise<number> {
    try {
        const { fetchTonPrice } = await import("@/lib/price-api");
        return await fetchTonPrice();
    } catch (error) {
        console.error("[TON-API] Error fetching TON price:", error);
        return 0;
    }
}

// =====================================================
// Transaction Broadcasting
// =====================================================

/**
 * Send a BOC (Bag of Cells) to the network
 * Uses Orbs endpoint for broadcasting
 */
export async function sendBoc(boc: Buffer): Promise<void> {
    const client = await getTonClient();
    await client.sendFile(boc);
}

// =====================================================
// DNS Resolution
// =====================================================

/**
 * Resolve TON DNS domain to address
 * Note: DNS resolution requires specialized indexer; 
 * we'll keep using a minimal external call for this specific case
 */
export async function resolveDns(domain: string): Promise<string | null> {
    try {
        // DNS resolution requires indexed data, using tonconsole as fallback
        const response = await fetch(
            `https://tonconsole.com/api/v1/dns/resolve?domain=${encodeURIComponent(domain)}`,
            { next: { revalidate: 300 } } // Cache for 5 minutes
        );
        
        if (!response.ok) return null;
        
        const data = await response.json();
        return data.address ?? null;
    } catch {
        return null;
    }
}

// =====================================================
// Utility Exports
// =====================================================

export const TON_NETWORK = NETWORK;
export const IS_TON_TESTNET = IS_TESTNET;
