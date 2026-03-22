"use server";

import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";
import { Address } from "@ton/core";
import { buildJettonDeploy } from "@/lib/jetton-real";
import { PLATFORM_WALLET_ADDRESS, FEE_CONFIG } from "@/lib/platform-config";
import { checkSymbolSchema, uploadImageSchema, graduateSchema } from "@/lib/validations";
import { calculateGraduationLiquidity } from "@/lib/graduation";
import { v2 as cloudinary } from "cloudinary";
import { env } from "@/env";

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_TOKENS_PER_WINDOW = 3;

import { checkRateLimit } from "@/lib/rate-limit";
const MAX_UPLOADS_PER_HOUR = 20;

// Configure Cloudinary
cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});

// ---------------------------------------------------------------------------
// deployJetton — create a new Jetton token and return deployment package
// ---------------------------------------------------------------------------

const deployJettonSchema = z.object({
    name: z.string().min(1, "Name is required").max(32, "Name must be 32 characters or less"),
    symbol: z.string()
        .min(1, "Symbol is required")
        .max(10, "Symbol must be 10 characters or less")
        .regex(/^[A-Za-z0-9]+$/, "Symbol can only contain letters and numbers"),
    description: z.string().max(500, "Description must be 500 characters or less").optional(),
    image: z.string().optional(),
    creatorAddress: z.string().min(1, "Creator address is required"),
    tokenId: z.string().optional(),
});

export const deployJetton = authActionClient
    .schema(deployJettonSchema)
    .action(async ({ ctx: { session }, parsedInput: { name, symbol, description, image, creatorAddress, tokenId: existingTokenId } }) => {
        if (!session.user?.telegramId) throw new Error("Unauthorized: missing user identity");
        const userId = String(session.user.telegramId);

        // Parse and validate TON address
        let ownerAddress: Address;
        try {
            ownerAddress = Address.parse(creatorAddress);
        } catch {
            throw new Error("Invalid creator address");
        }

        // Rate limiting
        const recentTokensQuery = adminDb.collection("tokens")
            .where("creatorUserId", "==", userId)
            .where("createdAt", ">=", new Date(Date.now() - RATE_LIMIT_WINDOW_MS))
            .limit(MAX_TOKENS_PER_WINDOW + 1);

        const recentTokens = await recentTokensQuery.get();
        if (recentTokens.size >= MAX_TOKENS_PER_WINDOW) {
            throw new Error(`Rate limit exceeded. Max ${MAX_TOKENS_PER_WINDOW} tokens per hour.`);
        }

        // Check for duplicate symbol (case-insensitive)
        const symbolLower = symbol.toLowerCase();
        const duplicateCheck = await adminDb.collection("tokens")
            .where("symbolLower", "==", symbolLower)
            .limit(1)
            .get();

        if (!duplicateCheck.empty) {
            const existingToken = duplicateCheck.docs[0];
            if (!existingTokenId || existingToken.id !== existingTokenId) {
                throw new Error(`Token with symbol ${symbol.toUpperCase()} already exists`);
            }
        }

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

        if (!deployResult.success || !deployResult.stateInit) {
            throw new Error(deployResult.error || "Failed to build deployment");
        }

        // For retry: reuse existing token, otherwise create new
        let tokenId: string;
        let tokenRef: FirebaseFirestore.DocumentReference;

        if (existingTokenId) {
            tokenRef = adminDb.collection("tokens").doc(existingTokenId);
            const existingDoc = await tokenRef.get();

            if (!existingDoc.exists) {
                throw new Error("Token not found");
            }

            const existingData = existingDoc.data();
            if (existingData?.creatorUserId !== userId) {
                throw new Error("Not authorized to deploy this token");
            }

            if (existingData?.isDeployed) {
                return {
                    success: true,
                    tokenId: existingTokenId,
                    jettonAddress: existingData.jettonMasterAddress,
                    deployTx: null,
                    platformFeeTx: null,
                    fees: { deploymentGas: 0, platformFee: 0, total: 0 },
                    message: "Token already deployed",
                };
            }

            tokenId = existingTokenId;
        } else {
            tokenRef = adminDb.collection("tokens").doc();
            tokenId = tokenRef.id;
        }

        try {
            if (existingTokenId) {
                await tokenRef.update({
                    jettonMasterAddress: deployResult.jettonMasterAddress,
                });
            } else {
                await tokenRef.set({
                    name,
                    nameLower: name.toLowerCase(),
                    symbol: symbol.toUpperCase(),
                    symbolLower: symbol.toLowerCase(),
                    description: description || "",
                    image: image || "",
                    creatorUserId: userId,
                    creatorAddress,
                    creatorUsername: "",
                    jettonMasterAddress: deployResult.jettonMasterAddress,
                    isOnChain: true,
                    isDeployed: false,
                    totalSupply: "0",
                    circulatingSupply: "0",
                    currentPrice: "1000",
                    tonReserve: "0",
                    marketCap: "0",
                    mintable: true,
                    bondingCurve: { basePrice: "1000", slope: "100000" },
                    graduationThreshold: "2000000000000",
                    isGraduated: false,
                    platformWallet: PLATFORM_WALLET_ADDRESS,
                    serviceFeePercent: FEE_CONFIG.serviceFeePercent,
                    referralFeePercent: FEE_CONFIG.referralFeePercent,
                    createdAt: FieldValue.serverTimestamp(),
                });
            }
        } catch (firestoreError) {
            console.error("Firestore write error:", firestoreError);
            return { success: false, error: "Failed to save token record. Please try again." };
        }

        const deploymentGasNano = Math.floor(FEE_CONFIG.tokenDeployment * 1e9).toString();

        return {
            success: true,
            tokenId,
            jettonAddress: deployResult.jettonMasterAddress,
            deployTx: {
                to: deployResult.jettonMasterAddress,
                value: deploymentGasNano,
                stateInit: deployResult.stateInit.toBoc().toString("base64"),
                body: deployResult.deployMessage?.toBoc().toString("base64") || "",
            },
            platformFeeTx: null,
            fees: {
                deploymentGas: FEE_CONFIG.tokenDeployment,
                platformFee: 0,
                total: FEE_CONFIG.tokenDeployment,
            },
            message: "Token created! Deploying contract...",
        };
    });

// ---------------------------------------------------------------------------
// confirmJettonDeployment — confirm deployment after tx is sent
// ---------------------------------------------------------------------------

const confirmDeploySchema = z.object({
    tokenId: z.string().min(1, "Token ID is required"),
    jettonAddress: z.string().optional(),
    txHash: z.string().optional(),
});

export const confirmJettonDeployment = authActionClient
    .schema(confirmDeploySchema)
    .action(async ({ ctx: { session }, parsedInput: { tokenId, jettonAddress, txHash } }) => {
        if (!session.user?.telegramId) throw new Error("Unauthorized: missing user identity");
        const userId = String(session.user.telegramId);

        const tokenRef = adminDb.collection("tokens").doc(tokenId);
        const tokenDoc = await tokenRef.get();

        if (!tokenDoc.exists) {
            throw new Error("Token not found");
        }

        const tokenData = tokenDoc.data();

        if (tokenData?.creatorUserId !== userId) {
            throw new Error("Only token creator can confirm deployment");
        }

        if (tokenData?.isDeployed) {
            return {
                success: true,
                tokenId,
                jettonAddress: tokenData.jettonMasterAddress,
                message: "Token already deployed",
            };
        }

        if (jettonAddress && tokenData?.jettonMasterAddress !== jettonAddress) {
            throw new Error("Jetton address mismatch");
        }

        await tokenRef.update({
            isDeployed: true,
            deployTxHash: txHash || "",
            deployedAt: FieldValue.serverTimestamp(),
            deploymentMethod: "client",
        });

        return {
            success: true,
            tokenId,
            jettonAddress: tokenData?.jettonMasterAddress,
        };
    });

// ---------------------------------------------------------------------------
// getDeploymentStatus — check deployment status of a token
// ---------------------------------------------------------------------------

const getDeploymentStatusSchema = z.object({
    tokenId: z.string().min(1, "Token ID is required"),
});

export const getDeploymentStatus = authActionClient
    .schema(getDeploymentStatusSchema)
    .action(async ({ parsedInput: { tokenId } }) => {
        const tokenDoc = await adminDb.collection("tokens").doc(tokenId).get();

        if (!tokenDoc.exists) {
            throw new Error("Token not found");
        }

        const data = tokenDoc.data();

        return {
            tokenId,
            jettonAddress: data?.jettonMasterAddress || null,
            isDeployed: data?.isDeployed || false,
            deployTxHash: data?.deployTxHash || null,
        };
    });

// ---------------------------------------------------------------------------
// checkSymbolAvailability — check if a token symbol is available
// ---------------------------------------------------------------------------

const checkSymbolAvailabilitySchema = checkSymbolSchema.extend({
    excludeTokenId: z.string().optional(),
});

export const checkSymbolAvailability = authActionClient
    .schema(checkSymbolAvailabilitySchema)
    .action(async ({ parsedInput: { symbol, excludeTokenId } }) => {
        const symbolLower = symbol.toLowerCase();
        const duplicateCheck = await adminDb.collection("tokens")
            .where("symbolLower", "==", symbolLower)
            .limit(1)
            .get();

        if (!duplicateCheck.empty) {
            const existingToken = duplicateCheck.docs[0];
            if (!excludeTokenId || existingToken.id !== excludeTokenId) {
                return {
                    available: false,
                    reason: `Symbol "${symbol.toUpperCase()}" is already taken`,
                    symbol: symbol.toUpperCase(),
                };
            }
        }

        return {
            available: true,
            symbol: symbol.toUpperCase(),
        };
    });

// ---------------------------------------------------------------------------
// uploadTokenImage — upload token image to Cloudinary
// ---------------------------------------------------------------------------

export const uploadTokenImage = authActionClient
    .schema(uploadImageSchema)
    .action(async ({ ctx: { session }, parsedInput: { tokenId, imageData } }) => {
        const telegramId = String(session.user.telegramId);

        // Rate limiting (Firestore-backed, survives restarts)
        const isLimited = await checkRateLimit(`upload:${telegramId}`, 60 * 60 * 1000, MAX_UPLOADS_PER_HOUR);
        if (isLimited) {
            throw new Error("Upload rate limit exceeded. Max 20 uploads per hour.");
        }

        if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
            throw new Error("Image upload not configured");
        }

        const result = await cloudinary.uploader.upload(imageData, {
            folder: "qcrocketstart-jettons",
            public_id: tokenId,
            overwrite: true,
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
        });

        return {
            success: true,
            publicUrl: result.secure_url,
            publicId: result.public_id,
        };
    });

// ---------------------------------------------------------------------------
// graduateToken — admin-only: graduate token from bonding curve to DEX
// ---------------------------------------------------------------------------

const ADMIN_IDS = (env.ADMIN_TELEGRAM_IDS ?? "").split(",").map(id => id.trim()).filter(Boolean);

export const graduateToken = authActionClient
    .schema(graduateSchema)
    .action(async ({ ctx: { session }, parsedInput: { tokenId, dexPoolAddress, jettonMasterAddress } }) => {
        const userId = String(session.user.telegramId);

        if (!ADMIN_IDS.includes(userId)) {
            throw new Error("Admin access required");
        }

        const tokenRef = adminDb.collection("tokens").doc(tokenId);
        const tokenDoc = await tokenRef.get();

        if (!tokenDoc.exists) {
            throw new Error("Token not found");
        }

        const tokenData = tokenDoc.data()!;

        if (tokenData.status !== "bonding") {
            throw new Error("Token is not in bonding phase");
        }

        const collectedTon = tokenData.collectedTon || "0";
        const totalSupply = tokenData.totalSupply || "0";
        const graduation = calculateGraduationLiquidity(
            collectedTon,
            totalSupply,
            FEE_CONFIG.graduationFeePercent,
        );

        await tokenRef.update({
            status: "graduated",
            isGraduated: true,
            mintable: false,
            graduatedAt: FieldValue.serverTimestamp(),
            dexPoolAddress: dexPoolAddress || null,
            jettonMasterAddress: jettonMasterAddress || null,
            graduationFee: graduation.platformFee,
            platformWallet: PLATFORM_WALLET_ADDRESS,
        });

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

        return {
            success: true,
            message: `Token ${tokenData.symbol} has graduated to DEX`,
            token: {
                id: tokenId,
                symbol: tokenData.symbol,
                status: "graduated",
                dexPoolAddress,
            },
        };
    });

// ---------------------------------------------------------------------------
// checkGraduationStatus — check if a token is ready to graduate
// ---------------------------------------------------------------------------

export const checkGraduationStatus = authActionClient
    .schema(z.object({ tokenId: z.string().min(1) }))
    .action(async ({ parsedInput: { tokenId } }) => {
        const tokenDoc = await adminDb.collection("tokens").doc(tokenId).get();

        if (!tokenDoc.exists) {
            throw new Error("Token not found");
        }

        const tokenData = tokenDoc.data()!;
        const marketCapTon = parseFloat(tokenData.marketCap || "0") / 1e9;
        const thresholdTon = parseFloat(tokenData.graduationThreshold || "2000");
        const isReady = marketCapTon >= thresholdTon;

        return {
            tokenId,
            symbol: tokenData.symbol,
            status: tokenData.status,
            marketCapTon: marketCapTon.toFixed(2),
            thresholdTon,
            isReadyToGraduate: isReady && tokenData.status === "bonding",
            percentComplete: Math.min(100, (marketCapTon / thresholdTon) * 100).toFixed(1),
        };
    });
