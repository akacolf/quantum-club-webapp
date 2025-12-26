import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/utils/session";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";
import { Address } from "@ton/core";
import { buildJettonDeploy } from "@/lib/jetton-real";

/**
 * POST /api/deploy-jetton
 * 
 * Prepare REAL Jetton deployment transaction for a created token.
 * This generates the actual contract deployment data using TEP-74 standard.
 * 
 * Body: {
 *   tokenId: string;       // Firebase token document ID
 *   creatorAddress: string; // User's TON wallet address
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
        const { tokenId, creatorAddress } = body;

        if (!tokenId) {
            return NextResponse.json(
                { error: "Token ID required" },
                { status: 400 }
            );
        }

        if (!creatorAddress) {
            return NextResponse.json(
                { error: "Creator address required" },
                { status: 400 }
            );
        }

        // Get token from Firestore
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
                { error: "Only token creator can deploy" },
                { status: 403 }
            );
        }

        // Check if already deployed
        if (tokenData.isOnChain === true) {
            return NextResponse.json(
                { error: "Token already deployed on-chain", jettonAddress: tokenData.jettonMasterAddress },
                { status: 400 }
            );
        }

        // Parse owner address
        const ownerAddress = Address.parse(creatorAddress);

        // Build REAL Jetton deployment with actual contract code
        const deployResult = buildJettonDeploy({
            owner: ownerAddress,
            name: tokenData.name,
            symbol: tokenData.symbol,
            description: tokenData.description || "",
            image: tokenData.image || "",
            decimals: 9,
            totalSupply: BigInt(0), // Mint on demand
        });

        if (!deployResult.success || !deployResult.stateInit) {
            return NextResponse.json(
                { error: deployResult.error || "Failed to build deployment" },
                { status: 500 }
            );
        }

        // Update token document with pending deployment info
        await tokenRef.update({
            deploymentPending: true,
            deploymentRequestedAt: FieldValue.serverTimestamp(),
            expectedJettonAddress: deployResult.jettonMasterAddress,
            jettonMasterAddress: deployResult.jettonMasterAddress,
            isOnChain: false, // Will be set to true after confirmation
        });

        // Return the transaction data for the user's wallet to send
        return NextResponse.json({
            success: true,
            jettonAddress: deployResult.jettonMasterAddress,
            deployTx: {
                to: deployResult.jettonMasterAddress,
                value: "150000000", // 0.15 TON for deployment gas
                stateInit: deployResult.stateInit.toBoc().toString("base64"),
                body: deployResult.deployMessage?.toBoc().toString("base64") || "",
            },
            message: "Sign this transaction to deploy your token on TON blockchain",
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

        // Verify the expected address matches
        if (tokenData.expectedJettonAddress && tokenData.expectedJettonAddress !== jettonAddress) {
            return NextResponse.json(
                { error: "Jetton address mismatch" },
                { status: 400 }
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
