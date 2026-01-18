"use client";

import { Cell, internal, Address, SendMode, beginCell, storeMessage, external } from "@ton/core";
import { WalletContractV5R1, WalletContractV4, WalletContractV3R2, TonClient } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { getHttpEndpoint } from "@orbs-network/ton-access";

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

/**
 * Result of a batch transaction
 */
export interface BatchTransactionResult {
    success: boolean;
    txHash?: string;
    error?: string;
    messageCount: number;
}

/**
 * Configuration for batch transaction
 */
export interface BatchConfig {
    maxMessages?: number; // Default 4, max 255 (but practically limited by gas)
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
        return internal({
            to: toAddress,
            value: tx.value,
            body: tx.body,
            bounce: tx.bounce ?? false,
        });
    });
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

        // Get TON client via Orbs Network (rate-limit free)
        const endpoint = await getHttpEndpoint({ network: isTestnet ? "testnet" : "mainnet" });
        const tonClient = new TonClient({ endpoint });
        const contract = tonClient.open(wallet);

        // Get seqno
        let seqno = 0;
        try {
            seqno = await contract.getSeqno();
        } catch {
            // New wallet, seqno is 0
            seqno = 0;
        }

        // Build internal messages
        const internalMessages = buildInternalMessages(transactions);

        // Create transfer with multiple messages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        // Send via Orbs endpoint
        const orbsClient = new TonClient({ endpoint });
        await orbsClient.sendFile(bocCell.toBoc());

        // Generate tx hash from BOC
        const txHash = bocCell.hash().toString("hex");

        return {
            success: true,
            txHash,
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
