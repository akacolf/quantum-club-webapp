import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/app/(firebase)/server";
import { getSession } from "@/utils/session";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.user?.telegramId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authenticatedTelegramId = String(session.user.telegramId);

        // Rate limiting
        const now = Date.now();
        const userRateLimit = rateLimitMap.get(authenticatedTelegramId);
        if (userRateLimit) {
            if (now < userRateLimit.resetTime) {
                if (userRateLimit.count >= MAX_REQUESTS_PER_WINDOW) {
                    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
                }
                userRateLimit.count++;
            } else {
                rateLimitMap.set(authenticatedTelegramId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
            }
        } else {
            rateLimitMap.set(authenticatedTelegramId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        }

        const body = await request.json();
        const { action } = body;

        switch (action) {
            case "get-boxes": {
                const snapshot = await firestore
                    .collection("mystery_boxes")
                    .where("status", "==", "active")
                    .get();

                const boxes = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                return NextResponse.json({ success: true, boxes });
            }

            case "claim-box": {
                const { boxId, paymentMethod } = body;
                if (!boxId || !paymentMethod) {
                    return NextResponse.json({ error: "Missing boxId or paymentMethod" }, { status: 400 });
                }

                // Use Firestore transaction for atomic claim
                const result = await firestore.runTransaction(async (transaction) => {
                    const boxRef = firestore.collection("mystery_boxes").doc(boxId);
                    const boxDoc = await transaction.get(boxRef);

                    if (!boxDoc.exists) {
                        throw new Error("Mystery box not found");
                    }

                    const boxData = boxDoc.data()!;
                    if (boxData.status !== "active") {
                        throw new Error("Mystery box is no longer active");
                    }
                    if (boxData.remaining <= 0) {
                        throw new Error("Mystery box is sold out");
                    }

                    // Decrement remaining
                    const newRemaining = boxData.remaining - 1;
                    transaction.update(boxRef, {
                        remaining: newRemaining,
                        ...(newRemaining === 0 ? { status: "sold_out" } : {}),
                    });

                    // Create claim record
                    const claimRef = firestore.collection("mystery_box_claims").doc();
                    transaction.set(claimRef, {
                        boxId,
                        userId: authenticatedTelegramId,
                        claimedAt: new Date().toISOString(),
                        paymentMethod,
                        paymentAmount: paymentMethod === "ton" ? boxData.price?.ton : boxData.price?.qntm,
                        revealedNft: null, // Admin reveals later or auto-assign
                    });

                    return { claimId: claimRef.id, remaining: newRemaining };
                });

                return NextResponse.json({ success: true, ...result });
            }

            case "get-claims": {
                const snapshot = await firestore
                    .collection("mystery_box_claims")
                    .where("userId", "==", authenticatedTelegramId)
                    .orderBy("claimedAt", "desc")
                    .limit(50)
                    .get();

                const claims = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                return NextResponse.json({ success: true, claims });
            }

            default:
                return NextResponse.json({ error: "Unknown action" }, { status: 400 });
        }
    } catch (error) {
        console.error("[Mystery Box API] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
