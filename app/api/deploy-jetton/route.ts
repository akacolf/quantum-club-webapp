import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/utils/session";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";
import { Address } from "@ton/core";
import { buildJettonDeploy } from "@/lib/jetton-real";
import { PLATFORM_WALLET_ADDRESS, FEE_CONFIG } from "@/lib/platform-config";

// Rate limiting: max 3 tokens per user per hour
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_TOKENS_PER_WINDOW = 3;

// Validation constants
const MAX_NAME_LENGTH = 32;
const MAX_SYMBOL_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 500;
const SYMBOL_REGEX = /^[A-Za-z0-9]+$/;


/**
 * POST /api/deploy-jetton
 * 
 * Create a new Jetton token and return deployment package.
 * User deploys from their own QC Wallet (pays deployment gas).
 * Platform wallet only receives trading commissions (1% on trades).
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

        // Validate name length
        if (name.length > MAX_NAME_LENGTH) {
            return NextResponse.json(
                { error: `Name must be ${MAX_NAME_LENGTH} characters or less` },
                { status: 400 }
            );
        }

        // Validate symbol format and length
        if (symbol.length > MAX_SYMBOL_LENGTH) {
            return NextResponse.json(
                { error: `Symbol must be ${MAX_SYMBOL_LENGTH} characters or less` },
                { status: 400 }
            );
        }
        if (!SYMBOL_REGEX.test(symbol)) {
            return NextResponse.json(
                { error: "Symbol can only contain letters and numbers" },
                { status: 400 }
            );
        }

        // Validate description length
        if (description && description.length > MAX_DESCRIPTION_LENGTH) {
            return NextResponse.json(
                { error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less` },
                { status: 400 }
            );
        }

        // Parse owner address
        let ownerAddress: Address;
        try {
            ownerAddress = Address.parse(creatorAddress);
        } catch {
            return NextResponse.json(
                { error: "Invalid creator address" },
                { status: 400 }
            );
        }

        // Rate limiting: check recent token creations by this user
        const recentTokensQuery = adminDb.collection("tokens")
            .where("creatorUserId", "==", userId)
            .where("createdAt", ">=", new Date(Date.now() - RATE_LIMIT_WINDOW_MS))
            .limit(MAX_TOKENS_PER_WINDOW + 1);

        const recentTokens = await recentTokensQuery.get();
        if (recentTokens.size >= MAX_TOKENS_PER_WINDOW) {
            return NextResponse.json(
                { error: `Rate limit exceeded. Max ${MAX_TOKENS_PER_WINDOW} tokens per hour.` },
                { status: 429 }
            );
        }

        // Check for duplicate symbol (case-insensitive)
        const symbolLower = symbol.toLowerCase();
        const duplicateCheck = await adminDb.collection("tokens")
            .where("symbolLower", "==", symbolLower)
            .limit(1)
            .get();

        if (!duplicateCheck.empty) {
            return NextResponse.json(
                { error: `Token with symbol ${symbol.toUpperCase()} already exists` },
                { status: 409 }
            );
        }

        console.log("Building Jetton deployment for:", { name, symbol, creatorAddress });

        // Build deployment package
        const deployResult = buildJettonDeploy({
            owner: ownerAddress,
            name,
            symbol,
            description: description || "",
            image: image || "",
            decimals: 9,
            totalSupply: BigInt(0),
        }, PLATFORM_WALLET_ADDRESS);

        console.log("Deployment result:", {
            success: deployResult.success,
            hasStateInit: !!deployResult.stateInit,
            error: deployResult.error,
            jettonAddress: deployResult.jettonMasterAddress
        });

        if (!deployResult.success || !deployResult.stateInit) {
            return NextResponse.json(
                { error: deployResult.error || "Failed to build deployment" },
                { status: 500 }
            );
        }

        // Create token document in Firestore FIRST (faster than on-chain)
        const tokenRef = adminDb.collection("tokens").doc();
        const tokenId = tokenRef.id;

        try {
            await tokenRef.set({
                // Basic info
                name,
                nameLower: name.toLowerCase(),
                symbol: symbol.toUpperCase(),
                symbolLower: symbol.toLowerCase(),
                description: description || "",
                image: image || "",

                // Creator info
                creatorUserId: userId,
                creatorAddress,
                creatorUsername: "",

                // On-chain data
                jettonMasterAddress: deployResult.jettonMasterAddress,
                isOnChain: true,
                isDeployed: false, // Will be set true after verification

                // Trading state
                totalSupply: "0",
                circulatingSupply: "0",
                currentPrice: "1000", // 0.000001 TON initial price
                tonReserve: "0",
                marketCap: "0",
                mintable: true, // Can mint via bonding curve until graduated

                // Configuration - matches smart contract constants
                bondingCurve: {
                    basePrice: "1000", // 0.000001 TON
                    slope: "100000",
                },
                graduationThreshold: "2000000000000", // 2000 TON
                isGraduated: false,

                // Platform config
                platformWallet: PLATFORM_WALLET_ADDRESS,
                platformFeePercent: FEE_CONFIG.platformFeePercent,
                creatorFeePercent: FEE_CONFIG.creatorFeePercent,

                // Timestamps
                createdAt: FieldValue.serverTimestamp(),
            });
        } catch (firestoreError) {
            console.error("Firestore write error:", firestoreError);
            // Continue anyway - we'll still try to deploy
        }

        // ====== CLIENT-SIDE DEPLOYMENT ONLY ======
        // User deploys from their own QC Wallet (pays deployment gas only)
        // Platform earns from trading fees (1% on every buy/sell)
        console.log("Token prepared. Client-side deployment will be triggered by user's wallet.");

        // Calculate gas in nanotons
        const deploymentGasNano = Math.floor(FEE_CONFIG.tokenDeployment * 1e9).toString();

        // Return deployment package for client to send
        return NextResponse.json({
            success: true,
            tokenId,
            jettonAddress: deployResult.jettonMasterAddress,
            // Transaction to deploy the contract
            deployTx: {
                to: deployResult.jettonMasterAddress,
                value: deploymentGasNano, // Gas for deployment
                stateInit: deployResult.stateInit.toBoc().toString("base64"),
                body: deployResult.deployMessage?.toBoc().toString("base64") || "",
            },
            // No platform fee - revenue comes from trading fees
            platformFeeTx: null,
            fees: {
                deploymentGas: FEE_CONFIG.tokenDeployment,
                platformFee: 0,
                total: FEE_CONFIG.tokenDeployment,
            },
            message: "Token created! Deploying contract...",
        });
    } catch (error) {
        console.error("Deploy Jetton error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/deploy-jetton
 *
 * Confirm deployment after transaction is sent.
 * Only the token creator can confirm deployment.
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = String(session.user?.telegramId || "");
        const body = await request.json();
        const { tokenId, jettonAddress, txHash } = body;

        if (!tokenId) {
            return NextResponse.json({ error: "Token ID required" }, { status: 400 });
        }

        // Get token document and verify ownership
        const tokenRef = adminDb.collection("tokens").doc(tokenId);
        const tokenDoc = await tokenRef.get();

        if (!tokenDoc.exists) {
            return NextResponse.json({ error: "Token not found" }, { status: 404 });
        }

        const tokenData = tokenDoc.data();

        // Security: Only allow creator to confirm deployment
        if (tokenData?.creatorUserId !== userId) {
            return NextResponse.json(
                { error: "Only token creator can confirm deployment" },
                { status: 403 }
            );
        }

        // Prevent re-deployment confirmation
        if (tokenData?.isDeployed) {
            return NextResponse.json({
                success: true,
                tokenId,
                jettonAddress: tokenData.jettonMasterAddress,
                message: "Token already deployed",
            });
        }

        // Validate jettonAddress matches stored address
        if (jettonAddress && tokenData?.jettonMasterAddress !== jettonAddress) {
            return NextResponse.json(
                { error: "Jetton address mismatch" },
                { status: 400 }
            );
        }

        // Update token document
        await tokenRef.update({
            isDeployed: true,
            deployTxHash: txHash || "",
            deployedAt: FieldValue.serverTimestamp(),
            deploymentMethod: "client",
        });

        return NextResponse.json({
            success: true,
            tokenId,
            jettonAddress: tokenData?.jettonMasterAddress,
        });
    } catch (error) {
        console.error("Confirm deployment error:", error);
        return NextResponse.json(
            { error: "Failed to confirm deployment" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/deploy-jetton
 *
 * Check deployment status of a token.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tokenId = searchParams.get("tokenId");

        if (!tokenId) {
            return NextResponse.json({ error: "Token ID required" }, { status: 400 });
        }

        const tokenDoc = await adminDb.collection("tokens").doc(tokenId).get();

        if (!tokenDoc.exists) {
            return NextResponse.json({ error: "Token not found" }, { status: 404 });
        }

        const data = tokenDoc.data();

        return NextResponse.json({
            tokenId,
            jettonAddress: data?.jettonMasterAddress || null,
            isDeployed: data?.isDeployed || false,
            deployTxHash: data?.deployTxHash || null,
        });
    } catch (error) {
        console.error("Check deployment error:", error);
        return NextResponse.json(
            { error: "Failed to check deployment" },
            { status: 500 }
        );
    }
}
