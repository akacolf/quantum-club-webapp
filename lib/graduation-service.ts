/**
 * Automated Token Graduation Pipeline
 *
 * Detects tokens that graduated on-chain (bonding curve threshold reached),
 * then orchestrates: OP_GRADUATE → STON.fi LP creation → LP lock → Firestore update.
 *
 * Designed as an idempotent state machine — safe to call repeatedly from a cron job.
 * Each invocation advances tokens one stage at a time.
 *
 * Stages:  (none) → detected → op_sent → lp_pending → completed
 */

import { firestore as db } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";
import { getBondingCurveData } from "@/lib/ton-api";
import {
    sendFromPlatformWallet,
    sendMultipleFromPlatformWallet,
    buildGraduateMessage,
    isPlatformWalletConfigured,
} from "@/lib/platform-wallet";
import { PLATFORM_WALLET_ADDRESS, DEX_CONFIG } from "@/lib/platform-config";
import { getContractAdapter } from "@/lib/ton-api";
import { StonApiClient } from "@ston-fi/api";
import { dexFactory } from "@ston-fi/sdk";
import { Address, beginCell, toNano } from "@ton/core";

// ─── Constants ───────────────────────────────────────────────────────────────

const TON_ADDRESS = "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";

/** MAX_SUPPLY from the contract (1 billion tokens × 10^9 decimals) */
const MAX_SUPPLY = 1_000_000_000_000_000_000n;

/** Graduation fee in basis points (matches contract GRADUATION_FEE_BPS) */
const GRADUATION_FEE_BPS = 200n;

/** Minimum wait after sending a tx before checking confirmation */
const TX_SETTLE_MS = 30_000;

/** Max time to wait for a stage before retrying */
const STAGE_TIMEOUT_MS = 5 * 60_000;

/** TEP-74 Jetton Transfer opcode */
const OP_JETTON_TRANSFER = 0xf8a7ea5;

// ─── Types ───────────────────────────────────────────────────────────────────

export type GraduationStage = "detected" | "op_sent" | "lp_pending" | "completed";

export interface GraduationReport {
    detected: string[];
    opSent: string[];
    lpCreated: string[];
    errors: Array<{ tokenId: string; error: string }>;
}

// ─── Pipeline Entry Point ────────────────────────────────────────────────────

/**
 * Run the full graduation pipeline. Each call advances tokens one stage.
 * Safe to call repeatedly (idempotent).
 */
export async function runGraduationPipeline(): Promise<GraduationReport> {
    const report: GraduationReport = { detected: [], opSent: [], lpCreated: [], errors: [] };

    if (!isPlatformWalletConfigured()) {
        report.errors.push({ tokenId: "*", error: "Platform wallet not configured" });
        return report;
    }

    // Process in reverse order so a token can advance multiple stages across cron runs,
    // but not within a single run (prevents double-spending / race conditions).

    // Stage 3: Create LP for tokens that received OP_GRADUATE confirmation
    try {
        const created = await processLpCreation(report);
        report.lpCreated = created;
    } catch (error) {
        report.errors.push({ tokenId: "lp_stage", error: String(error) });
    }

    // Stage 2: Verify OP_GRADUATE landed on-chain
    try {
        const sent = await processOpSent(report);
        report.opSent = sent;
    } catch (error) {
        report.errors.push({ tokenId: "op_stage", error: String(error) });
    }

    // Stage 1: Detect newly graduated tokens on-chain
    try {
        const found = await detectGraduations(report);
        report.detected = found;
    } catch (error) {
        report.errors.push({ tokenId: "detect_stage", error: String(error) });
    }

    return report;
}

// ─── Stage 1: Detect ─────────────────────────────────────────────────────────

/**
 * Find tokens where on-chain graduated=true but Firestore hasn't caught up.
 * Sets graduationStage → "detected" and snapshots the curve data.
 */
async function detectGraduations(report: GraduationReport): Promise<string[]> {
    const detected: string[] = [];

    const snapshot = await db
        .collection("tokens")
        .where("status", "==", "bonding")
        .where("isGraduated", "==", false)
        .limit(10)
        .get();

    for (const doc of snapshot.docs) {
        const token = doc.data();
        const jettonMaster = token.jettonMasterAddress as string | undefined;
        if (!jettonMaster) continue;

        // Skip tokens already in the pipeline
        if (token.graduationStage) continue;

        try {
            const curveData = await getBondingCurveData(jettonMaster);
            if (!curveData?.isGraduated) continue;

            // Snapshot curve state for LP calculations
            const lpTokenAmount = MAX_SUPPLY - curveData.totalSupply;
            const liquidityTon =
                curveData.tonReserve - (curveData.tonReserve * GRADUATION_FEE_BPS) / 10_000n;

            await doc.ref.update({
                graduationStage: "detected",
                graduationDetectedAt: FieldValue.serverTimestamp(),
                graduationData: {
                    tonReserve: curveData.tonReserve.toString(),
                    totalSupply: curveData.totalSupply.toString(),
                    lpTokenAmount: lpTokenAmount.toString(),
                    liquidityTon: liquidityTon.toString(),
                },
            });

            detected.push(doc.id);
        } catch {
            // Contract might not be deployed or accessible — skip
        }
    }

    return detected;
}

// ─── Stage 1→2: Send OP_GRADUATE ─────────────────────────────────────────────

/**
 * For "detected" tokens, send OP_GRADUATE to the contract.
 * The contract mints LP tokens to the platform wallet and releases TON.
 * Advances to "op_sent".
 */
async function processOpSent(report: GraduationReport): Promise<string[]> {
    const processed: string[] = [];

    // First: check tokens in "detected" stage and send OP_GRADUATE
    const detectedSnap = await db
        .collection("tokens")
        .where("graduationStage", "==", "detected")
        .limit(3)
        .get();

    for (const doc of detectedSnap.docs) {
        const token = doc.data();
        const jettonMaster = token.jettonMasterAddress as string;
        if (!jettonMaster) continue;

        try {
            // Send OP_GRADUATE with platform wallet as LP recipient.
            // 0.5 TON covers gas for: mint (0.15) + fee transfer + TON transfer + overhead.
            const body = buildGraduateMessage(PLATFORM_WALLET_ADDRESS);
            const result = await sendFromPlatformWallet({
                to: jettonMaster,
                value: toNano("0.5"),
                body,
            });

            if (result.success) {
                await doc.ref.update({
                    graduationStage: "op_sent",
                    graduationOpSentAt: FieldValue.serverTimestamp(),
                    graduationError: FieldValue.delete(),
                });
                processed.push(doc.id);
            } else {
                await doc.ref.update({
                    graduationError: result.error,
                    graduationErrorAt: FieldValue.serverTimestamp(),
                });
                report.errors.push({ tokenId: doc.id, error: result.error ?? "OP_GRADUATE failed" });
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            await doc.ref.update({ graduationError: msg, graduationErrorAt: FieldValue.serverTimestamp() });
            report.errors.push({ tokenId: doc.id, error: msg });
        }
    }

    // Then: check tokens in "op_sent" stage and verify confirmation
    const opSentSnap = await db
        .collection("tokens")
        .where("graduationStage", "==", "op_sent")
        .limit(3)
        .get();

    for (const doc of opSentSnap.docs) {
        const token = doc.data();
        const jettonMaster = token.jettonMasterAddress as string;
        if (!jettonMaster) continue;

        const sentAt = token.graduationOpSentAt?.toDate?.();
        if (sentAt && Date.now() - sentAt.getTime() < TX_SETTLE_MS) continue;

        try {
            const curveData = await getBondingCurveData(jettonMaster);
            if (!curveData) continue;

            if (curveData.tonReserve > 0n) {
                // OP_GRADUATE hasn't landed yet. Retry if timed out.
                if (sentAt && Date.now() - sentAt.getTime() > STAGE_TIMEOUT_MS) {
                    await doc.ref.update({
                        graduationStage: "detected",
                        graduationError: "OP_GRADUATE not confirmed, retrying",
                    });
                }
                continue;
            }

            // tonReserve is 0 — confirmed. Advance to LP creation.
            await doc.ref.update({
                graduationStage: "lp_pending",
                graduationOpConfirmedAt: FieldValue.serverTimestamp(),
                graduationError: FieldValue.delete(),
            });
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Verification failed";
            report.errors.push({ tokenId: doc.id, error: msg });
        }
    }

    return processed;
}

// ─── Stage 3: Create LP & Lock ───────────────────────────────────────────────

/**
 * For "lp_pending" tokens, create the initial LP on STON.fi and lock liquidity.
 */
async function processLpCreation(report: GraduationReport): Promise<string[]> {
    const processed: string[] = [];

    const snapshot = await db
        .collection("tokens")
        .where("graduationStage", "==", "lp_pending")
        .limit(1) // One at a time — LP creation involves multiple on-chain txs
        .get();

    for (const doc of snapshot.docs) {
        const token = doc.data();
        const jettonMaster = token.jettonMasterAddress as string;
        if (!jettonMaster) continue;

        const gradData = token.graduationData as {
            liquidityTon: string;
            lpTokenAmount: string;
        } | undefined;

        if (!gradData) {
            report.errors.push({ tokenId: doc.id, error: "Missing graduation data" });
            continue;
        }

        try {
            const poolAddress = await createInitialLp(
                jettonMaster,
                gradData.liquidityTon,
                gradData.lpTokenAmount,
            );

            // Mark as fully graduated
            await doc.ref.update({
                status: "graduated",
                isGraduated: true,
                mintable: false,
                graduationStage: "completed",
                graduatedAt: FieldValue.serverTimestamp(),
                dexPoolAddress: poolAddress,
                graduationError: FieldValue.delete(),
            });

            // Graduation log
            await db.collection("graduationLogs").add({
                tokenId: doc.id,
                tokenName: token.name,
                tokenSymbol: token.symbol,
                jettonMasterAddress: jettonMaster,
                poolAddress,
                tonForLp: gradData.liquidityTon,
                tokensForLp: gradData.lpTokenAmount,
                timestamp: FieldValue.serverTimestamp(),
            });

            processed.push(doc.id);
        } catch (error) {
            const msg = error instanceof Error ? error.message : "LP creation failed";
            await doc.ref.update({
                graduationError: msg,
                graduationErrorAt: FieldValue.serverTimestamp(),
            });
            report.errors.push({ tokenId: doc.id, error: msg });
        }
    }

    return processed;
}

// ─── LP Helpers ──────────────────────────────────────────────────────────────

/**
 * Create initial LP pool on STON.fi and lock liquidity permanently.
 *
 * Flow:
 * 1. Get STON.fi router metadata
 * 2. Build two LP deposit txs (TON leg + Jetton leg) via dexFactory
 * 3. Send both from the platform wallet in a single transfer
 * 4. Wait for pool creation, retrieve pool address
 * 5. Send LP tokens to the zero address (permanent lock)
 *
 * @returns The STON.fi pool address
 */
async function createInitialLp(
    jettonMasterAddress: string,
    tonAmountNano: string,
    tokenAmountNano: string,
): Promise<string> {
    const contractAdapter = getContractAdapter();
    const stonApi = new StonApiClient();

    // 1. Get router metadata
    const routerMetadata = await stonApi.getRouter(DEX_CONFIG.routerAddress);
    const dexContracts = dexFactory(routerMetadata);
    const router = contractAdapter.open(
        dexContracts.Router.create(DEX_CONFIG.routerAddress),
    );
    const proxyTon = dexContracts.pTON.create(
        routerMetadata.ptonMasterAddress,
    );

    // 2. Build both LP deposit legs
    const tonLeg = await router.getProvideLiquidityTonTxParams({
        userWalletAddress: PLATFORM_WALLET_ADDRESS,
        sendAmount: tonAmountNano,
        otherTokenAddress: jettonMasterAddress,
        minLpOut: "1", // Accept any LP amount for initial provision
        proxyTon,
    });

    const jettonLeg = await router.getProvideLiquidityJettonTxParams({
        userWalletAddress: PLATFORM_WALLET_ADDRESS,
        sendTokenAddress: jettonMasterAddress,
        sendAmount: tokenAmountNano,
        otherTokenAddress: proxyTon.address.toString(),
        minLpOut: "1",
    });

    // 3. Send both legs in a single wallet transfer
    const lpResult = await sendMultipleFromPlatformWallet({
        messages: [
            { to: tonLeg.to.toString(), value: tonLeg.value, body: tonLeg.body ?? undefined },
            { to: jettonLeg.to.toString(), value: jettonLeg.value, body: jettonLeg.body ?? undefined },
        ],
    });

    if (!lpResult.success) {
        throw new Error(`LP deposit failed: ${lpResult.error}`);
    }

    // 4. Wait for pool creation and retrieve pool address
    await new Promise((resolve) => setTimeout(resolve, 20_000));

    let poolAddress: string | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const pools = await stonApi.queryPools({
                condition: `token0Address == "${jettonMasterAddress}" || token1Address == "${jettonMasterAddress}"`,
            });

            const tonPool = pools.find(
                (p: { token0Address: string; token1Address: string }) =>
                    p.token0Address === TON_ADDRESS || p.token1Address === TON_ADDRESS,
            );

            if (tonPool) {
                poolAddress = (tonPool as { address: string }).address;
                break;
            }
        } catch {
            // API might not have indexed the pool yet
        }

        if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 15_000));
        }
    }

    if (!poolAddress) {
        throw new Error("Pool not found after LP deposit — may need manual verification");
    }

    // 5. Lock liquidity: send all LP tokens to the zero address
    try {
        await lockLpTokens(poolAddress);
    } catch (error) {
        // LP created successfully but lock failed — log but don't fail graduation
        console.error(`[graduation] LP lock failed for pool ${poolAddress}:`, error);
    }

    return poolAddress;
}

/**
 * Permanently lock LP by transferring all LP tokens to the zero address.
 * LP tokens are TEP-74 jettons, so we use a standard jetton transfer.
 */
async function lockLpTokens(poolAddress: string): Promise<void> {
    const stonApi = new StonApiClient();
    const contractAdapter = getContractAdapter();

    // Get pool info to find LP wallet for the platform
    const routerMetadata = await stonApi.getRouter(DEX_CONFIG.routerAddress);
    const dexContracts = dexFactory(routerMetadata);
    const pool = contractAdapter.open(dexContracts.Pool.create(poolAddress));

    // Get platform's LP jetton wallet
    const lpWallet = contractAdapter.open(
        await pool.getJettonWallet({ ownerAddress: PLATFORM_WALLET_ADDRESS }),
    );

    const walletData = await lpWallet.getWalletData();
    const lpBalance = walletData.balance;

    if (lpBalance <= 0n) {
        console.warn("[graduation] No LP tokens to lock");
        return;
    }

    // Dead address — tokens sent here are permanently inaccessible
    const DEAD_ADDRESS = Address.parse(TON_ADDRESS);

    // Build TEP-74 jetton transfer to dead address
    const transferBody = beginCell()
        .storeUint(OP_JETTON_TRANSFER, 32)
        .storeUint(Date.now(), 64)       // query_id
        .storeCoins(lpBalance)           // amount
        .storeAddress(DEAD_ADDRESS)      // destination
        .storeAddress(Address.parse(PLATFORM_WALLET_ADDRESS)) // response_destination
        .storeBit(false)                 // no custom_payload
        .storeCoins(1n)                  // forward_ton_amount (minimal)
        .storeBit(false)                 // no forward_payload
        .endCell();

    const result = await sendFromPlatformWallet({
        to: lpWallet.address.toString(),
        value: toNano("0.1"),
        body: transferBody,
    });

    if (!result.success) {
        throw new Error(`LP lock transfer failed: ${result.error}`);
    }
}
