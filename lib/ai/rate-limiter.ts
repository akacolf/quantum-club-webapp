import { dbfs } from "@/app/(firebase)/client";
import { doc, runTransaction } from "firebase/firestore";

const RATE_LIMIT_PER_DAY = 20;

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    error?: string;
}

/**
 * Check and update rate limit for a user using an atomic Firestore transaction.
 * Prevents concurrent requests from bypassing the daily limit.
 * @param userId - The Telegram user ID
 * @returns RateLimitResult with allowed status and remaining count
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    try {
        const rateLimitRef = doc(dbfs, `user/${userId}/aiUsage/daily`);

        const result = await runTransaction(dbfs, async (transaction) => {
            const rateLimitDoc = await transaction.get(rateLimitRef);

            if (!rateLimitDoc.exists()) {
                // First time user - create new record
                transaction.set(rateLimitRef, {
                    count: 1,
                    date: todayStr,
                    lastUsed: new Date().toISOString(),
                });
                return { allowed: true, remaining: RATE_LIMIT_PER_DAY - 1 };
            }

            const data = rateLimitDoc.data();

            // New day — reset counter
            if (data.date !== todayStr) {
                transaction.set(rateLimitRef, {
                    count: 1,
                    date: todayStr,
                    lastUsed: new Date().toISOString(),
                });
                return { allowed: true, remaining: RATE_LIMIT_PER_DAY - 1 };
            }

            // Same day — check limit
            if (data.count >= RATE_LIMIT_PER_DAY) {
                return { allowed: false, remaining: 0 };
            }

            // Increment counter atomically
            transaction.update(rateLimitRef, {
                count: data.count + 1,
                lastUsed: new Date().toISOString(),
            });
            return { allowed: true, remaining: RATE_LIMIT_PER_DAY - data.count - 1 };
        });

        if (!result.allowed) {
            return {
                ...result,
                resetAt: tomorrow,
                error: `Daily limit of ${RATE_LIMIT_PER_DAY} messages reached. Resets at midnight UTC.`,
            };
        }

        return { ...result, resetAt: tomorrow };
    } catch (error) {
        console.error("Rate limit check error:", error);
        // Fail closed: deny the request on error to prevent abuse during outages
        return {
            allowed: false,
            remaining: 0,
            resetAt: tomorrow,
            error: "Rate limit check temporarily unavailable. Please try again.",
        };
    }
}
