/**
 * QC RocketStart - Firebase Cloud Functions
 * 
 * Functions for automatic token graduation from bonding curve to DEX
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { StonApiClient } from "@ston-fi/api";
import { dexFactory } from "@ston-fi/sdk";
import { TonClient, WalletContractV4, internal } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { beginCell, Address, toNano } from "@ton/core";
import { getHttpEndpoint } from "@orbs-network/ton-access";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Types
interface GraduationQueueItem {
    tokenId: string;
    tokenSymbol: string;
    tokenName: string;
    marketCap: string;
    collectedTon: string;
    creatorAddress: string;
    status: string;
    retryCount?: number;
}

interface GraduationResult {
    success: boolean;
    poolAddress?: string;
    jettonAddress?: string;
    txHash?: string;
    error?: string;
}

// Cache for Orbs endpoint
let cachedOrbsEndpoint: string | null = null;

// Fallback endpoint when Orbs is down
const FALLBACK_ENDPOINT = "https://toncenter.com/api/v2/jsonRPC";

async function getOrbsEndpoint(): Promise<string> {
    if (cachedOrbsEndpoint) return cachedOrbsEndpoint;
    
    try {
        cachedOrbsEndpoint = await getHttpEndpoint({ network: "mainnet" });
        console.log("[functions] Using Orbs endpoint:", cachedOrbsEndpoint);
    } catch (error) {
        console.warn("[functions] Orbs unavailable, using toncenter fallback:", error);
        cachedOrbsEndpoint = FALLBACK_ENDPOINT;
    }
    return cachedOrbsEndpoint;
}

// Configuration
const config = {
    // TON price in USD (should be fetched dynamically in production)
    tonPriceUsd: 5,
    // Graduation threshold in USD
    defaultThreshold: 69000,
    // Platform wallet mnemonic (set via Firebase environment config)
    platformMnemonic: functions.config().platform?.mnemonic || "",
};

/**
 * Check if a token has reached graduation threshold
 */
function isReadyToGraduate(
    marketCapNano: string,
    thresholdUsd: number,
    tonPriceUsd: number
): boolean {
    const marketCapTon = Number(marketCapNano) / 1e9;
    const marketCapUsd = marketCapTon * tonPriceUsd;
    return marketCapUsd >= thresholdUsd;
}

/**
 * Triggered when a token document is updated
 * Checks if the token should graduate to DEX
 */
export const onTokenUpdate = functions.firestore
    .document("tokens/{tokenId}")
    .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
        const tokenId = context.params.tokenId;
        const before = change.before.data();
        const after = change.after.data();

        if (!before || !after) {
            return null;
        }

        // Skip if not in bonding phase
        if (after.status !== "bonding") {
            return null;
        }

        // Skip if already processed
        if (before.marketCap === after.marketCap) {
            return null;
        }

        const threshold = parseFloat(after.graduationThreshold || config.defaultThreshold);

        // Check if ready to graduate
        if (isReadyToGraduate(after.marketCap, threshold, config.tonPriceUsd)) {
            functions.logger.info(`Token ${tokenId} (${after.symbol}) ready for graduation`, {
                marketCap: after.marketCap,
                threshold,
            });

            // Mark as pending graduation
            await change.after.ref.update({
                graduationPending: true,
                graduationRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Log the graduation event
            await db.collection("graduationQueue").add({
                tokenId,
                tokenSymbol: after.symbol,
                tokenName: after.name,
                marketCap: after.marketCap,
                collectedTon: after.collectedTon || "0",
                creatorAddress: after.creatorAddress,
                status: "pending",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return { success: true, action: "queued_for_graduation" };
        }

        return null;
    });

/**
 * Scheduled function that runs every 5 minutes
 * Processes the graduation queue and creates LP pools
 */
export const processGraduationQueue = functions.pubsub
    .schedule("every 5 minutes")
    .onRun(async () => {
        functions.logger.info("Processing graduation queue...");

        // Get pending graduations
        const pendingSnapshot = await db.collection("graduationQueue")
            .where("status", "==", "pending")
            .orderBy("createdAt", "asc")
            .limit(5)
            .get();

        if (pendingSnapshot.empty) {
            functions.logger.info("No pending graduations");
            return null;
        }

        for (const doc of pendingSnapshot.docs) {
            const graduation = doc.data() as GraduationQueueItem;

            try {
                functions.logger.info(`Processing graduation for ${graduation.tokenSymbol}`);

                // Update status to processing
                await doc.ref.update({
                    status: "processing",
                    processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // For now, we'll simulate the graduation
                // In production, replace with actual LP creation
                const result = await simulateGraduation(graduation);

                if (result.success) {
                    // Update token status
                    await db.collection("tokens").doc(graduation.tokenId).update({
                        status: "graduated",
                        graduatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        dexPoolAddress: result.poolAddress,
                        jettonMasterAddress: result.jettonAddress,
                        graduationPending: false,
                    });

                    // Update queue status
                    await doc.ref.update({
                        status: "completed",
                        completedAt: admin.firestore.FieldValue.serverTimestamp(),
                        result,
                    });

                    functions.logger.info(`Token ${graduation.tokenSymbol} graduated successfully`);
                } else {
                    throw new Error(result.error || "Graduation failed");
                }
            } catch (error) {
                functions.logger.error(`Graduation failed for ${graduation.tokenSymbol}:`, error);

                await doc.ref.update({
                    status: "failed",
                    failedAt: admin.firestore.FieldValue.serverTimestamp(),
                    error: error instanceof Error ? error.message : "Unknown error",
                    retryCount: (graduation.retryCount || 0) + 1,
                });
            }
        }

        return null;
    });

/**
 * Simulate graduation process (for testing)
 * In production, replace with actual LP creation
 */
async function simulateGraduation(graduation: GraduationQueueItem): Promise<GraduationResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate mock addresses (in production, these come from actual deployment)
    const mockPoolAddress = `EQ${Buffer.from(graduation.tokenId).toString("hex").slice(0, 44).padEnd(44, "0")}`;
    const mockJettonAddress = `EQ${Buffer.from(`${graduation.tokenSymbol}_jetton`).toString("hex").slice(0, 44).padEnd(44, "0")}`;

    return {
        success: true,
        poolAddress: mockPoolAddress,
        jettonAddress: mockJettonAddress,
        txHash: `simulated_tx_${Date.now()}`,
    };
}

/**
 * HTTP endpoint to manually trigger graduation (admin only)
 */
export const triggerGraduation = functions.https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");

    if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Methods", "POST");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    // Verify admin token (implement proper auth in production)
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    const { tokenId } = req.body;
    if (!tokenId) {
        res.status(400).json({ error: "Token ID required" });
        return;
    }

    try {
        // Get token
        const tokenDoc = await db.collection("tokens").doc(tokenId).get();
        if (!tokenDoc.exists) {
            res.status(404).json({ error: "Token not found" });
            return;
        }

        const token = tokenDoc.data()!;

        if (token.status !== "bonding") {
            res.status(400).json({ error: "Token is not in bonding phase" });
            return;
        }

        // Add to graduation queue
        await db.collection("graduationQueue").add({
            tokenId,
            tokenSymbol: token.symbol,
            tokenName: token.name,
            marketCap: token.marketCap,
            collectedTon: token.collectedTon || "0",
            creatorAddress: token.creatorAddress,
            status: "pending",
            manualTrigger: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({
            success: true,
            message: `Token ${token.symbol} queued for graduation`,
        });
    } catch (error) {
        functions.logger.error("Trigger graduation error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * Create liquidity pool on STON.fi
 * This is the production version that actually creates the pool
 */
async function createLiquidityPool(
    tokenAddress: string,
    tonAmountNano: string,
    _tokenAmountNano: string, // Unused but kept for future use
    platformMnemonic: string
): Promise<{
    success: boolean;
    poolAddress?: string;
    txHash?: string;
    error?: string;
}> {
    try {
        if (!platformMnemonic) {
            return { success: false, error: "Platform mnemonic not configured" };
        }

        // Initialize TON client using Orbs Network (rate-limit free!)
        const orbsEndpoint = await getOrbsEndpoint();
        const tonClient = new TonClient({ endpoint: orbsEndpoint });

        // Derive wallet from mnemonic
        const keyPair = await mnemonicToPrivateKey(platformMnemonic.split(" "));
        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
        });

        const walletContract = tonClient.open(wallet);
        const walletAddress = walletContract.address.toString();

        functions.logger.info(`Platform wallet: ${walletAddress}`);

        // Get STON.fi router info via simulation
        const stonApi = new StonApiClient();
        const simulation = await stonApi.simulateSwap({
            offerAddress: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c", // TON
            askAddress: tokenAddress,
            offerUnits: tonAmountNano,
            slippageTolerance: "0.05",
        });

        // Build DEX contracts
        const dexContracts = dexFactory(simulation.router);
        const router = tonClient.open(
            dexContracts.Router.create(simulation.router.address)
        );
        const proxyTon = dexContracts.pTON.create(simulation.router.ptonMasterAddress);

        // Build provide liquidity transaction
        const txParams = await router.getProvideLiquidityTonTxParams({
            userWalletAddress: walletAddress,
            sendAmount: tonAmountNano,
            otherTokenAddress: tokenAddress,
            minLpOut: "1", // Accept any amount of LP tokens
            proxyTon,
        });

        // Get seqno and send transaction
        const seqno = await walletContract.getSeqno();
        await walletContract.sendTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            messages: [internal({
                to: txParams.to,
                value: txParams.value,
                body: txParams.body,
            })],
        });

        // Wait for transaction to be confirmed
        await new Promise(resolve => setTimeout(resolve, 15000));

        // Get pool address from STON.fi
        const pools = await stonApi.queryPools({
            condition: `token0Address == "${tokenAddress}" || token1Address == "${tokenAddress}"`,
        });

        const tonPool = pools.find((p: { token0Address: string; token1Address: string }) =>
            p.token0Address === "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c" ||
            p.token1Address === "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c"
        );

        return {
            success: true,
            poolAddress: tonPool?.address || "pending",
            txHash: `${seqno}`,
        };
    } catch (error) {
        functions.logger.error("LP creation failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Burn LP tokens to permanently lock liquidity
 * This sends LP tokens to a burn address (zero address)
 */
async function burnLpTokens(
    lpTokenAddress: string,
    lpAmount: string,
    platformMnemonic: string
): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
}> {
    try {
        if (!platformMnemonic) {
            return { success: false, error: "Platform mnemonic not configured" };
        }

        // Initialize TON client using Orbs Network (rate-limit free!)
        const orbsEndpoint = await getOrbsEndpoint();
        const tonClient = new TonClient({ endpoint: orbsEndpoint });

        // Derive wallet from mnemonic
        const keyPair = await mnemonicToPrivateKey(platformMnemonic.split(" "));
        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
        });

        const walletContract = tonClient.open(wallet);

        // Standard burn address (zero address) - LP tokens sent here are permanently locked
        const BURN_ADDRESS = "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";

        // Build jetton transfer to burn address
        // Jetton transfer opcode is 0xf8a7ea5
        const transferBody = beginCell()
            .storeUint(0xf8a7ea5, 32) // transfer opcode
            .storeUint(0, 64) // query_id
            .storeCoins(BigInt(lpAmount)) // amount
            .storeAddress(Address.parse(BURN_ADDRESS)) // destination
            .storeAddress(walletContract.address) // response_destination
            .storeBit(0) // no custom payload
            .storeCoins(1) // forward_ton_amount (minimal)
            .storeBit(0) // no forward payload
            .endCell();

        // Get seqno and send transaction
        const seqno = await walletContract.getSeqno();
        await walletContract.sendTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            messages: [internal({
                to: Address.parse(lpTokenAddress),
                value: toNano("0.1"), // Gas for transfer
                body: transferBody,
            })],
        });

        functions.logger.info(`LP tokens burned: ${lpAmount} sent to burn address`);

        return {
            success: true,
            txHash: `${seqno}`,
        };
    } catch (error) {
        functions.logger.error("LP burn failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Complete graduation with LP creation and burn
 * This is the full production flow
 */
async function graduateTokenWithLpBurn(
    tokenAddress: string,
    collectedTonNano: string,
    platformMnemonic: string
): Promise<{
    success: boolean;
    poolAddress?: string;
    lpBurned?: boolean;
    error?: string;
}> {
    // Step 1: Create LP
    const lpResult = await createLiquidityPool(
        tokenAddress,
        collectedTonNano,
        "0", // Token amount calculated by DEX
        platformMnemonic
    );

    if (!lpResult.success) {
        return {
            success: false,
            error: `LP creation failed: ${lpResult.error}`,
        };
    }

    functions.logger.info(`LP created at: ${lpResult.poolAddress}`);

    // Step 2: Wait for LP tokens to arrive (pool creation takes time)
    await new Promise(resolve => setTimeout(resolve, 20000));

    // Step 3: Get LP token balance and burn
    // Note: In production, you'd query the LP token contract for balance
    // For now, we'll log that burn should happen
    functions.logger.info("LP tokens should be burned after receiving them");

    // The actual burn would be:
    // const burnResult = await burnLpTokens(lpResult.poolAddress!, lpBalance, platformMnemonic);

    return {
        success: true,
        poolAddress: lpResult.poolAddress,
        lpBurned: false, // Will be true when burn is executed
    };
}

// Export for use
export { burnLpTokens, graduateTokenWithLpBurn };

/**
 * Get graduation status for a token
 */
export const getGraduationStatus = functions.https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    res.set("Access-Control-Allow-Origin", "*");

    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    const tokenId = req.query.tokenId as string;
    if (!tokenId) {
        res.status(400).json({ error: "Token ID required" });
        return;
    }

    try {
        // Get token
        const tokenDoc = await db.collection("tokens").doc(tokenId).get();
        if (!tokenDoc.exists) {
            res.status(404).json({ error: "Token not found" });
            return;
        }

        const token = tokenDoc.data()!;
        const threshold = parseFloat(token.graduationThreshold || config.defaultThreshold);
        const marketCapTon = Number(token.marketCap || "0") / 1e9;
        const marketCapUsd = marketCapTon * config.tonPriceUsd;
        const progress = Math.min(100, (marketCapUsd / threshold) * 100);

        // Check queue status
        const queueSnapshot = await db.collection("graduationQueue")
            .where("tokenId", "==", tokenId)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();

        const queueItem = queueSnapshot.empty ? null : queueSnapshot.docs[0].data();

        res.json({
            tokenId,
            symbol: token.symbol,
            status: token.status,
            marketCapUsd: marketCapUsd.toFixed(2),
            threshold,
            progress: progress.toFixed(1),
            isReadyToGraduate: marketCapUsd >= threshold && token.status === "bonding",
            queueStatus: queueItem?.status || null,
            graduatedAt: token.graduatedAt?.toDate?.() || null,
            dexPoolAddress: token.dexPoolAddress || null,
        });
    } catch (error) {
        functions.logger.error("Get graduation status error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Export createLiquidityPool for testing
export { createLiquidityPool, isReadyToGraduate };
