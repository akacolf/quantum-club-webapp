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
    toNano,
    contractAddress,
    StateInit,
    TupleItemSlice
} from "@ton/core";
import { TonClient } from "@ton/ton";

// =====================================================
// Operation Codes (TEP-74 Standard + Blum/BigPump Compatible)
// =====================================================
export const JettonOps = {
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
export interface JettonMetadata {
    name: string;
    symbol: string;
    description: string;
    image: string;
    decimals?: number;
}

export interface JettonMasterData {
    totalSupply: bigint;
    mintable: boolean;
    adminAddress: string;
    content: Cell;
    walletCode: Cell;
}

export interface JettonWalletData {
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

export interface TransactionParams {
    to: string;
    value: string;
    body?: Cell;
    stateInit?: Cell;
}

// =====================================================
// Message Builders (TEP-74 Compliant)
// =====================================================

/**
 * Build transfer message (op 0xf8a7ea5)
 * Used to transfer Jettons between wallets
 */
export function buildTransferMessage(params: {
    queryId?: bigint;
    amount: bigint;
    destination: Address;
    responseDestination: Address;
    customPayload?: Cell;
    forwardTonAmount: bigint;
    forwardPayload?: Cell;
}): Cell {
    const builder = beginCell()
        .storeUint(JettonOps.TRANSFER, 32)
        .storeUint(params.queryId ?? BigInt(0), 64)
        .storeCoins(params.amount)
        .storeAddress(params.destination)
        .storeAddress(params.responseDestination);

    // Custom payload (Maybe ^Cell)
    if (params.customPayload) {
        builder.storeBit(true).storeRef(params.customPayload);
    } else {
        builder.storeBit(false);
    }

    builder.storeCoins(params.forwardTonAmount);

    // Forward payload (Either Cell ^Cell)
    if (params.forwardPayload) {
        builder.storeBit(true).storeRef(params.forwardPayload);
    } else {
        builder.storeBit(false);
    }

    return builder.endCell();
}

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
 */
export function buildGraduateMessage(params: {
    queryId?: bigint;
}): Cell {
    return beginCell()
        .storeUint(JettonOps.GRADUATE, 32)
        .storeUint(params.queryId ?? BigInt(0), 64)
        .endCell();
}

// =====================================================
// Jetton Wallet Address Calculation
// =====================================================

/**
 * Pack Jetton wallet initial data
 */
function packJettonWalletData(
    ownerAddress: Address,
    jettonMasterAddress: Address,
    walletCode: Cell
): Cell {
    return beginCell()
        .storeCoins(BigInt(0)) // initial balance = 0
        .storeAddress(ownerAddress)
        .storeAddress(jettonMasterAddress)
        .storeRef(walletCode)
        .endCell();
}

/**
 * Calculate Jetton wallet StateInit
 */
export function calculateJettonWalletStateInit(
    ownerAddress: Address,
    jettonMasterAddress: Address,
    walletCode: Cell
): StateInit {
    const data = packJettonWalletData(ownerAddress, jettonMasterAddress, walletCode);
    return {
        code: walletCode,
        data: data,
    };
}

/**
 * Calculate Jetton wallet address from StateInit
 */
export function calculateJettonWalletAddress(stateInit: StateInit): Address {
    return contractAddress(0, stateInit);
}

/**
 * Get Jetton wallet address for an owner
 */
export function getJettonWalletAddressLocal(
    ownerAddress: Address,
    jettonMasterAddress: Address,
    walletCode: Cell
): Address {
    const stateInit = calculateJettonWalletStateInit(
        ownerAddress,
        jettonMasterAddress,
        walletCode
    );
    return calculateJettonWalletAddress(stateInit);
}

// =====================================================
// On-Chain Queries (GET Methods)
// =====================================================

/**
 * Create TonClient for blockchain queries
 */
export function createTonClient(testnet: boolean = false): TonClient {
    return new TonClient({
        endpoint: testnet
            ? "https://testnet.toncenter.com/api/v2/jsonRPC"
            : "https://toncenter.com/api/v2/jsonRPC",
        apiKey: testnet
            ? process.env.NEXT_PUBLIC_TONCENTER_TESTNET_API_KEY || undefined
            : process.env.NEXT_PUBLIC_TONCENTER_API_KEY || undefined,
    });
}

/**
 * Get Jetton master data (TEP-74: get_jetton_data)
 */
export async function getJettonData(
    jettonMasterAddress: string,
    tonClient: TonClient
): Promise<JettonMasterData | null> {
    try {
        const address = Address.parse(jettonMasterAddress);
        const result = await tonClient.runMethod(address, "get_jetton_data");

        const totalSupply = result.stack.readBigNumber();
        const mintable = result.stack.readNumber() === -1;
        const adminAddress = result.stack.readAddress();
        const content = result.stack.readCell();
        const walletCode = result.stack.readCell();

        return {
            totalSupply,
            mintable,
            adminAddress: adminAddress?.toString() ?? "",
            content,
            walletCode,
        };
    } catch (error) {
        // Exit code -13 means contract doesn't exist - expected for new tokens
        const errorMessage = error instanceof Error ? error.message : "";
        if (!errorMessage.includes("exit_code: -13")) {
            console.error("Failed to get Jetton data:", error);
        }
        return null;
    }
}

/**
 * Get Jetton wallet address from master (TEP-74: get_wallet_address)
 */
export async function getJettonWalletAddress(
    jettonMasterAddress: string,
    ownerAddress: string,
    tonClient: TonClient
): Promise<string | null> {
    try {
        const master = Address.parse(jettonMasterAddress);
        const owner = Address.parse(ownerAddress);

        const ownerSlice: TupleItemSlice = {
            type: "slice",
            cell: beginCell().storeAddress(owner).endCell(),
        };

        const result = await tonClient.runMethod(master, "get_wallet_address", [ownerSlice]);
        const walletAddress = result.stack.readAddress();

        return walletAddress?.toString() ?? null;
    } catch (error) {
        // Exit code -13 means contract doesn't exist - this is expected for new tokens
        const errorMessage = error instanceof Error ? error.message : "";
        if (!errorMessage.includes("exit_code: -13")) {
            console.error("Failed to get wallet address:", error);
        }
        return null;
    }
}

/**
 * Get Jetton wallet data (TEP-74: get_wallet_data)
 */
export async function getJettonWalletData(
    jettonWalletAddress: string,
    tonClient: TonClient
): Promise<JettonWalletData | null> {
    try {
        const address = Address.parse(jettonWalletAddress);
        const result = await tonClient.runMethod(address, "get_wallet_data");

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
        // Exit code -13 means contract doesn't exist - this is expected for new tokens
        const errorMessage = error instanceof Error ? error.message : "";
        if (!errorMessage.includes("exit_code: -13")) {
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
    tonClient: TonClient
): Promise<bigint> {
    try {
        const walletAddress = await getJettonWalletAddress(
            jettonMasterAddress,
            ownerAddress,
            tonClient
        );

        if (!walletAddress) return BigInt(0);

        const walletData = await getJettonWalletData(walletAddress, tonClient);
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
    tonClient: TonClient
): Promise<BondingCurveData | null> {
    try {
        const address = Address.parse(jettonMasterAddress);
        const result = await tonClient.runMethod(address, "get_curve_data");

        const totalSupply = result.stack.readBigNumber();
        const tonReserve = result.stack.readBigNumber();
        const currentPrice = result.stack.readBigNumber();
        const graduated = result.stack.readNumber() === 1;
        const graduationTarget = result.stack.readBigNumber();

        return {
            totalSupply,
            tonReserve,
            currentPrice,
            graduated,
            graduationTarget,
        };
    } catch (error) {
        // Exit code -13 means contract doesn't exist - expected for new tokens
        const errorMessage = error instanceof Error ? error.message : "";
        if (!errorMessage.includes("exit_code: -13")) {
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
    tonClient: TonClient
): Promise<bigint> {
    try {
        const address = Address.parse(jettonMasterAddress);
        const result = await tonClient.runMethod(address, "preview_buy", [
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
    tonClient: TonClient
): Promise<bigint> {
    try {
        const address = Address.parse(jettonMasterAddress);
        const result = await tonClient.runMethod(address, "preview_sell", [
            { type: "int", value: tokenAmount }
        ]);

        return result.stack.readBigNumber();
    } catch {
        return BigInt(0);
    }
}

/**
 * Check if contract is deployed
 */
export async function isContractDeployed(
    address: string,
    tonClient: TonClient
): Promise<boolean> {
    try {
        const addr = Address.parse(address);
        const state = await tonClient.getContractState(addr);
        return state.state === "active";
    } catch {
        return false;
    }
}

// =====================================================
// Transaction Builders for QC Wallet
// =====================================================

/**
 * Build BUY transaction params for QC Wallet
 * Send TON to Jetton Master to buy tokens
 */
export function buildBuyTransaction(
    jettonMasterAddress: string,
    tonAmount: bigint,
    minTokensOut?: bigint
): TransactionParams {
    return {
        to: jettonMasterAddress,
        value: tonAmount.toString(),
        body: buildBuyMessage({ minTokensOut }),
    };
}

/**
 * Build SELL transaction params for QC Wallet
 * Send burn message to Jetton Wallet to sell tokens
 */
export function buildSellTransaction(
    jettonWalletAddress: string,
    tokenAmount: bigint,
    responseAddress: Address
): TransactionParams {
    return {
        to: jettonWalletAddress,
        value: toNano("0.1").toString(), // Gas for burn + response
        body: buildBurnMessage({
            amount: tokenAmount,
            responseDestination: responseAddress,
        }),
    };
}

/**
 * Build TRANSFER transaction params for QC Wallet
 * Transfer Jettons to another address
 */
export function buildTransferTransaction(
    jettonWalletAddress: string,
    toAddress: Address,
    tokenAmount: bigint,
    responseAddress: Address,
    forwardTonAmount?: bigint,
    comment?: string
): TransactionParams {
    let forwardPayload: Cell | undefined;

    // Add comment if provided
    if (comment) {
        forwardPayload = beginCell()
            .storeUint(0, 32) // Comment indicator
            .storeStringTail(comment)
            .endCell();
    }

    return {
        to: jettonWalletAddress,
        value: toNano("0.1").toString(), // Gas for transfer
        body: buildTransferMessage({
            amount: tokenAmount,
            destination: toAddress,
            responseDestination: responseAddress,
            forwardTonAmount: forwardTonAmount ?? BigInt(0),
            forwardPayload,
        }),
    };
}

/**
 * Build WITHDRAW FEES transaction params
 */
export function buildWithdrawFeesTransaction(
    jettonMasterAddress: string
): TransactionParams {
    return {
        to: jettonMasterAddress,
        value: toNano("0.05").toString(),
        body: buildWithdrawFeesMessage({}),
    };
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
    const [whole, fraction = ""] = amount.split(".");
    const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
    return BigInt(whole + paddedFraction);
}

/**
 * Format TON amount for display
 */
export function formatTonAmount(nanotons: bigint): string {
    return formatTokenAmount(nanotons, 9);
}

/**
 * Generate unique query ID
 */
export function generateQueryId(): bigint {
    return BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000));
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
    if (num < 0.00000001) return num.toExponential(2);
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
    if (Math.abs(num) < 0.01) return num.toFixed(precision > 2 ? precision : 4);
    if (Math.abs(num) < 1) return num.toFixed(precision);
    if (Math.abs(num) < 1000) return num.toFixed(precision);
    if (Math.abs(num) < 1000000) return (num / 1000).toFixed(precision) + "K";
    if (Math.abs(num) < 1000000000) return (num / 1000000).toFixed(precision) + "M";
    return (num / 1000000000).toFixed(precision) + "B";
}

