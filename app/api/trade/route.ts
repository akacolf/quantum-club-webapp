import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/utils/session";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";

// Rate limiting configuration
const RATE_LIMIT = {
    maxTradesPerMinute: 10,
    windowMs: 60 * 1000, // 1 minute
};

// In-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const userLimit = rateLimitStore.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
        // Reset or create new window
        rateLimitStore.set(userId, {
            count: 1,
            resetTime: now + RATE_LIMIT.windowMs,
        });
        return { allowed: true, remaining: RATE_LIMIT.maxTradesPerMinute - 1, resetIn: RATE_LIMIT.windowMs };
    }

    if (userLimit.count >= RATE_LIMIT.maxTradesPerMinute) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: userLimit.resetTime - now,
        };
    }

    userLimit.count++;
    return {
        allowed: true,
        remaining: RATE_LIMIT.maxTradesPerMinute - userLimit.count,
        resetIn: userLimit.resetTime - now,
    };
}

// Validation types
interface TradeValidationRequest {
    tokenId: string;
    type: "buy" | "sell";
    amount: string; // TON for buy, tokens for sell
    userId: string;
}

interface ValidationResult {
    valid: boolean;
    error?: string;
    tokenData?: {
        name: string;
        currentPrice: string;
        totalSupply: string;
    };
}

async function validateTrade(req: TradeValidationRequest): Promise<ValidationResult> {
    const { tokenId, type, amount, userId } = req;

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
        return { valid: false, error: "Invalid amount" };
    }

    // Minimum trade amounts
    if (type === "buy" && amountNum < 0.001) {
        return { valid: false, error: "Minimum buy is 0.001 TON" };
    }

    // Check if token exists
    const tokenDoc = await adminDb.collection("tokens").doc(tokenId).get();
    if (!tokenDoc.exists) {
        return { valid: false, error: "Token not found" };
    }

    const tokenData = tokenDoc.data()!;

    // For sells, validate user has position
    if (type === "sell") {
        const positionDoc = await adminDb
            .collection("users")
            .doc(userId)
            .collection("positions")
            .doc(tokenId)
            .get();

        if (!positionDoc.exists) {
            return { valid: false, error: "No position to sell" };
        }

        const position = positionDoc.data()!;
        const balance = BigInt(position.balance || "0");
        const sellAmount = BigInt(Math.floor(amountNum * 1e9));

        if (sellAmount > balance) {
            return { valid: false, error: "Insufficient balance" };
        }
    }

    return {
        valid: true,
        tokenData: {
            name: tokenData.name,
            currentPrice: tokenData.currentPrice,
            totalSupply: tokenData.totalSupply,
        },
    };
}

export async function POST(request: NextRequest) {
    try {
        // Verify session
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const userId = String(session.user?.telegramId || "");

        // Check rate limit
        const rateLimit = checkRateLimit(userId);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    error: "Rate limit exceeded",
                    retryAfter: Math.ceil(rateLimit.resetIn / 1000),
                },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetIn / 1000)),
                    },
                }
            );
        }

        // Parse request body
        const body = await request.json();
        const { tokenId, type, amount } = body;

        // Validate required fields
        if (!tokenId || !type || !amount) {
            return NextResponse.json(
                { error: "Missing required fields: tokenId, type, amount" },
                { status: 400 }
            );
        }

        if (!["buy", "sell"].includes(type)) {
            return NextResponse.json(
                { error: "Invalid trade type. Must be 'buy' or 'sell'" },
                { status: 400 }
            );
        }

        // Validate trade
        const validation = await validateTrade({
            tokenId,
            type,
            amount,
            userId,
        });

        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400 }
            );
        }

        // Log trade attempt for monitoring
        await adminDb.collection("tradeLogs").add({
            userId,
            tokenId,
            type,
            amount,
            timestamp: FieldValue.serverTimestamp(),
            status: "validated",
        });

        // Return validation success with token data
        return NextResponse.json({
            success: true,
            message: "Trade validated",
            token: validation.tokenData,
            rateLimit: {
                remaining: rateLimit.remaining,
                resetIn: Math.ceil(rateLimit.resetIn / 1000),
            },
        });
    } catch (error) {
        console.error("Trade validation error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// GET endpoint for checking rate limit status
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const userId = String(session.user?.telegramId || "");
        const userLimit = rateLimitStore.get(userId);
        const now = Date.now();

        if (!userLimit || now > userLimit.resetTime) {
            return NextResponse.json({
                remaining: RATE_LIMIT.maxTradesPerMinute,
                resetIn: 0,
            });
        }

        return NextResponse.json({
            remaining: Math.max(0, RATE_LIMIT.maxTradesPerMinute - userLimit.count),
            resetIn: Math.ceil((userLimit.resetTime - now) / 1000),
        });
    } catch (error) {
        console.error("Rate limit check error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
