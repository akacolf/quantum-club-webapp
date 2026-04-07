/**
 * Platform Wallet Server-Side Utilities
 * 
 * This module handles server-side transaction signing using the platform wallet.
 * The platform mnemonic is stored securely in environment variables.
 * 
 * SECURITY: This module should only be imported from API routes (server-side).
 * It is NOT a "use server" module because it's not called directly from client components.
 * API routes are inherently server-side in Next.js.
 */

import { Address, internal, SendMode, Cell, beginCell } from "@ton/core";
import { WalletContractV5R1, WalletContractV4 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { PLATFORM_WALLET_ADDRESS } from "./platform-config";
import { getContractAdapter } from "@/lib/ton-api";
import { env } from "@/env";

// Platform wallet configuration
const PLATFORM_MNEMONIC = env.PLATFORM_WALLET_MNEMONIC;
const PLATFORM_WALLET_VERSION = env.PLATFORM_WALLET_VERSION ?? "v5r1";

/**
 * Check if platform wallet is configured
 */
export function isPlatformWalletConfigured(): boolean {
    return !!(PLATFORM_MNEMONIC && PLATFORM_WALLET_ADDRESS);
}

/**
 * Send a transaction from the platform wallet
 * 
 * @param to - Destination address
 * @param value - Amount in nanoTON
 * @param body - Optional message body cell
 * @returns Transaction result
 */
export async function sendFromPlatformWallet(params: {
    to: string;
    value: bigint;
    body?: Cell;
}): Promise<{ success: boolean; error?: string }> {
    if (!isPlatformWalletConfigured()) {
        return { success: false, error: "Platform wallet not configured" };
    }

    try {
        const mnemonic = PLATFORM_MNEMONIC.split(" ");
        if (mnemonic.length !== 24) {
            return { success: false, error: "Invalid platform mnemonic" };
        }

        const keyPair = await mnemonicToPrivateKey(mnemonic);

        // Create wallet based on version
        let wallet;
        switch (PLATFORM_WALLET_VERSION) {
            case "v4r2":
                wallet = WalletContractV4.create({ 
                    workchain: 0, 
                    publicKey: keyPair.publicKey 
                });
                break;
            case "v5r1":
            default:
                wallet = WalletContractV5R1.create({ 
                    workchain: 0, 
                    publicKey: keyPair.publicKey 
                });
                break;
        }

        // Verify wallet address matches expected
        const derivedAddress = wallet.address.toString({ bounceable: false });
        const expectedAddress = Address.parse(PLATFORM_WALLET_ADDRESS).toString({ bounceable: false });
        
        if (derivedAddress !== expectedAddress) {
            console.error(`Wallet mismatch: derived ${derivedAddress}, expected ${expectedAddress}`);
            return { success: false, error: "Platform wallet address mismatch" };
        }

        const contractAdapter = getContractAdapter();
        const contract = contractAdapter.open(wallet);
        const toAddress = Address.parse(params.to);

        // Get seqno with retry
        let seqno = 0;
        let retries = 3;
        while (retries > 0) {
            try {
                seqno = await contract.getSeqno();
                break;
            } catch (err) {
                const error = err as { response?: { status?: number } };
                if (error?.response?.status === 429 && retries > 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    retries--;
                    continue;
                }
                if (retries === 1) {
                    seqno = 0;
                    break;
                }
                retries--;
            }
        }

        // Send transfer with retry
        retries = 3;
        while (retries > 0) {
            try {
                await contract.sendTransfer({
                    seqno,
                    secretKey: keyPair.secretKey,
                    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
                    messages: [
                        internal({
                            to: toAddress,
                            value: params.value,
                            body: params.body,
                            bounce: true, // Bounce on error so we don't lose funds
                        }),
                    ],
                });
                break;
            } catch (err) {
                const error = err as { response?: { status?: number } };
                if (error?.response?.status === 429 && retries > 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    retries--;
                    continue;
                }
                throw err;
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Platform wallet transaction failed:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Transaction failed" 
        };
    }
}

/**
 * Build withdraw fees message
 */
export function buildWithdrawFeesMessage(): Cell {
    return beginCell()
        .storeUint(0x46454553, 32) // op::withdraw_fees ("FEES")
        .storeUint(Date.now(), 64) // query_id
        .endCell();
}

/**
 * Build graduate message
 */
export function buildGraduateMessage(dexRouterAddress: string): Cell {
    return beginCell()
        .storeUint(0x47524144, 32) // op::graduate ("GRAD")
        .storeUint(Date.now(), 64) // query_id
        .storeAddress(Address.parse(dexRouterAddress))
        .endCell();
}
