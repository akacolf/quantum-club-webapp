import { NextRequest, NextResponse } from "next/server";
import { Address, toNano } from "@ton/core";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { 
    ADMIN_API_KEY,
    DEX_CONFIG 
} from "@/lib/platform-config";
import {
    isPlatformWalletConfigured,
    sendFromPlatformWallet,
    buildWithdrawFeesMessage,
    buildGraduateMessage,
} from "@/lib/platform-wallet";
import { runGetMethod } from "@/lib/ton-api";

// Minimum fees worth withdrawing (0.1 TON to cover gas)
const MIN_FEES_TO_WITHDRAW = toNano("0.1");

// Gas for operations
const WITHDRAW_GAS = toNano("0.05");
const GRADUATE_GAS = toNano("0.15");

interface TokenData {
    id: string;
    name: string;
    symbol: string;
    jettonMasterAddress: string;
    isOnChain: boolean;
    isGraduated: boolean;
    creatorWallet: string;
}

interface ProcessResult {
    tokenId: string;
    symbol: string;
    action: "withdraw_fees" | "graduate" | "skip";
    success: boolean;
    error?: string;
    feesWithdrawn?: string;
}

/**
 * GET /api/cron/process-tokens
 * 
 * Automated cron job to:
 * 1. Withdraw accumulated platform fees from all tokens
 * 2. Graduate tokens that have reached the threshold
 * 
 * This endpoint is called by Vercel Cron or can be triggered manually with API key.
 * 
 * Headers:
 *   Authorization: Bearer <CRON_SECRET> (Vercel cron)
 *   OR
 *   x-api-key: <ADMIN_API_KEY> (manual trigger)
 */
export async function GET(request: NextRequest) {
    try {
        // Verify authorization
        const authHeader = request.headers.get("authorization");
        const apiKey = request.headers.get("x-api-key");
        const cronSecret = process.env.CRON_SECRET;

        const isVercelCron = authHeader === `Bearer ${cronSecret}` && cronSecret;
        const isAdminKey = apiKey === ADMIN_API_KEY && ADMIN_API_KEY;

        if (!isVercelCron && !isAdminKey) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Check platform wallet configuration
        if (!isPlatformWalletConfigured()) {
            return NextResponse.json({
                error: "Platform wallet not configured",
                hint: "Set PLATFORM_WALLET_MNEMONIC and NEXT_PUBLIC_PLATFORM_WALLET in environment",
            }, { status: 500 });
        }

        // Get all on-chain tokens that are not graduated
        const tokensSnapshot = await adminDb.collection("tokens")
            .where("isOnChain", "==", true)
            .get();

        if (tokensSnapshot.empty) {
            return NextResponse.json({
                success: true,
                message: "No tokens to process",
                processed: 0,
            });
        }

        const tokens: TokenData[] = tokensSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as TokenData[];

        const results: ProcessResult[] = [];
        let feesCollected = BigInt(0);
        let tokensGraduated = 0;

        // Process each token
        for (const token of tokens) {
            if (!token.jettonMasterAddress) {
                results.push({
                    tokenId: token.id,
                    symbol: token.symbol,
                    action: "skip",
                    success: true,
                    error: "No jetton address",
                });
                continue;
            }

            try {
                const jettonAddress = Address.parse(token.jettonMasterAddress);
                const addressStr = jettonAddress.toString();

                // Query on-chain state
                let platformFees = BigInt(0);
                let tonReserve = BigInt(0);
                let graduated = 0;
                let graduationTarget = BigInt(0);

                try {
                    // get_curve_data returns: total_supply, ton_reserve, current_price, graduated, graduation_target, total_fees
                    const curveResult = await runGetMethod(addressStr, "get_curve_data");
                    if (curveResult.stack) {
                        curveResult.stack.readBigNumber(); // Skip total_supply
                        tonReserve = curveResult.stack.readBigNumber();
                        curveResult.stack.readBigNumber(); // Skip current_price
                        graduated = Number(curveResult.stack.readBigNumber());
                        graduationTarget = curveResult.stack.readBigNumber();
                    }
                    
                    // get_fees_data returns: platform_fees, creator_fees
                    const feesResult = await runGetMethod(addressStr, "get_fees_data");
                    if (feesResult.stack) {
                        platformFees = feesResult.stack.readBigNumber();
                    }
                } catch (err) {
                    // Contract might not have this method or is not deployed
                    console.error(`Failed to query ${token.symbol}:`, err);
                    results.push({
                        tokenId: token.id,
                        symbol: token.symbol,
                        action: "skip",
                        success: false,
                        error: "Failed to query contract",
                    });
                    continue;
                }

                // Check if already graduated on-chain but not in DB
                if (graduated === 1 && !token.isGraduated) {
                    await adminDb.collection("tokens").doc(token.id).update({
                        isGraduated: true,
                        graduatedAt: new Date(),
                    });
                }

                // Priority 1: Graduate if threshold reached and not yet graduated
                if (graduated === 0 && tonReserve >= graduationTarget) {
                    console.log(`Graduating ${token.symbol}: ${tonReserve}/${graduationTarget} TON`);

                    const graduateBody = buildGraduateMessage(DEX_CONFIG.routerAddress);
                    const result = await sendFromPlatformWallet({
                        to: token.jettonMasterAddress,
                        value: GRADUATE_GAS,
                        body: graduateBody,
                    });

                    if (result.success) {
                        tokensGraduated++;
                        
                        // Update Firestore
                        await adminDb.collection("tokens").doc(token.id).update({
                            isGraduated: true,
                            graduatedAt: new Date(),
                            dexPlatform: "stonfi",
                        });

                        results.push({
                            tokenId: token.id,
                            symbol: token.symbol,
                            action: "graduate",
                            success: true,
                        });
                    } else {
                        results.push({
                            tokenId: token.id,
                            symbol: token.symbol,
                            action: "graduate",
                            success: false,
                            error: result.error,
                        });
                    }

                    continue; // Don't withdraw fees in same run as graduation
                }

                // Priority 2: Withdraw fees if above minimum
                if (platformFees >= MIN_FEES_TO_WITHDRAW) {
                    console.log(`Withdrawing fees from ${token.symbol}: ${platformFees} nanoTON`);

                    const withdrawBody = buildWithdrawFeesMessage();
                    const result = await sendFromPlatformWallet({
                        to: token.jettonMasterAddress,
                        value: WITHDRAW_GAS,
                        body: withdrawBody,
                    });

                    if (result.success) {
                        feesCollected += platformFees;
                        results.push({
                            tokenId: token.id,
                            symbol: token.symbol,
                            action: "withdraw_fees",
                            success: true,
                            feesWithdrawn: platformFees.toString(),
                        });
                    } else {
                        results.push({
                            tokenId: token.id,
                            symbol: token.symbol,
                            action: "withdraw_fees",
                            success: false,
                            error: result.error,
                        });
                    }

                } else {
                    results.push({
                        tokenId: token.id,
                        symbol: token.symbol,
                        action: "skip",
                        success: true,
                        error: platformFees > 0 
                            ? `Fees too low: ${platformFees} nanoTON` 
                            : "No fees",
                    });
                }
            } catch (error) {
                console.error(`Error processing ${token.symbol}:`, error);
                results.push({
                    tokenId: token.id,
                    symbol: token.symbol,
                    action: "skip",
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }

        // Log summary
        const summary = {
            success: true,
            timestamp: new Date().toISOString(),
            tokensProcessed: tokens.length,
            tokensGraduated,
            feesCollected: feesCollected.toString(),
            feesCollectedTON: Number(feesCollected) / 1e9,
            results,
        };

        console.log("Cron job completed:", JSON.stringify(summary, null, 2));

        return NextResponse.json(summary);
    } catch (error) {
        console.error("Cron job error:", error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : "Internal error" 
            },
            { status: 500 }
        );
    }
}

// Vercel cron configuration
export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60 seconds for processing
