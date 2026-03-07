import { dbfs } from "@/app/(firebase)/client";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const RATE_LIMIT_PER_DAY = 20;

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    error?: string;
}

/**
 * Check and update rate limit for a user
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
        const rateLimitDoc = await getDoc(rateLimitRef);

        if (!rateLimitDoc.exists()) {
            // First time user - create new record
            await setDoc(rateLimitRef, {
                count: 1,
                date: todayStr,
                lastUsed: new Date().toISOString(),
            });

            return {
                allowed: true,
                remaining: RATE_LIMIT_PER_DAY - 1,
                resetAt: tomorrow,
            };
        }

        const data = rateLimitDoc.data();

        // Check if it's a new day - reset counter
        if (data.date !== todayStr) {
            await setDoc(rateLimitRef, {
                count: 1,
                date: todayStr,
                lastUsed: new Date().toISOString(),
            });

            return {
                allowed: true,
                remaining: RATE_LIMIT_PER_DAY - 1,
                resetAt: tomorrow,
            };
        }

        // Same day - check if within limit
        if (data.count >= RATE_LIMIT_PER_DAY) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: tomorrow,
                error: `Daily limit of ${RATE_LIMIT_PER_DAY} messages reached. Resets at midnight UTC.`,
            };
        }

        // Increment counter
        await updateDoc(rateLimitRef, {
            count: data.count + 1,
            lastUsed: new Date().toISOString(),
        });

        return {
            allowed: true,
            remaining: RATE_LIMIT_PER_DAY - data.count - 1,
            resetAt: tomorrow,
        };
    } catch (error) {
        console.error("Rate limit check error:", error);
        // On error, allow the request but log it
        return {
            allowed: true,
            remaining: -1,
            resetAt: tomorrow,
            error: "Rate limit check failed",
        };
    }
}