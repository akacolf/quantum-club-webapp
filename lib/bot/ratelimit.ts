// Sliding-window rate limiters for the QC bot, backed by Upstash Redis.
//
// Two tiers:
//   - botCommandLimit: per-user, broad (covers all messages, regex + LLM)
//   - botLLMLimit:     per-user AND global, narrow (only LLM intent calls)
//
// LLM is the expensive subset (Gemini call + Fluid CPU during inference), so
// it gets its own tighter budget on top of the general per-user limit.
//
// Both fail open: if Upstash is unreachable or unconfigured, limits return
// `{ success: true }` so the bot never silently breaks for the user. Cost
// protection is best-effort, not safety-critical.

import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/upstash";

let _commandLimit: Ratelimit | null = null;
let _llmUserLimit: Ratelimit | null = null;
let _llmGlobalLimit: Ratelimit | null = null;

function commandLimit(): Ratelimit | null {
  if (_commandLimit) return _commandLimit;
  const redis = getRedis();
  if (!redis) return null;
  _commandLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "60 s"),
    prefix: "qcbot:cmd",
    analytics: false,
  });
  return _commandLimit;
}

function llmUserLimit(): Ratelimit | null {
  if (_llmUserLimit) return _llmUserLimit;
  const redis = getRedis();
  if (!redis) return null;
  _llmUserLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "qcbot:llm:user",
    analytics: false,
  });
  return _llmUserLimit;
}

function llmGlobalLimit(): Ratelimit | null {
  if (_llmGlobalLimit) return _llmGlobalLimit;
  const redis = getRedis();
  if (!redis) return null;
  _llmGlobalLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, "1 h"),
    prefix: "qcbot:llm:global",
    analytics: false,
  });
  return _llmGlobalLimit;
}

export interface LimitResult {
  allowed: boolean;
  reason?: "user-cmd" | "user-llm" | "global-llm";
}

/**
 * Per-user, broad command limit. Fires for every dispatched message
 * (regex-parsed or LLM-inferred). Cheap; runs after parse, before dispatch.
 */
export async function checkCommandLimit(userId: number): Promise<LimitResult> {
  const limit = commandLimit();
  if (!limit) return { allowed: true };
  try {
    const { success } = await limit.limit(`u:${userId}`);
    return success ? { allowed: true } : { allowed: false, reason: "user-cmd" };
  } catch (e) {
    console.error("[bot:ratelimit] command limit error, failing open", e);
    return { allowed: true };
  }
}

/**
 * Tight LLM-specific limit. Per-user budget AND a global ceiling — global
 * trips first if the bot suddenly gets popular, protecting Fluid CPU before
 * anyone hits their personal cap.
 *
 * Runs BEFORE the LLM call. Skip-heuristics run before this.
 */
export async function checkLLMLimit(userId: number): Promise<LimitResult> {
  const userLimit = llmUserLimit();
  const globalLimit = llmGlobalLimit();
  if (!userLimit || !globalLimit) return { allowed: true };

  try {
    const [userRes, globalRes] = await Promise.all([
      userLimit.limit(`u:${userId}`),
      globalLimit.limit("all"),
    ]);
    if (!globalRes.success) return { allowed: false, reason: "global-llm" };
    if (!userRes.success) return { allowed: false, reason: "user-llm" };
    return { allowed: true };
  } catch (e) {
    console.error("[bot:ratelimit] llm limit error, failing open", e);
    return { allowed: true };
  }
}
