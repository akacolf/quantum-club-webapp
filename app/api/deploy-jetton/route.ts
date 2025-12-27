import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/utils/session";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";
import { Address } from "@ton/core";
import { buildJettonDeploy } from "@/lib/jetton-real";
import { PLATFORM_WALLET_ADDRESS, FEE_CONFIG } from "@/lib/platform-config";

/**
 * POST /api/deploy-jetton
 * 
 * Create and deploy a new Jetton token on TON blockchain.
 * 
 * Body: {
 *   name: string;
 *   symbol: string;
 *   description?: string;
 *   image?: string;
 *   creatorAddress: string;
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
        const body = await request.json();
        const { name, symbol, description, image, creatorAddress } = body;

        // Validate required fields
        if (!name || !symbol) {
            return NextResponse.json(
                { error: "Name and symbol required" },
                { status: 400 }
            );
        }

        if (!creatorAddress) {
            return NextResponse.json(
                { error: "Creator address required" },
                { status: 400 }
            );
        }

        // Parse and validate creator address
        let ownerAddress: Address;
        try {
            ownerAddress = Address.parse(creatorAddress);
        } catch {
            return NextResponse.json(
                { error: "Invalid creator address" },
                { status: 400 }
            );
        }

        // Build REAL Jetton deployment with platform as admin
        const deployResult = buildJettonDeploy({
            owner: ownerAddress,
            name,
            symbol,
            description: description || "",
            image: image || "",
            decimals: 9,
            totalSupply: BigInt(0), // Mint on demand via bonding curve
        }, PLATFORM_WALLET_ADDRESS);

        if (!deployResult.success || !deployResult.stateInit) {
            return NextResponse.json(
                { error: deployResult.error || "Failed to build deployment" },
                { status: 500 }
            );
        }

        // Create token document in Firestore
        const tokenRef = adminDb.collection("tokens").doc();
        const tokenId = tokenRef.id;

        await tokenRef.set({
            // Basic info
            name,
            nameLower: name.toLowerCase(),
            symbol: symbol.toUpperCase(),
            symbolLower: symbol.toLowerCase(),
            description: description || "",
            image: image || "",

            // Creator info
            creatorId: userId,
            creatorWallet: creatorAddress,

            // On-chain data
            jettonMasterAddress: deployResult.jettonMasterAddress,
            isOnChain: false, // Will be true after deployment confirmed
            deploymentPending: true,

            // Bonding curve initial state
            totalSupply: "0",
            currentPrice: "1000000", // 0.001 TON initial price (in nanoton)
            marketCap: "0",

            // Stats
            holders: 0,
            trades: 0,
            volume24h: 0,
            priceChange24h: 0,

            // Configuration
            bondingCurve: {
                basePrice: "1000000",
                slope: "100000",
            },
            graduationThreshold: "2000000000000", // 2000 TON
            isGraduated: false,

            // Platform config
            platformWallet: PLATFORM_WALLET_ADDRESS,
            platformFeePercent: FEE_CONFIG.tradingFeePercent,

            // Timestamps
            createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            tokenId,
            jettonAddress: deployResult.jettonMasterAddress,
            deployTx: {
                to: deployResult.jettonMasterAddress,
                value: "200000000", // 0.2 TON for deployment + initial reserve
                stateInit: deployResult.stateInit.toBoc().toString("base64"),
                body: deployResult.deployMessage?.toBoc().toString("base64") || "",
            },
            message: "Sign transaction to deploy your token on TON blockchain",
        });
    } catch (error) {
        console.error("Deploy Jetton error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/deploy-jetton
 * 
 * Confirm Jetton deployment after transaction is sent
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const userId = String(session.user?.telegramId || "");
        const body = await request.json();
        const { tokenId, jettonAddress, txHash } = body;

        if (!tokenId || !jettonAddress) {
            return NextResponse.json(
                { error: "Token ID and Jetton address required" },
                { status: 400 }
            );
        }

        // Get token
        const tokenRef = adminDb.collection("tokens").doc(tokenId);
        const tokenDoc = await tokenRef.get();

        if (!tokenDoc.exists) {
            return NextResponse.json(
                { error: "Token not found" },
                { status: 404 }
            );
        }

        const tokenData = tokenDoc.data()!;

        // Verify the user is the creator
        if (tokenData.creatorId !== userId) {
            return NextResponse.json(
                { error: "Only token creator can confirm deployment" },
                { status: 403 }
            );
        }

        // Update token with confirmed on-chain status
        await tokenRef.update({
            jettonMasterAddress: jettonAddress,
            deploymentPending: false,
            deployedAt: FieldValue.serverTimestamp(),
            deployTxHash: txHash || null,
            isOnChain: true, // NOW confirmed on-chain
        });

        // Log the deployment
        await adminDb.collection("deploymentLogs").add({
            tokenId,
            tokenName: tokenData.name,
            tokenSymbol: tokenData.symbol,
            jettonAddress,
            creatorId: userId,
            txHash: txHash || null,
            timestamp: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            message: `Token ${tokenData.symbol} is now live on TON blockchain!`,
            jettonAddress,
        });
    } catch (error) {
        console.error("Confirm deployment error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/deploy-jetton?tokenId=xxx
 * 
 * Get deployment status for a token
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

        return NextResponse.json({
            tokenId,
            isOnChain: tokenData.isOnChain || false,
            jettonMasterAddress: tokenData.jettonMasterAddress || null,
            deploymentPending: tokenData.deploymentPending || false,
            deployedAt: tokenData.deployedAt?.toDate?.() || null,
        });
    } catch (error) {
        console.error("Get deployment status error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
