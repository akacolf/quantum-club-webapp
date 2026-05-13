import { Redis } from "@upstash/redis";
import { env } from "@/env";

let warned = false;

/**
 * Returns a singleton Upstash Redis client, or `null` if env vars are missing.
 * Callers should fail open (allow the request) when this returns null so local
 * dev without Upstash configured doesn't break the bot.
 */
let _redis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;

  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!warned) {
      console.warn(
        "[upstash] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting disabled",
      );
      warned = true;
    }
    _redis = null;
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}
