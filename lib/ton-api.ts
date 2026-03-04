/**
 * Unified TON API utilities using TonAPI
 * 
 * TonAPI provides reliable, fast access to TON blockchain.
 * This module centralizes all TON API calls.
 * 
 * @see https://tonapi.io
 */

import { Address } from "@ton/core";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { env } from "@/env";

// =====================================================
// Configuration
// =====================================================

const NETWORK = env.NEXT_PUBLIC_TON_NETWORK;
const IS_TESTNET = NETWORK === "testnet";

// Cache for TonAPI client and adapter
let cachedTonApiClient: TonApiClient | null = null;
let cachedContractAdapter: ContractAdapter | null = null;

// =====================================================
// Core Client Management
// =====================================================

/**
 * Get TonAPI client (cached)
 * Includes API key for authenticated rate limits (server uses TONAPI_KEY, client uses NEXT_PUBLIC_TONAPI_KEY)
 */
export function getTonApiClient(): TonApiClient {
    if (cachedTonApiClient) return cachedTonApiClient;

    const apiKey =
      typeof window === "undefined" ? env.TONAPI_KEY ?? env.NEXT_PUBLIC_TONAPI_KEY : env.NEXT_PUBLIC_TONAPI_KEY;
    cachedTonApiClient = new TonApiClient({
        baseUrl: IS_TESTNET ? "https://testnet.tonapi.io" : "https://tonapi.io",
        ...(apiKey ? { apiKey } : {}),
    });
    return cachedTonApiClient;
}

/**
 * Get or create a ContractAdapter using TonAPI
 * @deprecated Use getContractAdapter from jetton-operations instead
 */
export async function getTonClient(): Promise<ContractAdapter> {
    return getContractAdapter();
}

/**
 * Get ContractAdapter for blockchain operations
 */
export function getContractAdapter(): ContractAdapter {
    if (cachedContractAdapter) return cachedContractAdapter;
    
    cachedContractAdapter = new ContractAdapter(getTonApiClient());
    return cachedContractAdapter;
}

/**
 * Create a new ContractAdapter synchronously
 * Used for initial render before async client is ready
 */
export function createTonClientSync(): ContractAdapter {
    return getContractAdapter();
}

// =====================================================
// Account Queries (using TonAPI REST)
// =====================================================

export interface AccountInfo {
    address: string;
    balance: bigint;
    status: "active" | "uninit" | "frozen" | "nonexist";
    lastActivity: number | null; // Unix timestamp of last activity
}

/**
 * Get account info (balance, status, etc.) using TonAPI
 */
export async function getAccountInfo(address: string): Promise<AccountInfo | null> {
    try {
        const client = getTonApiClient();
        const account = await client.accounts.getAccount(Address.parse(address));
        
        return {
            address: account.address.toString(),
            balance: account.balance,
            status: account.status,
            lastActivity: account.lastActivity ?? null,
        };
    } catch (error) {
        console.error(`[TON-API] Failed to get account info for ${address}:`, error);
        return null;
    }
}

/**
 * Get account balance in nanoTON
 */
export async function getBalance(address: string): Promise<bigint> {
    try {
        const client = getTonApiClient();
        const account = await client.accounts.getAccount(Address.parse(address));
        return account.balance;
    } catch (error) {
        console.error(`[TON-API] Failed to get balance for ${address}:`, error);
        return BigInt(0);
    }
}

/**
 * Check if a contract is deployed and active
 */
export async function isContractActive(address: string): Promise<boolean> {
    try {
        const client = getTonApiClient();
        const account = await client.accounts.getAccount(Address.parse(address));
        return account.status === "active";
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
    args?: any[]
): Promise<any> {
    try {
        const adapter = getContractAdapter();
        const addr = Address.parse(address);
        const provider = adapter.provider(addr);
        const result = await provider.get(method, args ?? []);
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
 */
export async function getJettonWalletAddress(
    jettonMasterAddress: string,
    ownerAddress: string
): Promise<string | null> {
    try {
        const adapter = getContractAdapter();
        const { beginCell } = await import("@ton/core");
        
        const ownerSlice = {
            type: "slice" as const,
            cell: beginCell().storeAddress(Address.parse(ownerAddress)).endCell(),
        };
        
        const provider = adapter.provider(Address.parse(jettonMasterAddress));
        const result = await provider.get("get_wallet_address", [ownerSlice]);
        
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
 * Uses TonAPI for broadcasting
 */
export async function sendBoc(boc: Buffer): Promise<void> {
    const client = getTonApiClient();
    const { Cell } = await import("@ton/core");
    const cell = Cell.fromBoc(boc)[0];
    await client.blockchain.sendBlockchainMessage({
        boc: cell,
    });
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(
            `https://tonconsole.com/api/v1/dns/resolve?domain=${encodeURIComponent(domain)}`,
            { 
                next: { revalidate: 300 }, // Cache for 5 minutes
                signal: controller.signal
            }
        );
        
        clearTimeout(timeoutId);
        
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
