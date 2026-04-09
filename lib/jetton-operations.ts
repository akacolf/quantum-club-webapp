/**
 * QC RocketStart - On-Chain Jetton Operations
 * 
 * Complete TEP-74 compliant Jetton operations integrated with QC Wallet
 * 
 * TEP-74: https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md
 */

import {
    Address,
    beginCell,
    Cell,
    TupleItemSlice
} from "@ton/core";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { getContractAdapter as getCentralAdapter } from "@/lib/ton-api";
import { env } from "@/env";

// =====================================================
// Operation Codes (TEP-74 Standard + Blum/BigPump Compatible)
// =====================================================
const JettonOps = {
    // Standard TEP-74 ops
    TRANSFER: 0xf8a7ea5,
    TRANSFER_NOTIFICATION: 0x7362d09c,
    INTERNAL_TRANSFER: 0x178d4519,
    EXCESSES: 0xd53276db,
    BURN: 0x595f07bc,
    BURN_NOTIFICATION: 0x7bdd97de,

    // Custom trading ops (Blum/BigPump compatible)
    BUY: 0xaf750d34,            // Buy tokens via bonding curve
    SELL_REQUEST: 0x742b36d8,   // Sell request (sent to jetton wallet)
    SELL_NOTIFICATION: 0xb7e76bfd, // Sell notification from wallet to master
    FEE_COMMENT: 0xfdaa7c9d,    // Fee transfer comment
    WITHDRAW_FEES: 0x46454553,  // Deprecated - fees sent directly now
    GRADUATE: 0x47524144,
} as const;

// =====================================================
// Types
// =====================================================
interface JettonWalletData {
    balance: bigint;
    ownerAddress: string;
    jettonMasterAddress: string;
    walletCode: Cell;
}

export interface BondingCurveData {
    totalSupply: bigint;
    tonReserve: bigint;
    currentPrice: bigint;
    graduated: boolean;
    graduationTarget: bigint;
}


// =====================================================
// Message Builders (TEP-74 Compliant)
// =====================================================

/**
 * Build burn message (op 0x595f07bc)
 * Used to sell tokens back to bonding curve
 */
export function buildBurnMessage(params: {
    queryId?: bigint;
    amount: bigint;
    responseDestination: Address;
    customPayload?: Cell;
}): Cell {
    const builder = beginCell()
        .storeUint(JettonOps.BURN, 32)
        .storeUint(params.queryId ?? BigInt(0), 64)
        .storeCoins(params.amount)
        .storeAddress(params.responseDestination);

    // Custom payload (Maybe ^Cell)
    if (params.customPayload) {
        builder.storeBit(true).storeRef(params.customPayload);
    } else {
        builder.storeBit(false);
    }

    return builder.endCell();
}

/**
 * Build buy message for bonding curve purchase
 * Send this TO the Jetton Master with TON attached
 */
export function buildBuyMessage(params: {
    queryId?: bigint;
    minTokensOut?: bigint; // Slippage protection
}): Cell {
    return beginCell()
        .storeUint(JettonOps.BUY, 32)
        .storeUint(params.queryId ?? BigInt(0), 64)
        .storeCoins(params.minTokensOut ?? BigInt(0)) // 0 = no slippage check
        .endCell();
}

/**
 * Build withdraw fees message (admin/creator only)
 */
export function buildWithdrawFeesMessage(params: {
    queryId?: bigint;
}): Cell {
    return beginCell()
        .storeUint(JettonOps.WITHDRAW_FEES, 32)
        .storeUint(params.queryId ?? BigInt(0), 64)
        .endCell();
}

/**
 * Build graduation message (triggers DEX listing)
 * dexRouterAddress is required — the contract reads it from the message body
 */
export function buildGraduateMessage(params: {
    queryId?: bigint;
    dexRouterAddress: Address;
}): Cell {
    return beginCell()
        .storeUint(JettonOps.GRADUATE, 32)
        .storeUint(params.queryId ?? BigInt(0), 64)
        .storeAddress(params.dexRouterAddress)
        .endCell();
}

/**
 * Build standard TEP-74 jetton transfer message (op 0xf8a7ea5).
 * Sent FROM the sender's jetton wallet TO transfer jettons to a new owner.
 *
 * Per TEP-74:
 *   transfer#0f8a7ea5
 *     query_id:uint64
 *     amount:(VarUInteger 16)            // jetton base units
 *     destination:MsgAddress             // new OWNER address (not jetton wallet)
 *     response_destination:MsgAddress    // where to return gas excesses
 *     custom_payload:(Maybe ^Cell)
 *     forward_ton_amount:(VarUInteger 16) // TON forwarded with the notification
 *     forward_payload:(Either Cell ^Cell) // optional comment / notification body
 *
 * Usage: call `sendTransaction({ to: senderJettonWalletAddress, value: gasTon, body: thisCell })`.
 * The sender's jetton wallet address is derived via `getJettonWalletAddress(jettonMaster, sender)`.
 */
export function buildJettonTransferMessage(params: {
    queryId?: bigint;
    jettonAmount: bigint;
    toOwnerAddress: Address;
    responseAddress: Address;
    forwardTonAmount?: bigint;
    forwardPayload?: Cell;
    customPayload?: Cell;
}): Cell {
    const builder = beginCell()
        .storeUint(JettonOps.TRANSFER, 32)
        .storeUint(params.queryId ?? BigInt(0), 64)
        .storeCoins(params.jettonAmount)
        .storeAddress(params.toOwnerAddress)
        .storeAddress(params.responseAddress);

    // custom_payload:(Maybe ^Cell)
    if (params.customPayload) {
        builder.storeBit(true).storeRef(params.customPayload);
    } else {
        builder.storeBit(false);
    }

    builder.storeCoins(params.forwardTonAmount ?? BigInt(0));

    // forward_payload:(Either Cell ^Cell) — true = ref, false = in-place
    if (params.forwardPayload) {
        builder.storeBit(true).storeRef(params.forwardPayload);
    } else {
        builder.storeBit(false);
    }

    return builder.endCell();
}

// =====================================================
// On-Chain Queries (GET Methods) - Using TonAPI
// =====================================================

// Cache for deterministic wallet addresses (owner+jetton -> wallet address)
const walletAddressCache = new Map<string, string>();

// Testnet adapter cache (separate from mainnet singleton in ton-api.ts)
let cachedTestnetAdapter: ContractAdapter | null = null;

/**
 * Get or create a ContractAdapter for blockchain queries.
 * Mainnet delegates to the central singleton in ton-api.ts (includes API key).
 * Testnet creates a separate instance with API key.
 */
export function getContractAdapter(testnet: boolean = false): ContractAdapter {
    if (!testnet) return getCentralAdapter();

    if (cachedTestnetAdapter) return cachedTestnetAdapter;
    const apiKey =
      typeof window === "undefined" ? env.TONAPI_KEY ?? env.NEXT_PUBLIC_TONAPI_KEY : env.NEXT_PUBLIC_TONAPI_KEY;
    const tonApiClient = new TonApiClient({
        baseUrl: "https://testnet.tonapi.io",
        ...(apiKey ? { apiKey } : {}),
    });
    cachedTestnetAdapter = new ContractAdapter(tonApiClient);
    return cachedTestnetAdapter;
}

/**
 * Get Jetton wallet address from master (TEP-74: get_wallet_address)
 * Falls back to TONAPI if TonClient fails.
 */
export async function getJettonWalletAddress(
    jettonMasterAddress: string,
    ownerAddress: string,
    contractAdapter: ContractAdapter,
    testnet: boolean = false
): Promise<string | null> {
    // Check cache first (wallet addresses are deterministic)
    const cacheKey = `${jettonMasterAddress}:${ownerAddress}`;
    const cached = walletAddressCache.get(cacheKey);
    if (cached) return cached;

    // Try ContractAdapter first
    try {
        const master = Address.parse(jettonMasterAddress);
        const owner = Address.parse(ownerAddress);

        const ownerSlice: TupleItemSlice = {
            type: "slice",
            cell: beginCell().storeAddress(owner).endCell(),
        };

        const provider = contractAdapter.provider(master);
        const result = await provider.get("get_wallet_address", [ownerSlice]);
        const walletAddress = result.stack.readAddress();

        if (walletAddress) {
            const address = walletAddress.toString();
            walletAddressCache.set(cacheKey, address);
            return address;
        }
    } catch (error) {
        // ContractAdapter failed, try TONAPI fallback
        const errorMessage = error instanceof Error ? error.message : "";
        if (!errorMessage.includes("exit_code: -13") && !errorMessage.includes("entity not found")) {
            console.warn("[getJettonWalletAddress] ContractAdapter failed, trying TONAPI fallback");
        }
    }

    // Fallback: Use TONAPI
    try {
        const baseUrl = testnet ? "https://testnet.tonapi.io" : "https://tonapi.io";
        const response = await fetch(
            `${baseUrl}/v2/accounts/${ownerAddress}/jettons/${jettonMasterAddress}`,
            { signal: AbortSignal.timeout(5000) }
        );

        if (response.ok) {
            const data = await response.json();
            if (data.wallet_address?.address) {
                // TONAPI returns raw address, convert to friendly
                const rawAddress = data.wallet_address.address;
                try {
                    const address = Address.parse(rawAddress).toString();
                    walletAddressCache.set(cacheKey, address);
                    return address;
                } catch {
                    walletAddressCache.set(cacheKey, rawAddress);
                    return rawAddress;
                }
            }
        }
    } catch (tonapiError) {
        console.warn("[getJettonWalletAddress] TONAPI fallback also failed:", tonapiError);
    }

    return null;
}

/**
 * Get Jetton wallet data (TEP-74: get_wallet_data)
 */
async function getJettonWalletData(
    jettonWalletAddress: string,
    contractAdapter: ContractAdapter
): Promise<JettonWalletData | null> {
    try {
        const address = Address.parse(jettonWalletAddress);
        const provider = contractAdapter.provider(address);
        const result = await provider.get("get_wallet_data", []);

        const balance = result.stack.readBigNumber();
        const ownerAddress = result.stack.readAddress();
        const jettonMasterAddress = result.stack.readAddress();
        const walletCode = result.stack.readCell();

        return {
            balance,
            ownerAddress: ownerAddress?.toString() ?? "",
            jettonMasterAddress: jettonMasterAddress?.toString() ?? "",
            walletCode,
        };
    } catch (error) {
        // Silently handle expected errors:
        // - exit_code: -13 = contract doesn't exist
        // - "entity not found" = contract not deployed on-chain
        // - 429 = rate limit (expected without API key)
        const errorMessage = error instanceof Error ? error.message : "";
        if (!errorMessage.includes("exit_code: -13") &&
            !errorMessage.includes("entity not found") &&
            !errorMessage.includes("429") &&
            !errorMessage.includes("rate")) {
            console.error("Failed to get wallet data:", error);
        }
        return null;
    }
}

/**
 * Get Jetton balance for an owner
 */
export async function getJettonBalance(
    jettonMasterAddress: string,
    ownerAddress: string,
    contractAdapter: ContractAdapter
): Promise<bigint> {
    try {
        const walletAddress = await getJettonWalletAddress(
            jettonMasterAddress,
            ownerAddress,
            contractAdapter
        );

        if (!walletAddress) return BigInt(0);

        const walletData = await getJettonWalletData(walletAddress, contractAdapter);
        return walletData?.balance ?? BigInt(0);
    } catch {
        return BigInt(0);
    }
}

/**
 * Get bonding curve data (custom: get_curve_data)
 * Contract returns: (total_supply, ton_reserve, current_price, graduated, graduation_target)
 */
export async function getBondingCurveData(
    jettonMasterAddress: string,
    contractAdapter: ContractAdapter
): Promise<BondingCurveData | null> {
    try {
        const address = Address.parse(jettonMasterAddress);
        const provider = contractAdapter.provider(address);
        const result = await Promise.race([
            provider.get("get_curve_data", []),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Contract call timed out")), 8_000)),
        ]);

        const totalSupply = result.stack.readBigNumber();
        const tonReserve = result.stack.readBigNumber();
        const currentPrice = result.stack.readBigNumber();
        const graduated = result.stack.readNumber() === -1;
        const graduationTarget = result.stack.readBigNumber();

        return {
            totalSupply,
            tonReserve,
            currentPrice,
            graduated,
            graduationTarget,
        };
    } catch (error) {
        // Silently handle expected errors:
        // - exit_code: -13 = contract doesn't exist
        // - "entity not found" = contract not deployed on-chain
        // - 429 = rate limit (expected without API key)
        const errorMessage = error instanceof Error ? error.message : "";
        if (!errorMessage.includes("exit_code: -13") &&
            !errorMessage.includes("entity not found") &&
            !errorMessage.includes("429") &&
            !errorMessage.includes("rate")) {
            console.error("Failed to get curve data:", error);
        }
        return null;
    }
}

/**
 * Preview buy (custom: preview_buy)
 */
export async function previewBuyOnChain(
    jettonMasterAddress: string,
    tonAmount: bigint,
    contractAdapter: ContractAdapter
): Promise<bigint> {
    try {
        const address = Address.parse(jettonMasterAddress);
        const provider = contractAdapter.provider(address);
        const result = await provider.get("preview_buy", [
            { type: "int", value: tonAmount }
        ]);

        return result.stack.readBigNumber();
    } catch {
        return BigInt(0);
    }
}

/**
 * Preview sell (custom: preview_sell)
 */
export async function previewSellOnChain(
    jettonMasterAddress: string,
    tokenAmount: bigint,
    contractAdapter: ContractAdapter
): Promise<bigint> {
    try {
        const address = Address.parse(jettonMasterAddress);
        const provider = contractAdapter.provider(address);
        const result = await provider.get("preview_sell", [
            { type: "int", value: tokenAmount }
        ]);

        return result.stack.readBigNumber();
    } catch {
        return BigInt(0);
    }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Format token amount for display (divide by 10^decimals)
 */
export function formatTokenAmount(amount: bigint, decimals: number = 9): string {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fraction = amount % divisor;

    if (fraction === BigInt(0)) {
        return whole.toString();
    }

    const fractionStr = fraction.toString().padStart(decimals, "0");
    const trimmed = fractionStr.replace(/0+$/, "");

    return `${whole}.${trimmed}`;
}

/**
 * Parse token amount from string (multiply by 10^decimals)
 */
export function parseTokenAmount(amount: string, decimals: number = 9): bigint {
    if (!amount || amount.trim() === "") return BigInt(0);
    // Normalize: add leading zero for inputs like ".123"
    const normalized = amount.startsWith(".") ? `0${amount}` : amount;
    const [whole = "0", fraction = ""] = normalized.split(".");
    const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
    return BigInt((whole || "0") + paddedFraction);
}

// =====================================================
// Price/Display Formatting
// =====================================================

/**
 * Format price for display (handles small decimals)
 */
export function formatPrice(price: string | number | bigint): string {
    const num = typeof price === "bigint"
        ? Number(price) / 1e9
        : typeof price === "string"
            ? parseFloat(price) / 1e9
            : price;

    if (num === 0) return "0";
    if (num < 0.00000001) return num.toFixed(10);
    if (num < 0.0001) return num.toFixed(8);
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    return formatCompactNumber(num);
}

/**
 * Format market cap for display
 */
export function formatMarketCap(marketCap: string | number | bigint): string {
    const num = typeof marketCap === "bigint"
        ? Number(marketCap) / 1e9
        : typeof marketCap === "string"
            ? parseFloat(marketCap) / 1e9
            : marketCap;

    return formatCompactNumber(num) + " TON";
}

/**
 * Format number in compact notation (K, M, B)
 */
export function formatCompactNumber(num: number, precision: number = 2): string {
    if (num === 0) return "0";
    const abs = Math.abs(num);
    if (abs < 0.01) return num.toFixed(precision > 2 ? precision : 4);
    if (abs < 1) return num.toFixed(precision);
    if (abs < 1000) return num.toFixed(precision);
    if (abs >= 1_000_000_000_000) return (num / 1_000_000_000_000).toFixed(precision) + "T";
    if (abs >= 1_000_000) {
        // Check if rounding would push to the next tier
        const b = +(num / 1_000_000_000).toFixed(precision);
        if (Math.abs(b) >= 1) return b.toFixed(precision) + "B";
        return (num / 1_000_000).toFixed(precision) + "M";
    }
    if (abs >= 1_000) {
        const m = +(num / 1_000_000).toFixed(precision);
        if (Math.abs(m) >= 1) return m.toFixed(precision) + "M";
        return (num / 1_000).toFixed(precision) + "K";
    }
    return num.toFixed(precision);
}

