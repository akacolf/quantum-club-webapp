import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Address, beginCell, toNano } from "@ton/core";
import { firestore as adminDb } from "@/app/(firebase)/server";
import {
    getAdminApiKey,
    PLATFORM_WALLET_ADDRESS,
    DEX_CONFIG
} from "@/lib/platform-config";
import { runGetMethod } from "@/lib/ton-api";
import { adminGraduateSchema } from "@/lib/validations";

const confirmGraduationSchema = z.object({
    tokenId: z.string().min(1, "Token ID is required"),
    txHash: z.string().optional(),
    poolAddress: z.string().optional(),
});

/**
 * POST /api/admin/graduate
 * 
 * Initiate graduation of a token to STON.fi DEX.
 * This is a two-step process:
 * 1. This endpoint checks eligibility and returns the graduate transaction
 * 2. Platform wallet signs and sends the transaction
 * 3. After confirmation, PATCH endpoint creates the DEX pool
 * 
 * Headers:
 *   x-api-key: Admin API key
 * 
 * Body: {
 *   tokenId: string;     // Firestore token ID
 *   jettonAddress: string; // Token contract address
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // Verify API key
        const apiKey = request.headers.get("x-api-key");
        const adminKey = getAdminApiKey();
        if (!adminKey || apiKey !== adminKey) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (!PLATFORM_WALLET_ADDRESS) {
            return NextResponse.json(
                { error: "Platform wallet not configured" },
                { status: 500 }
            );
        }

        const body = await request.json();
        const parsed = adminGraduateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            );
        }
        const { tokenId, jettonAddress } = parsed.data;

        // Parse and validate address
        let targetAddress: Address;
        try {
            targetAddress = Address.parse(jettonAddress);
        } catch {
            return NextResponse.json(
                { error: "Invalid jetton address" },
                { status: 400 }
            );
        }

        // Verify token exists and is not already graduated
        const tokenDoc = await adminDb.collection("tokens").doc(tokenId).get();
        if (!tokenDoc.exists) {
            return NextResponse.json(
                { error: "Token not found" },
                { status: 404 }
            );
        }

        const tokenData = tokenDoc.data()!;
        if (tokenData.isGraduated) {
            return NextResponse.json(
                { error: "Token already graduated" },
                { status: 400 }
            );
        }

        // Query on-chain state to verify graduation eligibility
        const targetAddressStr = targetAddress.toString();

        try {
            const result = await runGetMethod(targetAddressStr, "get_bonding_curve_data");
            
            let tonReserve = BigInt(0);
            let graduated = 0;
            let graduationTarget = BigInt(0);
            
            if (result.stack) {
                tonReserve = result.stack.readBigNumber();
                graduated = Number(result.stack.readBigNumber());
                graduationTarget = result.stack.readBigNumber();
            }

            if (graduated === 1) {
                // Update Firestore to match on-chain state
                await adminDb.collection("tokens").doc(tokenId).update({
                    isGraduated: true,
                });
                return NextResponse.json(
                    { error: "Token already graduated on-chain" },
                    { status: 400 }
                );
            }

            if (tonReserve < graduationTarget) {
                return NextResponse.json({
                    error: "Token has not reached graduation threshold",
                    currentReserve: tonReserve.toString(),
                    required: graduationTarget.toString(),
                }, { status: 400 });
            }
        } catch (error) {
            console.error("Failed to query on-chain state:", error);
            // Continue anyway - let the contract validate
        }

        // Build graduate message
        // op::graduate = 0x47524144 ("GRAD")
        const dexRouterAddress = Address.parse(DEX_CONFIG.routerAddress);
        
        const messageBody = beginCell()
            .storeUint(0x47524144, 32) // op::graduate
            .storeUint(Date.now(), 64) // query_id
            .storeAddress(dexRouterAddress) // DEX router address
            .endCell();

        return NextResponse.json({
            success: true,
            tokenId,
            jettonAddress: targetAddress.toString({ bounceable: true }),
            transaction: {
                to: targetAddress.toString({ bounceable: true }),
                value: toNano("0.1").toString(), // Gas for graduation
                body: messageBody.toBoc().toString("base64"),
            },
            dexRouter: DEX_CONFIG.routerAddress,
            message: "Sign this transaction from the platform wallet to graduate the token",
        });
    } catch (error) {
        console.error("Graduate error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/graduate
 * 
 * Confirm graduation after the on-chain transaction is complete.
 * Updates Firestore with graduated status and DEX pool info.
 * 
 * Body: {
 *   tokenId: string;
 *   txHash: string;
 *   poolAddress?: string; // DEX pool address if created
 * }
 */
export async function PATCH(request: NextRequest) {
    try {
        // Verify API key
        const apiKey = request.headers.get("x-api-key");
        const adminKey = getAdminApiKey();
        if (!adminKey || apiKey !== adminKey) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const parsed = confirmGraduationSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0]?.message || "Invalid request body" },
                { status: 400 }
            );
        }
        const { tokenId, txHash, poolAddress } = parsed.data;

        // Update token with graduation status
        await adminDb.collection("tokens").doc(tokenId).update({
            isGraduated: true,
            graduatedAt: new Date(),
            graduationTxHash: txHash || null,
            dexPoolAddress: poolAddress || null,
            dexPlatform: "stonfi",
        });

        return NextResponse.json({
            success: true,
            message: "Token graduated successfully",
        });
    } catch (error) {
        console.error("Confirm graduation error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
