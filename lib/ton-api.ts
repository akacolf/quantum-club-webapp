/**
 * Unified TON API utilities using Orbs Network
 * 
 * Orbs Network provides decentralized, rate-limit-free access to TON.
 * This module centralizes all TON API calls to avoid hitting rate limits.
 * 
 * IMPORTANT: We use pre-cached Orbs node endpoints to avoid hitting the 
 * discovery API (ton.access.orbs.network) which has CDN rate limits.
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

// Pre-cached Orbs node endpoints (mainnet) - Avoids discovery API rate limits!
// Format: https://ton.access.orbs.network/{NodeId}/1/{network}/toncenter-api-v2/jsonRPC
// NodeIds from verified Orbs nodes. Update periodically if nodes change.
const ORBS_MAINNET_ENDPOINTS = [
    "https://ton.access.orbs.network/4410c0ff5Bd3F8B62C092Ab4D238bEE463E64410/1/mainnet/toncenter-api-v2/jsonRPC",
    "https://ton.access.orbs.network/4411c0ff5Bd3F8B62C092Ab4D238bEE463E64411/1/mainnet/toncenter-api-v2/jsonRPC",
    "https://ton.access.orbs.network/4412c0ff5Bd3F8B62C092Ab4D238bEE463E64412/1/mainnet/toncenter-api-v2/jsonRPC",
    "https://ton.access.orbs.network/55013c0ff5Bd3F8B62C092Ab4D238bEE463E5501/1/mainnet/toncenter-api-v2/jsonRPC",
    "https://ton.access.orbs.network/55023c0ff5Bd3F8B62C092Ab4D238bEE463E5502/1/mainnet/toncenter-api-v2/jsonRPC",
    "https://ton.access.orbs.network/55033c0ff5Bd3F8B62C092Ab4D238bEE463E5503/1/mainnet/toncenter-api-v2/jsonRPC",
];

const ORBS_TESTNET_ENDPOINTS = [
    "https://ton.access.orbs.network/4410c0ff5Bd3F8B62C092Ab4D238bEE463E64410/1/testnet/toncenter-api-v2/jsonRPC",
    "https://ton.access.orbs.network/4411c0ff5Bd3F8B62C092Ab4D238bEE463E64411/1/testnet/toncenter-api-v2/jsonRPC",
    "https://ton.access.orbs.network/55013c0ff5Bd3F8B62C092Ab4D238bEE463E5501/1/testnet/toncenter-api-v2/jsonRPC",
];

// Rotation state
let currentEndpointIndex = 0;
let lastDiscoveryAttempt = 0;
const DISCOVERY_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown for discovery API

// Cache for endpoints
let cachedEndpoint: string | null = null;
let cachedClient: TonClient | null = null;
let initPromise: Promise<TonClient> | null = null;

// =====================================================
// Core Client Management
// =====================================================

/**
 * Get an Orbs endpoint from pre-cached list (NO rate limits!)
 * Rotates between endpoints for load balancing.
 */
function getNextOrbsEndpoint(): string {
    const endpoints = IS_TESTNET ? ORBS_TESTNET_ENDPOINTS : ORBS_MAINNET_ENDPOINTS;
    const endpoint = endpoints[currentEndpointIndex % endpoints.length];
    currentEndpointIndex++;
    return endpoint;
}

/**
 * Get the Orbs Network endpoint (uses pre-cached endpoints)
 * Only calls the discovery API once per hour as fallback.
 */
export async function getOrbsEndpoint(): Promise<string> {
    // Use cached endpoint if available
    if (cachedEndpoint) return cachedEndpoint;
    
    // Try discovery API only if cooldown has passed (to get fresh nodes)
    const now = Date.now();
    if (now - lastDiscoveryAttempt > DISCOVERY_COOLDOWN_MS) {
        lastDiscoveryAttempt = now;
        try {
            cachedEndpoint = await getHttpEndpoint({ network: NETWORK });
            console.log(`[TON-API] Got fresh Orbs endpoint: ${cachedEndpoint}`);
            return cachedEndpoint;
        } catch {
            console.warn("[TON-API] Discovery API unavailable, using pre-cached endpoints");
        }
    }
    
    // Use pre-cached endpoint
    cachedEndpoint = getNextOrbsEndpoint();
    console.log(`[TON-API] Using pre-cached Orbs endpoint: ${cachedEndpoint}`);
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
 * Force get a new TonClient with a different endpoint (for retry scenarios)
 */
export async function getNewTonClient(): Promise<TonClient> {
    const endpoint = getNextOrbsEndpoint();
    console.log(`[TON-API] Creating new client with endpoint: ${endpoint}`);
    return new TonClient({ endpoint });
}

/**
 * Create a new TonClient synchronously with fallback
 * Used for initial render before async client is ready
 */
export function createTonClientSync(): TonClient {
    return new TonClient({
        endpoint: IS_TESTNET 
            ? ORBS_TESTNET_ENDPOINTS[0]
            : ORBS_MAINNET_ENDPOINTS[0],
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
 * Get TON price in USD
 * Note: We still need an external source for fiat prices.
 * Using CoinGecko as they have generous free tier.
 */
export async function getTonPriceUsd(): Promise<number> {
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd",
            { next: { revalidate: 60 } } // Cache for 60 seconds
        );
        
        if (!response.ok) {
            console.warn("[TON-API] Failed to fetch TON price from CoinGecko");
            return 0;
        }
        
        const data = await response.json();
        return data["the-open-network"]?.usd ?? 0;
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
