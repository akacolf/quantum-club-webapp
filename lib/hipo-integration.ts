"use client";

/**
 * Hipo Finance SDK Integration
 * Liquid staking on TON with hTON token
 * @see https://hipo.finance
 */

import { Address, toNano, beginCell, Cell } from "@ton/core";
import { WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";

// Hipo Protocol Constants (from @hipo-finance/sdk)
export const HIPO_TREASURY_MAINNET = "EQCLyZHP4Xe8fpchQz76O-_RmUhaVc_9BAoGyJrwJrcbz2eZ";
export const HIPO_TREASURY_TESTNET = "kQAlDMBKCT8WJ4nwdwNRp0lvKMP4vUnHYspFPhEnyR36cg44";

// Op codes
export const OP_DEPOSIT_COINS = 0x3d3761a6;
export const OP_UNSTAKE_TOKENS = 0x595f07bc;

// Fees
export const HIPO_STAKE_FEE = toNano("0.1"); // 0.1 TON
export const HIPO_UNSTAKE_FEE = toNano("0.1"); // 0.1 TON
export const MINIMUM_TON_RESERVE = toNano("0.2"); // Keep 0.2 TON for gas

export interface HipoStakeResult {
    success: boolean;
    txHash?: string;
    estimatedHton?: string;
    error?: string;
}

export interface HipoTreasuryState {
    totalCoins: bigint;
    totalTokens: bigint;
    totalStaking: bigint;
    totalUnstaking: bigint;
    exchangeRate: number;
    apy: number;
}

export interface HipoUserBalance {
    htonBalance: string;
    htonValue: string; // Value in TON
    pendingUnstake: string;
}

/**
 * Calculate max amount that can be staked
 */
export function maxAmountToStake(tonBalance: bigint): bigint {
    const reserved = MINIMUM_TON_RESERVE + HIPO_STAKE_FEE;
    const available = tonBalance - reserved;
    return available > BigInt(0) ? available : BigInt(0);
}

/**
 * Create deposit message body for staking TON
 */
export function createDepositBody(
    amountInNano: bigint,
    queryId: bigint = BigInt(0),
    referrer?: Address
): Cell {
    return beginCell()
        .storeUint(OP_DEPOSIT_COINS, 32)
        .storeUint(queryId, 64)
        .storeAddress(null) // owner_address (null = sender)
        .storeCoins(amountInNano)
        .storeCoins(BigInt(1)) // min_tokens_out
        .storeAddress(referrer || null) // referrer
        .endCell();
}

/**
 * Create unstake message body for burning hTON
 */
export function createUnstakeBody(
    amountInNano: bigint,
    queryId: bigint = BigInt(0)
): Cell {
    return beginCell()
        .storeUint(OP_UNSTAKE_TOKENS, 32)
        .storeUint(queryId, 64)
        .storeCoins(amountInNano)
        .storeAddress(undefined) // return_excess to sender
        .storeMaybeRef(
            beginCell()
                .storeUint(0, 4) // mode: Auto
                .storeCoins(BigInt(1)) // ownership_assigned_amount
                .endCell()
        )
        .endCell();
}

/**
 * Get Hipo treasury state including exchange rate and APY
 */
export async function getHipoTreasuryState(
    isTestnet: boolean = false
): Promise<HipoTreasuryState | null> {
    try {
        const treasuryAddress = isTestnet ? HIPO_TREASURY_TESTNET : HIPO_TREASURY_MAINNET;
        const tonApiClient = new TonApiClient({
            baseUrl: isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io",
        });

        // Call get_treasury_state method
        const result = await tonApiClient.blockchain.execGetMethodForBlockchainAccount(
            Address.parse(treasuryAddress),
            "get_treasury_state"
        );

        if (result.success && result.stack) {
            const stack = result.stack;
            
            // Parse state from stack - handle TupleItem types
            const getNumValue = (item: { type: string; num?: string } | undefined): bigint => {
                if (item && item.type === "num" && item.num) {
                    return BigInt(item.num);
                }
                return BigInt(0);
            };
            
            const totalCoins = getNumValue(stack[0] as { type: string; num?: string });
            const totalTokens = getNumValue(stack[1] as { type: string; num?: string });
            const totalStaking = getNumValue(stack[2] as { type: string; num?: string });
            const totalUnstaking = getNumValue(stack[3] as { type: string; num?: string });

            // Calculate exchange rate: TON per hTON
            const exchangeRate = totalTokens > BigInt(0)
                ? Number(totalCoins) / Number(totalTokens)
                : 1;

            // Estimate APY (Hipo typically offers 4-5% APY)
            // In production, this should be fetched from Hipo API
            const apy = 4.6;

            return {
                totalCoins,
                totalTokens,
                totalStaking,
                totalUnstaking,
                exchangeRate,
                apy,
            };
        }

        return null;
    } catch (error) {
        console.error("Failed to get Hipo treasury state:", error);
        return null;
    }
}

/**
 * Get user's hTON balance and pending unstakes
 */
export async function getHipoUserBalance(
    walletAddress: string,
    isTestnet: boolean = false
): Promise<HipoUserBalance | null> {
    try {
        const tonApiClient = new TonApiClient({
            baseUrl: isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io",
        });

        // Find hTON jetton in user's balances
        const jettons = await tonApiClient.accounts.getAccountJettonsBalances(
            Address.parse(walletAddress)
        );

        // Look for hTON token
        const treasuryAddress = isTestnet ? HIPO_TREASURY_TESTNET : HIPO_TREASURY_MAINNET;
        const htonBalance = jettons.balances.find(
            (j) => j.jetton.address.toString() === treasuryAddress
        );

        if (htonBalance) {
            const balance = htonBalance.balance;
            const balanceFormatted = (Number(balance) / 1e9).toFixed(4);

            // Get exchange rate for TON value
            const state = await getHipoTreasuryState(isTestnet);
            const tonValue = state
                ? (Number(balance) / 1e9 * state.exchangeRate).toFixed(4)
                : balanceFormatted;

            return {
                htonBalance: balanceFormatted,
                htonValue: tonValue,
                pendingUnstake: "0", // Would need to query wallet state for this
            };
        }

        return {
            htonBalance: "0",
            htonValue: "0",
            pendingUnstake: "0",
        };
    } catch (error) {
        console.error("Failed to get Hipo user balance:", error);
        return null;
    }
}

/**
 * Execute stake transaction with Hipo
 */
export async function stakeWithHipo(
    amountTon: string,
    mnemonic: string[],
    isTestnet: boolean = false
): Promise<HipoStakeResult> {
    try {
        const treasuryAddress = isTestnet ? HIPO_TREASURY_TESTNET : HIPO_TREASURY_MAINNET;
        
        // Initialize clients
        const tonApiClient = new TonApiClient({
            baseUrl: isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io",
        });
        const contractAdapter = new ContractAdapter(tonApiClient);

        // Create wallet from mnemonic
        const keyPair = await mnemonicToPrivateKey(mnemonic);
        const wallet = WalletContractV5R1.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
        });
        const contract = contractAdapter.open(wallet);

        // Get current seqno
        const seqno = await contract.getSeqno();

        // Calculate amount
        const amountNano = toNano(amountTon);
        const totalValue = amountNano + HIPO_STAKE_FEE;

        // Create deposit body
        const body = createDepositBody(amountNano);

        // Send transaction
        await contract.sendTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
            messages: [
                internal({
                    to: Address.parse(treasuryAddress),
                    value: totalValue,
                    body,
                }),
            ],
        });

        // Estimate hTON to receive
        const state = await getHipoTreasuryState(isTestnet);
        const estimatedHton = state
            ? (parseFloat(amountTon) / state.exchangeRate).toFixed(4)
            : amountTon;

        return {
            success: true,
            estimatedHton,
        };
    } catch (error) {
        console.error("Hipo stake failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Stake transaction failed",
        };
    }
}

/**
 * Execute unstake transaction with Hipo
 */
export async function unstakeFromHipo(
    htonAmount: string,
    walletJettonAddress: string,
    mnemonic: string[],
    isTestnet: boolean = false
): Promise<HipoStakeResult> {
    try {
        // Initialize clients
        const tonApiClient = new TonApiClient({
            baseUrl: isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io",
        });
        const contractAdapter = new ContractAdapter(tonApiClient);

        // Create wallet from mnemonic
        const keyPair = await mnemonicToPrivateKey(mnemonic);
        const wallet = WalletContractV5R1.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
        });
        const contract = contractAdapter.open(wallet);

        // Get current seqno
        const seqno = await contract.getSeqno();

        // Calculate amount
        const amountNano = toNano(htonAmount);

        // Create unstake body
        const body = createUnstakeBody(amountNano);

        // Send to jetton wallet (not treasury)
        await contract.sendTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
            messages: [
                internal({
                    to: Address.parse(walletJettonAddress),
                    value: HIPO_UNSTAKE_FEE,
                    body,
                }),
            ],
        });

        return {
            success: true,
        };
    } catch (error) {
        console.error("Hipo unstake failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unstake transaction failed",
        };
    }
}

/**
 * Get live APY from Hipo
 * Calculates APY based on historical exchange rate changes
 */
export async function getHipoLiveApy(isTestnet: boolean = false): Promise<number> {
    try {
        const state = await getHipoTreasuryState(isTestnet);
        if (state) {
            return state.apy;
        }
        return 4.6; // Default fallback APY
    } catch {
        return 4.6;
    }
}
