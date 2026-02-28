import { NextRequest, NextResponse } from "next/server";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { ADMIN_API_KEY } from "@/lib/platform-config";
import { getBondingCurveData, getJettonInfo } from "@/lib/ton-api";

/**
 * GET /api/cron/sync-token-data
 * 
 * Syncs on-chain token data to Firestore:
 * - totalSupply
 * - tonReserve
 * - currentPrice
 * - holders count
 * - graduated status
 * 
 * This ensures Firestore cache matches blockchain state.
 * 
 * Headers:
 *   Authorization: Bearer <CRON_SECRET> (Vercel cron)
 *   OR
 *   x-api-key: <ADMIN_API_KEY> (manual trigger)
 */

interface TokenDoc {
    id: string;
    jettonMasterAddress: string;
    isOnChain: boolean;
    isDeployed: boolean;
}

interface CurveData {
    totalSupply: string;
    tonReserve: string;
    currentPrice: string;
    graduated: boolean;
    graduationTarget: string;
}

interface SyncResult {
    tokenId: string;
    address: string;
    success: boolean;
    updated?: Partial<CurveData & { holders: number }>;
    error?: string;
}

export async function GET(request: NextRequest) {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const apiKey = request.headers.get("x-api-key");
    const cronSecret = process.env.CRON_SECRET;

    const isVercelCron = authHeader === `Bearer ${cronSecret}` && cronSecret;
    const isAdminKey = apiKey === ADMIN_API_KEY && ADMIN_API_KEY;

    if (!isVercelCron && !isAdminKey) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: SyncResult[] = [];
    let tokensProcessed = 0;
    let tokensSynced = 0;

    try {
        // Get all deployed on-chain tokens
        const tokensSnapshot = await adminDb
            .collection("tokens")
            .where("isOnChain", "==", true)
            .where("isDeployed", "==", true)
            .get();

        console.log(`[sync-token-data] Found ${tokensSnapshot.size} tokens to sync`);

        for (const doc of tokensSnapshot.docs) {
            const token = { id: doc.id, ...doc.data() } as TokenDoc;
            tokensProcessed++;

            if (!token.jettonMasterAddress) {
                results.push({
                    tokenId: token.id,
                    address: "",
                    success: false,
                    error: "No jetton address",
                });
                continue;
            }

            try {
                // Fetch on-chain data from TONAPI
                const [curveData, holdersData] = await Promise.all([
                    fetchCurveData(token.jettonMasterAddress),
                    fetchHoldersCount(token.jettonMasterAddress),
                ]);

                if (!curveData) {
                    results.push({
                        tokenId: token.id,
                        address: token.jettonMasterAddress,
                        success: false,
                        error: "Failed to fetch curve data",
                    });
                    continue;
                }

                // Prepare update
                const updates: Record<string, unknown> = {
                    totalSupply: curveData.totalSupply,
                    tonReserve: curveData.tonReserve,
                    currentPrice: curveData.currentPrice,
                    isGraduated: curveData.graduated,
                    graduationTarget: curveData.graduationTarget,
                    lastSyncedAt: new Date(),
                };

                if (holdersData !== null) {
                    updates.holders = holdersData;
                }

                // Update Firestore
                await adminDb.collection("tokens").doc(token.id).update(updates);

                tokensSynced++;
                results.push({
                    tokenId: token.id,
                    address: token.jettonMasterAddress,
                    success: true,
                    updated: {
                        totalSupply: curveData.totalSupply,
                        tonReserve: curveData.tonReserve,
                        currentPrice: curveData.currentPrice,
                        graduated: curveData.graduated,
                        holders: holdersData ?? undefined,
                    },
                });

            } catch (error) {
                console.error(`[sync-token-data] Error syncing ${token.id}:`, error);
                results.push({
                    tokenId: token.id,
                    address: token.jettonMasterAddress,
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }

        }

        return NextResponse.json({
            success: true,
            summary: {
                tokensProcessed,
                tokensSynced,
                tokensFailed: tokensProcessed - tokensSynced,
            },
            results,
        });

    } catch (error) {
        console.error("[sync-token-data] Fatal error:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            results,
        }, { status: 500 });
    }
}

/**
 * Fetch bonding curve data from contract via Orbs Network (rate-limit free!)
 */
async function fetchCurveData(address: string): Promise<CurveData | null> {
    try {
        const data = await getBondingCurveData(address);
        
        if (!data) {
            console.log(`[sync-token-data] get_curve_data returned no data for ${address}`);
            return null;
        }
        
        return {
            totalSupply: data.totalSupply.toString(),
            tonReserve: data.tonReserve.toString(),
            currentPrice: data.basePrice.toString(),
            graduated: data.isGraduated,
            graduationTarget: data.graduationThreshold.toString(),
        };

    } catch (error) {
        console.error(`[sync-token-data] Error fetching curve data for ${address}:`, error);
        return null;
    }
}

/**
 * Fetch holder count using Orbs Network
 * Note: Holder count requires indexed data; we estimate from jetton info
 */
async function fetchHoldersCount(address: string): Promise<number | null> {
    try {
        // Orbs doesn't provide indexed holder counts directly
        // We can only verify the contract exists and get basic jetton data
        const jettonInfo = await getJettonInfo(address);
        
        if (!jettonInfo) {
            return null;
        }
        
        // Return null to indicate we couldn't get holder count
        // The sync will skip updating holders field
        return null;

    } catch (error) {
        console.error(`[sync-token-data] Error fetching holders for ${address}:`, error);
        return null;
    }
}

// Runtime configuration for Vercel
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max
