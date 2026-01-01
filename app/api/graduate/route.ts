import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/utils/session";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";
import { PLATFORM_WALLET_ADDRESS, FEE_CONFIG } from "@/lib/platform-config";
import { calculateGraduationLiquidity } from "@/lib/graduation";

// Admin check - only platform admins can graduate tokens
const ADMIN_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(",") || [];

/**
 * POST /api/graduate
 * Graduate a token from bonding curve to DEX
 * 
 * Body: {
 *   tokenId: string;
 *   dexPoolAddress: string;
 *   jettonMasterAddress: string;
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const userId = String(session.user?.telegramId || "");

        // Check if user is admin
        if (!ADMIN_IDS.includes(userId)) {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { tokenId, dexPoolAddress, jettonMasterAddress } = body;

        if (!tokenId) {
            return NextResponse.json(
                { error: "Token ID required" },
                { status: 400 }
            );
        }

        // Get current token data
        const tokenRef = adminDb.collection("tokens").doc(tokenId);
        const tokenDoc = await tokenRef.get();

        if (!tokenDoc.exists) {
            return NextResponse.json(
                { error: "Token not found" },
                { status: 404 }
            );
        }

        const tokenData = tokenDoc.data()!;

        // Verify token is in bonding status
        if (tokenData.status !== "bonding") {
            return NextResponse.json(
                { error: "Token is not in bonding phase" },
                { status: 400 }
            );
        }

        // Calculate graduation liquidity and platform fee
        const collectedTon = tokenData.collectedTon || "0";
        const totalSupply = tokenData.totalSupply || "0";
        const graduation = calculateGraduationLiquidity(
            collectedTon,
            totalSupply,
            FEE_CONFIG.graduationFeePercent
        );

        // Update token to graduated status
        await tokenRef.update({
            status: "graduated",
            isGraduated: true,
            mintable: false, // No more minting after graduation
            graduatedAt: FieldValue.serverTimestamp(),
            dexPoolAddress: dexPoolAddress || null,
            jettonMasterAddress: jettonMasterAddress || null,
            graduationFee: graduation.platformFee,
            platformWallet: PLATFORM_WALLET_ADDRESS,
        });

        // Log the graduation event
        await adminDb.collection("graduationLogs").add({
            tokenId,
            tokenName: tokenData.name,
            tokenSymbol: tokenData.symbol,
            marketCapAtGraduation: tokenData.marketCap,
            collectedTon,
            tonForLp: graduation.tonForLp,
            tokensForLp: graduation.tokensForLp,
            platformFee: graduation.platformFee,
            platformWallet: PLATFORM_WALLET_ADDRESS,
            dexPoolAddress,
            jettonMasterAddress,
            graduatedBy: userId,
            timestamp: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            message: `Token ${tokenData.symbol} has graduated to DEX`,
            token: {
                id: tokenId,
                symbol: tokenData.symbol,
                status: "graduated",
                dexPoolAddress,
            },
        });
    } catch (error) {
        console.error("Graduation error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/graduate?tokenId=xxx
 * Check if a token is ready to graduate
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tokenId = searchParams.get("tokenId");

        if (!tokenId) {
            return NextResponse.json(
                { error: "Token ID required" },
                { status: 400 }
            );
        }

        const tokenDoc = await adminDb.collection("tokens").doc(tokenId).get();

        if (!tokenDoc.exists) {
            return NextResponse.json(
                { error: "Token not found" },
                { status: 404 }
            );
        }

        const tokenData = tokenDoc.data()!;

        // Calculate if ready to graduate (now TON-based)
        // Market cap is stored in nanoTON, threshold is in TON
        const marketCapTon = parseFloat(tokenData.marketCap || "0") / 1e9;
        const thresholdTon = parseFloat(tokenData.graduationThreshold || "2000"); // 2000 TON default
        const isReady = marketCapTon >= thresholdTon;

        return NextResponse.json({
            tokenId,
            symbol: tokenData.symbol,
            status: tokenData.status,
            marketCapTon: marketCapTon.toFixed(2),
            thresholdTon,
            isReadyToGraduate: isReady && tokenData.status === "bonding",
            percentComplete: Math.min(100, (marketCapTon / thresholdTon) * 100).toFixed(1),
        });
    } catch (error) {
        console.error("Graduation check error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
