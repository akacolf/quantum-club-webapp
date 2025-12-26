import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/utils/session";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";
import {
    buildJettonDeployMessage,
    calculateJettonAddress,
    JettonMetadata,
} from "@/lib/jetton-deploy";

/**
 * POST /api/deploy-jetton
 * 
 * Prepare Jetton deployment transaction for a created token.
 * This generates the transaction data that the user's wallet will sign and broadcast.
 * 
 * Body: {
 *   tokenId: string;  // Firebase token document ID
 * }
 * 
 * Returns: {
 *   success: boolean;
 *   jettonAddress: string;      // The address the deployed Jetton will have
 *   deployTx: {
 *     to: string;               // Contract address to deploy to
 *     value: string;            // TON amount to send (for gas)
 *     stateInit: string;        // Base64 encoded state init
 *     payload: string;          // Base64 encoded message body
 *   }
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
        if (tokenData.jettonMasterAddress) {
            return NextResponse.json(
                { error: "Token already deployed on-chain", jettonAddress: tokenData.jettonMasterAddress },
                { status: 400 }
            );
        }

        // Build metadata for Jetton
        const metadata: JettonMetadata = {
            name: tokenData.name,
            symbol: tokenData.symbol,
            description: tokenData.description || "",
            image: tokenData.image || "",
            decimals: 9, // Standard TON decimals
        };

        // Calculate Jetton address
        const jettonAddress = calculateJettonAddress(creatorAddress, metadata);

        // Build deploy message
        const deployResult = buildJettonDeployMessage({
            ownerAddress: creatorAddress,
            metadata,
        });

        if (!deployResult.success) {
            return NextResponse.json(
                { error: deployResult.error || "Failed to build deploy message" },
                { status: 500 }
            );
        }

        // Update token document with pending deployment info
        await tokenRef.update({
            deploymentPending: true,
            deploymentRequestedAt: FieldValue.serverTimestamp(),
            expectedJettonAddress: jettonAddress,
        });

        // Return the transaction data for the user's wallet to sign
        return NextResponse.json({
            success: true,
            jettonAddress: deployResult.jettonMasterAddress,
            deployTx: {
                to: deployResult.jettonMasterAddress,
                value: "150000000", // 0.15 TON for deployment gas
                stateInit: deployResult.stateInit,
                payload: deployResult.messageBody,
            },
            message: "Sign this transaction in your wallet to deploy your token on-chain",
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
 * Confirm that a Jetton deployment was successful (called after tx broadcast)
 * 
 * Body: {
 *   tokenId: string;
 *   jettonAddress: string;
 *   txHash?: string;
 * }
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

        // Update token with on-chain address
        await tokenRef.update({
            jettonMasterAddress: jettonAddress,
            deploymentPending: false,
            deployedAt: FieldValue.serverTimestamp(),
            deployTxHash: txHash || null,
            isOnChain: true,
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
            message: `Token ${tokenData.symbol} deployed on-chain!`,
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

        // Get token from Firestore
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
            symbol: tokenData.symbol,
            isOnChain: tokenData.isOnChain || false,
            jettonAddress: tokenData.jettonMasterAddress || null,
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
