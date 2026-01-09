import { NextRequest, NextResponse } from "next/server";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

// QuickNode webhook secret for verification
const QUICKNODE_WEBHOOK_SECRET = process.env.QUICKNODE_WEBHOOK_SECRET || "";

interface QuickNodeWebhookPayload {
    matchReasons: Array<{
        type: string;
        value: string;
    }>;
    hash: string;
    lt: string;
    account: {
        address: string;
        is_scam: boolean;
        is_wallet: boolean;
    };
    success: boolean;
    utime: number;
    in_msg?: {
        source?: {
            address: string;
        };
        destination?: {
            address: string;
        };
        value: number;
        op_code?: string;
        decoded_op_name?: string;
    };
    out_msgs?: Array<{
        destination?: {
            address: string;
        };
        value: number;
    }>;
    total_fees: number;
    transaction_type: string;
}

/**
 * Verify QuickNode webhook signature
 */
function verifySignature(payload: string, signature: string | null): boolean {
    if (!QUICKNODE_WEBHOOK_SECRET || !signature) {
        console.warn("QuickNode webhook secret not configured or signature missing");
        return false;
    }

    const expectedSignature = crypto
        .createHmac("sha256", QUICKNODE_WEBHOOK_SECRET)
        .update(payload)
        .digest("hex");

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * POST /api/webhooks/quicknode
 * 
 * Receives real-time blockchain events from QuickNode Streams/Webhooks.
 * Processes trades, transfers, and contract events for real-time updates.
 */
export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const signature = request.headers.get("x-quicknode-signature");

    // Verify webhook signature in production
    if (process.env.NODE_ENV === "production") {
        if (!verifySignature(rawBody, signature)) {
            console.error("QuickNode webhook signature verification failed");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
    }

    try {
        const payload: QuickNodeWebhookPayload = JSON.parse(rawBody);

        console.log("QuickNode webhook received:", {
            hash: payload.hash,
            account: payload.account?.address,
            success: payload.success,
            type: payload.transaction_type,
            opCode: payload.in_msg?.op_code,
            opName: payload.in_msg?.decoded_op_name,
        });

        // Skip failed transactions
        if (!payload.success) {
            return NextResponse.json({ received: true, processed: false, reason: "Failed transaction" });
        }

        // Process based on operation code
        const opCode = payload.in_msg?.op_code;
        const opName = payload.in_msg?.decoded_op_name;

        // BUY operation (0xaf750d34)
        if (opCode === "0xaf750d34" || opName === "buy") {
            await processBuyTransaction(payload);
            return NextResponse.json({ received: true, processed: true, type: "buy" });
        }

        // BURN/SELL operation (0x595f07bc)
        if (opCode === "0x595f07bc" || opName === "burn") {
            await processSellTransaction(payload);
            return NextResponse.json({ received: true, processed: true, type: "sell" });
        }

        // TRANSFER operation (0xf8a7ea5)
        if (opCode === "0xf8a7ea5" || opName === "transfer") {
            await processTransferTransaction(payload);
            return NextResponse.json({ received: true, processed: true, type: "transfer" });
        }

        // Internal transfer (for jetton minting)
        if (opCode === "0x178d4519" || opName === "internal_transfer") {
            await processInternalTransfer(payload);
            return NextResponse.json({ received: true, processed: true, type: "internal_transfer" });
        }

        // Unhandled operation - just acknowledge
        return NextResponse.json({
            received: true,
            processed: false,
            reason: "Unhandled operation",
            opCode,
            opName,
        });
    } catch (error) {
        console.error("QuickNode webhook processing error:", error);
        return NextResponse.json(
            { error: "Processing failed" },
            { status: 500 }
        );
    }
}

/**
 * Process BUY transaction - tokens purchased via bonding curve
 */
async function processBuyTransaction(payload: QuickNodeWebhookPayload) {
    const contractAddress = payload.account.address;
    const buyerAddress = payload.in_msg?.source?.address || "";
    const tonValue = payload.in_msg?.value || 0;

    console.log("Processing BUY:", {
        contract: contractAddress,
        buyer: buyerAddress,
        tonValue: tonValue / 1e9,
    });

    // Find token by contract address
    const tokenQuery = await adminDb.collection("tokens")
        .where("jettonMasterAddress", "==", contractAddress)
        .limit(1)
        .get();

    if (tokenQuery.empty) {
        // Try with different address format
        console.log("Token not found for address:", contractAddress);
        return;
    }

    const tokenDoc = tokenQuery.docs[0];
    const tokenId = tokenDoc.id;
    const tokenData = tokenDoc.data();

    // Record the trade
    await adminDb.collection("tokens").doc(tokenId).collection("trades").add({
        type: "buy",
        walletAddress: buyerAddress,
        totalTon: String(tonValue),
        txHash: payload.hash,
        timestamp: FieldValue.serverTimestamp(),
        tokenSymbol: tokenData.symbol,
        verified: true, // Verified by QuickNode webhook
    });

    // Update token stats
    await adminDb.collection("tokens").doc(tokenId).update({
        trades: FieldValue.increment(1),
        volume24h: FieldValue.increment(tonValue / 1e9),
        lastTradeAt: FieldValue.serverTimestamp(),
    });

    console.log("BUY transaction recorded for token:", tokenId);
}

/**
 * Process SELL transaction - tokens burned for TON
 */
async function processSellTransaction(payload: QuickNodeWebhookPayload) {
    const contractAddress = payload.account.address;
    const sellerAddress = payload.in_msg?.source?.address || "";

    console.log("Processing SELL:", {
        contract: contractAddress,
        seller: sellerAddress,
    });

    // Find token by contract address
    const tokenQuery = await adminDb.collection("tokens")
        .where("jettonMasterAddress", "==", contractAddress)
        .limit(1)
        .get();

    if (tokenQuery.empty) {
        console.log("Token not found for address:", contractAddress);
        return;
    }

    const tokenDoc = tokenQuery.docs[0];
    const tokenId = tokenDoc.id;
    const tokenData = tokenDoc.data();

    // For sell, the TON value is in out_msgs
    const tonValue = payload.out_msgs?.reduce((sum, msg) => sum + msg.value, 0) || 0;

    // Record the trade
    await adminDb.collection("tokens").doc(tokenId).collection("trades").add({
        type: "sell",
        walletAddress: sellerAddress,
        totalTon: String(tonValue),
        txHash: payload.hash,
        timestamp: FieldValue.serverTimestamp(),
        tokenSymbol: tokenData.symbol,
        verified: true,
    });

    // Update token stats
    await adminDb.collection("tokens").doc(tokenId).update({
        trades: FieldValue.increment(1),
        volume24h: FieldValue.increment(tonValue / 1e9),
        lastTradeAt: FieldValue.serverTimestamp(),
    });

    console.log("SELL transaction recorded for token:", tokenId);
}

/**
 * Process TRANSFER transaction - jetton transfer between wallets
 */
async function processTransferTransaction(payload: QuickNodeWebhookPayload) {
    console.log("Processing TRANSFER:", {
        hash: payload.hash,
        account: payload.account.address,
    });

    // Transfer transactions update holder counts
    // This would require more complex logic to track jetton wallet addresses
}

/**
 * Process internal transfer - indicates successful mint/transfer
 */
async function processInternalTransfer(payload: QuickNodeWebhookPayload) {
    console.log("Processing INTERNAL_TRANSFER:", {
        hash: payload.hash,
        account: payload.account.address,
    });

    // Internal transfers confirm that a buy/sell completed successfully
    // Can be used to update holder counts and balances
}

/**
 * GET /api/webhooks/quicknode
 * 
 * Health check endpoint for QuickNode webhook verification
 */
export async function GET() {
    return NextResponse.json({
        status: "healthy",
        service: "QuickNode Webhook Handler",
        timestamp: new Date().toISOString(),
    });
}
