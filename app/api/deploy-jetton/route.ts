import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/utils/session";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";
import { Address, toNano, beginCell, internal, SendMode } from "@ton/core";
import { TonClient, WalletContractV5R1 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
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
 * Create and deploy a new Jetton token on TON blockchain.
 * The contract is deployed from the platform wallet for reliability.
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
                isDeployed: false, // Will be set true after deployment

                // Trading state
                totalSupply: "0",
                circulatingSupply: "0",
                currentPrice: "1000000",
                tonReserve: "0",
                marketCap: "0",

                // Configuration
                bondingCurve: {
                    basePrice: "1000000",
                    slope: "100000",
                },
                graduationThreshold: "2000000000000",
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

        // ====== SERVER-SIDE DEPLOYMENT (in background, non-blocking) ======
        const platformMnemonic = process.env.PLATFORM_WALLET_MNEMONIC;

        if (platformMnemonic) {
            // Don't await - let it run in background with retry logic
            (async () => {
                const MAX_RETRIES = 3;
                const RETRY_DELAY_MS = 2000;

                for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                    try {
                        console.log(`Server-side deployment attempt ${attempt}/${MAX_RETRIES}...`);

                        const mnemonic = platformMnemonic.split(" ");
                        const keyPair = await mnemonicToPrivateKey(mnemonic);

                        const wallet = WalletContractV5R1.create({
                            publicKey: keyPair.publicKey,
                            workchain: 0,
                        });

                        const tonClient = new TonClient({
                            endpoint: "https://toncenter.com/api/v2/jsonRPC",
                            apiKey: process.env.NEXT_PUBLIC_TONCENTER_API_KEY,
                        });

                        const contract = tonClient.open(wallet);
                        
                        // Get seqno with retry for rate limits
                        let seqno = 0;
                        try {
                            seqno = await contract.getSeqno();
                        } catch (seqnoError) {
                            console.warn("Failed to get seqno, assuming 0:", seqnoError);
                        }

                        console.log("Platform wallet seqno:", seqno);

                        const { loadStateInit } = await import("@ton/core");
                        const parsedInit = loadStateInit(deployResult.stateInit!.beginParse());

                        console.log("Parsed stateInit:", {
                            hasCode: !!parsedInit.code,
                            hasData: !!parsedInit.data,
                        });

                        await contract.sendTransfer({
                            seqno,
                            secretKey: keyPair.secretKey,
                            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
                            messages: [
                                internal({
                                    to: Address.parse(deployResult.jettonMasterAddress!),
                                    value: toNano("0.05"),
                                    body: deployResult.deployMessage || beginCell().endCell(),
                                    init: parsedInit,
                                    bounce: false,
                                }),
                            ],
                        });

                        console.log("Deployment transaction sent from platform wallet!");

                        // Update Firestore to mark as deployed
                        await tokenRef.update({
                            isDeployed: true,
                            deployedAt: FieldValue.serverTimestamp(),
                            deploymentMethod: "server",
                        });

                        console.log("Token marked as deployed in Firestore");
                        break; // Success - exit retry loop

                    } catch (deployError) {
                        console.error(`Server-side deployment attempt ${attempt} failed:`, deployError);
                        
                        if (attempt < MAX_RETRIES) {
                            console.log(`Retrying in ${RETRY_DELAY_MS}ms...`);
                            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                        } else {
                            console.error("All deployment attempts failed. Token will need client-side deployment.");
                            // Mark token as pending deployment
                            try {
                                await tokenRef.update({
                                    deploymentError: deployError instanceof Error ? deployError.message : "Unknown error",
                                    deploymentAttempts: MAX_RETRIES,
                                });
                            } catch {
                                // Ignore Firestore update errors
                            }
                        }
                    }
                }
            })();
        } else {
            console.log("No PLATFORM_WALLET_MNEMONIC set, skipping server-side deployment");
        }

        // Return immediately - deployment happens in background
        return NextResponse.json({
            success: true,
            tokenId,
            jettonAddress: deployResult.jettonMasterAddress,
            deployTx: {
                to: deployResult.jettonMasterAddress,
                value: "50000000",
                stateInit: deployResult.stateInit.toBoc().toString("base64"),
                body: deployResult.deployMessage?.toBoc().toString("base64") || "",
            },
            message: "Token created! Contract deployment in progress...",
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
