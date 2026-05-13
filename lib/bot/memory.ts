// Short-term conversation memory for the LLM intent layer. Stored in Upstash
// with a tight TTL so it doesn't pile up. We keep both sides of the exchange
// (user → bot) so the LLM can resolve referents like "the biggest one" or
// "swap it" after a /portfolio.
//
// Fails open: if Upstash is unavailable, the bot still works but each turn
// is stateless (which is the current pre-memory behavior).

import { getRedis } from "@/lib/upstash";

const TTL_SECONDS = 10 * 60; // 10 minutes
const MAX_TURNS = 5; // last 5 user+bot pairs
const KEY_PREFIX = "qcbot:mem";

export interface MemoryTurn {
  role: "user" | "bot";
  text: string;
  ts: number;
}

function key(userId: number | string): string {
  return `${KEY_PREFIX}:${userId}`;
}

export async function appendTurn(
  userId: number | string,
  role: "user" | "bot",
  text: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const k = key(userId);
  const trimmed = text.length > 400 ? text.slice(0, 400) + "…" : text;
  const turn: MemoryTurn = { role, text: trimmed, ts: Date.now() };
  try {
    await redis.rpush(k, JSON.stringify(turn));
    // Trim to the last MAX_TURNS*2 entries (user+bot per turn).
    await redis.ltrim(k, -MAX_TURNS * 2, -1);
    await redis.expire(k, TTL_SECONDS);
  } catch (e) {
    console.warn("[bot:memory] append failed", e);
  }
}

export async function getRecentTurns(
  userId: number | string,
): Promise<MemoryTurn[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = await redis.lrange<string>(key(userId), 0, -1);
    return raw
      .map((s) => {
        try {
          // Upstash returns JSON-decoded values when stored as objects via the
          // REST API, but lrange<string>() requested string. Tolerate both.
          return typeof s === "string" ? (JSON.parse(s) as MemoryTurn) : (s as MemoryTurn);
        } catch {
          return null;
        }
      })
      .filter((t): t is MemoryTurn => t !== null);
  } catch (e) {
    console.warn("[bot:memory] read failed", e);
    return [];
  }
}

export async function clearMemory(userId: number | string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key(userId));
  } catch (e) {
    console.warn("[bot:memory] clear failed", e);
  }
}
