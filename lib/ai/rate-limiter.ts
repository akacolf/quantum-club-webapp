import { firestore } from "@/app/(firebase)/server";

const RATE_LIMIT_PER_DAY = 50;
const RATE_LIMIT_PER_DAY_PRO = 250;

async function isProUser(userId: string): Promise<boolean> {
    try {
        const profileSnap = await firestore.doc(`socialProfiles/${userId}`).get();
        if (!profileSnap.exists) return false;
        const proExpiresAt = profileSnap.data()?.proExpiresAt as
            | { toMillis(): number }
            | null
            | undefined;
        return proExpiresAt != null && proExpiresAt.toMillis() > Date.now();
    } catch {
        return false;
    }
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    error?: string;
}

/**
 * Check and update rate limit for a user using an atomic Firestore transaction.
 * Uses the Firebase Admin SDK to comply with Firestore security rules
 * (which require server-only Admin writes to /user/{userId}/aiUsage).
 *
 * @param userId - The Telegram user ID
 * @returns RateLimitResult with allowed status and remaining count
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    const limit = (await isProUser(userId))
        ? RATE_LIMIT_PER_DAY_PRO
        : RATE_LIMIT_PER_DAY;

    try {
        const rateLimitRef = firestore.doc(`user/${userId}/aiUsage/daily`);

        const result = await firestore.runTransaction(async (transaction) => {
            const rateLimitDoc = await transaction.get(rateLimitRef);

            if (!rateLimitDoc.exists) {
                // First time user - create new record
                transaction.set(rateLimitRef, {
                    count: 1,
                    date: todayStr,
                    lastUsed: new Date().toISOString(),
                });
                return { allowed: true, remaining: limit - 1 };
            }

            const data = rateLimitDoc.data() || {};

            // New day — reset counter
            if (data.date !== todayStr) {
                transaction.set(rateLimitRef, {
                    count: 1,
                    date: todayStr,
                    lastUsed: new Date().toISOString(),
                });
                return { allowed: true, remaining: limit - 1 };
            }

            // Same day — check limit
            if ((data.count || 0) >= limit) {
                return { allowed: false, remaining: 0 };
            }

            // Increment counter atomically
            transaction.update(rateLimitRef, {
                count: (data.count || 0) + 1,
                lastUsed: new Date().toISOString(),
            });
            return { allowed: true, remaining: limit - (data.count || 0) - 1 };
        });

        if (!result.allowed) {
            return {
                ...result,
                resetAt: tomorrow,
                error: `Daily limit of ${limit} messages reached. Resets at midnight UTC.`,
            };
        }

        return { ...result, resetAt: tomorrow };
    } catch (error) {
        console.error("Rate limit check error:", error);
        // Fail open: allow the request on error to avoid falsely blocking users
        return {
            allowed: true,
            remaining: limit,
            resetAt: tomorrow,
        };
    }
}
