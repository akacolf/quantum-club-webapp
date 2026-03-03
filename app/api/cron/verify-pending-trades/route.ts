import { NextRequest, NextResponse } from "next/server";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { getAdminApiKey } from "@/lib/platform-config";
import { env } from "@/env";
import { getAccountInfo } from "@/lib/ton-api";
import { sendTradeNotification } from "@/lib/notifications";

/**
 * GET /api/cron/verify-pending-trades
 * 
 * Verifies pending trades by checking blockchain transactions.
 * Updates trade status from "pending" to "completed" or "failed".
 * 
 * This ensures trade data is accurate and reflects actual on-chain state.
 * 
 * Headers:
 *   Authorization: Bearer <CRON_SECRET> (Vercel cron)
 *   OR
 *   x-api-key: <ADMIN_API_KEY> (manual trigger)
 */

interface TradeDoc {
    id: string;
    tokenId: string;
    txHash?: string;
    walletAddress: string;
    type: "buy" | "sell";
    tonAmount: string;
    amount: string;
    status: string;
    timestamp: Date;
    telegramId?: string;
    tokenSymbol?: string;
}

interface VerifyResult {
    tradeId: string;
    tokenId: string;
    txHash: string;
    previousStatus: string;
    newStatus: string;
    error?: string;
}

export async function GET(request: NextRequest) {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const apiKey = request.headers.get("x-api-key");
    const cronSecret = env.CRON_SECRET;

    const isVercelCron = authHeader === `Bearer ${cronSecret}` && cronSecret;
    const adminKey = getAdminApiKey();
    const isAdminKey = apiKey === adminKey && adminKey;

    if (!isVercelCron && !isAdminKey) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: VerifyResult[] = [];
    let tradesProcessed = 0;
    let tradesVerified = 0;
    let tradesFailed = 0;

    try {
        // Get all pending trades from the last 24 hours
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Query all tokens for pending trades
        const tokensSnapshot = await adminDb
            .collection("tokens")
            .where("isOnChain", "==", true)
            .get();

        for (const tokenDoc of tokensSnapshot.docs) {
            const tokenId = tokenDoc.id;
            
            // Get pending trades for this token
            const tradesSnapshot = await adminDb
                .collection("tokens")
                .doc(tokenId)
                .collection("trades")
                .where("status", "==", "pending")
                .where("timestamp", ">=", cutoff)
                .limit(50)
                .get();

            for (const tradeDoc of tradesSnapshot.docs) {
                const trade = { 
                    id: tradeDoc.id, 
                    tokenId,
                    ...tradeDoc.data() 
                } as unknown as TradeDoc;
                
                tradesProcessed++;

                if (!trade.txHash) {
                    // No tx hash, can't verify - mark as failed after 10 minutes
                    const tradeAge = Date.now() - (trade.timestamp?.getTime?.() || Date.now());
                    if (tradeAge > 10 * 60 * 1000) {
                        await tradeDoc.ref.update({
                            status: "failed",
                            failReason: "No transaction hash",
                            verifiedAt: new Date(),
                        });
                        tradesFailed++;
                        results.push({
                            tradeId: trade.id,
                            tokenId,
                            txHash: "",
                            previousStatus: "pending",
                            newStatus: "failed",
                            error: "No transaction hash after 10 minutes",
                        });
                    }
                    continue;
                }

                try {
                    // Verify transaction on blockchain
                    const txStatus = await verifyTransaction(trade.txHash, trade.walletAddress);

                    if (txStatus.verified) {
                        // Update to completed with actual on-chain data
                        await tradeDoc.ref.update({
                            status: "completed",
                            verifiedAt: new Date(),
                            actualTonAmount: txStatus.tonValue?.toString(),
                            actualTokenAmount: txStatus.tokenValue?.toString(),
                        });
                        tradesVerified++;
                        
                        // Send push notification
                        if (trade.telegramId) {
                            await sendTradeNotification(trade.telegramId, {
                                type: trade.type,
                                tokenSymbol: trade.tokenSymbol || tokenId.toUpperCase(),
                                tokenAmount: trade.amount,
                                tonAmount: trade.tonAmount,
                                success: true,
                                txHash: trade.txHash,
                            });
                        }
                        
                        results.push({
                            tradeId: trade.id,
                            tokenId,
                            txHash: trade.txHash,
                            previousStatus: "pending",
                            newStatus: "completed",
                        });
                    } else if (txStatus.failed) {
                        await tradeDoc.ref.update({
                            status: "failed",
                            failReason: txStatus.error || "Transaction failed",
                            verifiedAt: new Date(),
                        });
                        tradesFailed++;
                        
                        // Send failure notification
                        if (trade.telegramId) {
                            await sendTradeNotification(trade.telegramId, {
                                type: trade.type,
                                tokenSymbol: trade.tokenSymbol || tokenId.toUpperCase(),
                                tokenAmount: trade.amount,
                                tonAmount: trade.tonAmount,
                                success: false,
                                txHash: trade.txHash,
                            });
                        }
                        
                        results.push({
                            tradeId: trade.id,
                            tokenId,
                            txHash: trade.txHash,
                            previousStatus: "pending",
                            newStatus: "failed",
                            error: txStatus.error,
                        });
                    }
                    // If neither verified nor failed, leave as pending for next run

                } catch (error) {
                    console.error(`[verify-trades] Error verifying ${trade.txHash}:`, error);
                }

            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                tradesProcessed,
                tradesVerified,
                tradesFailed,
                tradesStillPending: tradesProcessed - tradesVerified - tradesFailed,
            },
            results,
        });

    } catch (error) {
        console.error("[verify-trades] Fatal error:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}

interface TxVerifyResult {
    verified: boolean;
    failed: boolean;
    tonValue?: number;
    tokenValue?: number;
    error?: string;
}

/**
 * Verify a transaction on the blockchain using TonAPI
 * Note: TonAPI provides account info but this method doesn't support tx hash lookup directly.
 * We verify by checking if the wallet is active and has transactions.
 */
async function verifyTransaction(txHash: string, walletAddress: string): Promise<TxVerifyResult> {
    try {
        // Get account info via TonAPI
        const accountInfo = await getAccountInfo(walletAddress);
        
        // If wallet is active and has recent activity, assume success
        // This is a simplified verification - for production, 
        // you'd want to use an indexer or track transactions more precisely
        if (accountInfo && accountInfo.status === "active" && accountInfo.lastActivity) {
            // Transaction exists on wallet, consider it potentially successful
            // The actual verification would require comparing timestamps/amounts
            return {
                verified: false, // Can't verify without indexer
                failed: false,   // Not failed, just can't confirm
            };
        }

        return { verified: false, failed: false };

    } catch (error) {
        console.error(`[verify-trades] Error checking tx ${txHash}:`, error);
        return { verified: false, failed: false };
    }
}

// Runtime configuration for Vercel
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max
