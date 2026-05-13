// Upstash-backed JSON cache wrapper. Falls back to no-cache when Upstash isn't
// configured (local dev without env vars) so callers don't break.
//
// For data already fetched via `fetch()`, prefer Next's built-in revalidation:
//   fetch(url, { next: { revalidate: 60 } })
// That's regional, free, and lower latency than this. Use cached() for SDK
// calls or computed values that can't ride Next's fetch cache.

import { getRedis } from "@/lib/upstash";

/**
 * Memoize an async function in Upstash for `ttlSeconds`.
 * Returns the fresh value on cache miss / on cache backend failure.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const redis = getRedis();
  if (!redis) return fn();

  try {
    const hit = await redis.get<T>(key);
    if (hit != null) return hit;
  } catch (e) {
    console.warn(`[cache:get] ${key} failed, recomputing`, e);
  }

  const value = await fn();

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (e) {
    console.warn(`[cache:set] ${key} failed`, e);
  }

  return value;
}

/**
 * Drop a key from the cache (e.g. after a mutation that invalidates it).
 */
export async function invalidate(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (e) {
    console.warn(`[cache:del] ${key} failed`, e);
  }
}
