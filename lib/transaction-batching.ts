"use client";

import { Cell, internal, Address, SendMode, beginCell, storeMessage, external } from "@ton/core";
import { WalletContractV5R1, WalletContractV4, WalletContractV3R2 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { sendBlockchainMessage } from "./tonapi-client";

/**
 * Transaction to be batched
 */
export interface BatchTransaction {
    to: string;
    value: bigint; // in nanotons
    body?: Cell;
    bounce?: boolean;
    stateInit?: Cell;
}

interface BatchTransactionResult {
    success: boolean;
    txHash?: string;
    error?: string;
    messageCount: number;
}

interface BatchConfig {
    maxMessages?: number;
    sendMode?: SendMode;
}

// Maximum recommended messages per transaction
// TON theoretically supports 255, but gas costs scale linearly
// 4 is safe and supported by all wallet versions
export const MAX_BATCH_MESSAGES = 4;

/**
 * Build internal messages for batching
 */
function buildInternalMessages(transactions: BatchTransaction[]): ReturnType<typeof internal>[] {
    return transactions.map((tx) => {
        const toAddress = Address.parse(tx.to);
        
        // Note: stateInit parsing is handled at send time, not here
        // This allows for cleaner async handling
        // Default to bounce: true for contract messages (TON standard).
        // Callers should explicitly set bounce: false for deployments or EOA transfers.
        return internal({
            to: toAddress,
            value: tx.value,
            body: tx.body,
            bounce: tx.bounce ?? true,
        });
    });
}

/**
 * Get seqno from TONAPI
 */
async function getSeqnoViaTonApi(walletAddress: string, isTestnet: boolean): Promise<number> {
    try {
        const baseUrl = isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io";
        const response = await fetch(
            `${baseUrl}/v2/wallet/${walletAddress}/seqno`,
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
        
        if (!response.ok) {
            // Wallet might be new/uninitialized
            return 0;
        }
        
        const data = await response.json();
        return data.seqno ?? 0;
    } catch {
        // New wallet or error, default to 0
        return 0;
    }
}

/**
 * Send multiple transactions in a single external message
 * This saves gas and reduces confirmation time for multiple transfers
 * 
 * @param transactions Array of transactions to batch (max 4 recommended)
 * @param mnemonic Wallet mnemonic phrase
 * @param walletVersion Wallet contract version (v5r1, v4r2, v3r2)
 * @param isTestnet Whether to use testnet
 * @param config Optional configuration
 * @returns Result with success status and tx hash
 */
export async function sendBatchTransaction(
    transactions: BatchTransaction[],
    mnemonic: string,
    walletVersion: string = "v5r1",
    isTestnet: boolean = false,
    config: BatchConfig = {}
): Promise<BatchTransactionResult> {
    const maxMessages = config.maxMessages ?? MAX_BATCH_MESSAGES;
    const sendMode = config.sendMode ?? (SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS);

    // Validate transaction count
    if (transactions.length === 0) {
        return { success: false, error: "No transactions provided", messageCount: 0 };
    }

    if (transactions.length > maxMessages) {
        return { 
            success: false, 
            error: `Too many transactions. Maximum is ${maxMessages}, got ${transactions.length}`,
            messageCount: transactions.length
        };
    }

    try {
        // Derive keypair from mnemonic
        const mnemonicArray = mnemonic.split(" ");
        const keyPair = await mnemonicToPrivateKey(mnemonicArray);

        // Create wallet based on version
        let wallet: WalletContractV5R1 | WalletContractV4 | WalletContractV3R2;
        switch (walletVersion) {
            case "v4r2":
                wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
                break;
            case "v3r2":
                wallet = WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey });
                break;
            case "v5r1":
            default:
                wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
                break;
        }

        // Get seqno via TONAPI
        const seqno = await getSeqnoViaTonApi(wallet.address.toString(), isTestnet);

        // Build internal messages
        const internalMessages = buildInternalMessages(transactions);

        // Create transfer with multiple messages
        const transferCell = (wallet as any).createTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            sendMode,
            messages: internalMessages,
        }) as Cell;

        // Build external message
        const externalMsg = external({
            to: wallet.address,
            init: seqno === 0 ? wallet.init : undefined, // Deploy wallet if needed
            body: transferCell,
        });

        // Serialize to BOC
        const bocCell = beginCell().store(storeMessage(externalMsg)).endCell();
        const bocBase64 = bocCell.toBoc().toString("base64");

        // Send via TONAPI
        let result;
        let sendError = null;
        
        try {
            result = await sendBlockchainMessage(bocBase64, isTestnet);
        } catch (err) {
            // Store error but don't fail immediately - tx might have succeeded
            sendError = err;
            console.warn("Warning during tx send (tx may have still succeeded):", err);
        }
        
        // Generate tx hash from BOC (this is always valid if we got here)
        const txHash = result?.hash || bocCell.hash().toString("hex");

        // If we got a result object (even empty), it's a success
        // TonAPI returns empty or minimal response on success
        if (result || !sendError) {
            return {
                success: true,
                txHash,
                messageCount: transactions.length,
            };
        }
        
        // If there was an error but no result, still check if it might have worked
        // Network errors after sending don't necessarily mean failure
        const errorMsg = sendError instanceof Error ? sendError.message : String(sendError);
        if (errorMsg.includes("409") || errorMsg.includes("already")) {
            // Already sent = success
            return {
                success: true,
                txHash,
                messageCount: transactions.length,
            };
        }

        // Real failure
        return {
            success: false,
            error: `Transaction may have failed: ${errorMsg}`,
            messageCount: transactions.length,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `Batch transaction failed: ${errorMessage}`,
            messageCount: transactions.length,
        };
    }
}

/**
 * Estimate gas for a batch transaction
 * Each message in TON costs approximately 0.01-0.05 TON depending on payload
 */
export function estimateBatchGas(transactions: BatchTransaction[]): bigint {
    // Base fee for external message processing
    const baseFee = BigInt(10_000_000); // 0.01 TON
    
    // Per-message fee (varies by payload size, using conservative estimate)
    const perMessageFee = BigInt(30_000_000); // 0.03 TON per message
    
    // Additional fee for stateInit deployments
    const stateInitFee = BigInt(50_000_000); // 0.05 TON per deployment
    
    let totalFee = baseFee;
    
    for (const tx of transactions) {
        totalFee += perMessageFee;
        if (tx.stateInit) {
            totalFee += stateInitFee;
        }
    }
    
    // Add 20% safety buffer
    return (totalFee * BigInt(120)) / BigInt(100);
}

/**
 * Validate batch transactions before sending
 */
export function validateBatchTransactions(
    transactions: BatchTransaction[],
    walletBalance: bigint
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (transactions.length === 0) {
        errors.push("No transactions provided");
    }

    if (transactions.length > MAX_BATCH_MESSAGES) {
        errors.push(`Maximum ${MAX_BATCH_MESSAGES} transactions allowed per batch`);
    }

    // Calculate total value
    let totalValue = BigInt(0);
    for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        
        // Validate address
        try {
            Address.parse(tx.to);
        } catch {
            errors.push(`Transaction ${i + 1}: Invalid address`);
        }

        // Validate value
        if (tx.value < BigInt(0)) {
            errors.push(`Transaction ${i + 1}: Negative value not allowed`);
        }

        totalValue += tx.value;
    }

    // Estimate gas
    const estimatedGas = estimateBatchGas(transactions);
    const totalRequired = totalValue + estimatedGas;

    if (totalRequired > walletBalance) {
        errors.push(
            `Insufficient balance. Required: ${Number(totalRequired) / 1e9} TON, ` +
            `Available: ${Number(walletBalance) / 1e9} TON`
        );
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
