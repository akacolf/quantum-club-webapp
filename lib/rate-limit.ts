import { firestore } from "@/app/(firebase)/server";

const COLLECTION = "rate_limits";

/**
 * Firestore-backed rate limiter. Returns true if the request is rate-limited.
 *
 * @param key   Unique identifier (e.g. `upload:${userId}` or `chat:${userId}:${chatId}`)
 * @param windowMs   Time window in milliseconds
 * @param maxCount   Maximum requests allowed within the window
 */
export async function checkRateLimit(
  key: string,
  windowMs: number,
  maxCount: number,
): Promise<boolean> {
  const now = Date.now();
  const ref = firestore.collection(COLLECTION).doc(key);

  return firestore.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.data();

    if (!data || now - data.windowStart > windowMs) {
      tx.set(ref, { count: 1, windowStart: now });
      return false;
    }

    if (data.count >= maxCount) {
      return true;
    }

    tx.update(ref, { count: data.count + 1 });
    return false;
  });
}
