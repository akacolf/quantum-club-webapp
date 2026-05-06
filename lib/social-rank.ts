/**
 * For-you ranker. Heuristic + affinity-aware: phase 1 (engagement, recency,
 * follow boost, diversity pass) is now augmented with phase-2 per-(reader,
 * author) affinity counters fed in from `lib/social-affinity.ts`.
 *
 * Score recipe:
 *   score = engagement(log-scaled)
 *         + recency_decay
 *         + follow_boost
 *         + affinity_boost(reader → author)
 *         - self_penalty
 * then apply a diversity penalty over the sorted output so consecutive
 * posts from the same author are pushed apart.
 */

import type { SocialPost } from "@/lib/social-types";
import {
  affinityScoreFromCounts,
  type AffinityCounts,
} from "@/lib/social-affinity-shared";
import {
  cosineSim,
  MIN_INTERACTIONS_FOR_TASTE,
  SEMANTIC_BOOST_SCALE,
} from "@/lib/social-similarity";

interface RankContext {
  /** qcIds the viewer follows — used for follow boost */
  followedQcIds: Set<string>;
  /** Viewer's own qcId — small self-author penalty so own posts don't pin top */
  selfQcId: string | null;
  /** Per-author affinity counters for the viewer (phase 2). Optional. */
  affinityByAuthor?: Map<string, Partial<AffinityCounts>>;
  /**
   * Phase-3 — viewer's running-average taste vector. Cosine similarity vs
   * each post's embedding feeds an additional boost. Skipped entirely when
   * absent or below the bootstrap threshold (`tasteInteractionCount`).
   */
  tasteVector?: number[] | null;
  tasteInteractionCount?: number;
  /** Reference time (ms). Defaults to Date.now(); injectable for tests. */
  now?: number;
}

const RECENCY_HALF_LIFE_HOURS = 6;
const FOLLOW_BOOST = 1.5;
const SELF_PENALTY = 0.5;
const POST_AGE_MAX_DAYS = 7;
/**
 * Multiplier on the affinity score (already log-scaled). Tuned so a power
 * engager with strong history (~10 likes + 1 unlock) gets roughly the same
 * boost as a follow — they shouldn't dominate the feed entirely.
 */
const AFFINITY_BOOST_SCALE = 1.2;

function recencyScore(createdAtMs: number, nowMs: number): number {
  const ageHours = Math.max(0, (nowMs - createdAtMs) / 3_600_000);
  if (ageHours > POST_AGE_MAX_DAYS * 24) return 0;
  return Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS) * 3;
}

function engagementScore(post: SocialPost): number {
  const reactions = Object.values(post.reactions).reduce(
    (sum, n) => sum + (n ?? 0),
    0,
  );
  const total = reactions + post.replyCount * 2 + post.repostCount * 3;
  return Math.log1p(total);
}

export function scorePost(post: SocialPost, ctx: RankContext): number {
  const now = ctx.now ?? Date.now();
  const createdAtMs = post.createdAt?.toMillis?.() ?? 0;
  if (!createdAtMs) return -Infinity;

  let score = engagementScore(post) + recencyScore(createdAtMs, now);

  if (ctx.followedQcIds.has(post.authorQcId)) {
    score += FOLLOW_BOOST;
  }
  if (ctx.selfQcId && post.authorQcId === ctx.selfQcId) {
    score -= SELF_PENALTY;
  }

  const affinity = ctx.affinityByAuthor?.get(post.authorQcId);
  if (affinity) {
    score += affinityScoreFromCounts(affinity) * AFFINITY_BOOST_SCALE;
  }

  // Phase-3 semantic boost. Gated on bootstrap threshold so a fresh user
  // with a noisy taste vector doesn't get worse rankings than the heuristic.
  if (
    ctx.tasteVector &&
    post.embedding &&
    (ctx.tasteInteractionCount ?? 0) >= MIN_INTERACTIONS_FOR_TASTE
  ) {
    const sim = cosineSim(post.embedding, ctx.tasteVector);
    if (sim > 0) score += sim * SEMANTIC_BOOST_SCALE;
  }

  return score;
}

/**
 * Sort posts by score, then apply a diversity pass that pushes consecutive
 * posts from the same author at least one slot apart. Linear-time, single
 * scan; degrades gracefully if the same author dominates the pool.
 */
export function rankFeed(
  posts: SocialPost[],
  ctx: RankContext,
): SocialPost[] {
  const seen = new Set<string>();
  const deduped: SocialPost[] = [];
  for (const post of posts) {
    const key = `${post.authorQcId}:${post.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(post);
  }

  const scored = deduped
    .map((p) => ({ post: p, score: scorePost(p, ctx) }))
    .sort((a, b) => b.score - a.score);

  const ordered: SocialPost[] = [];
  const queue = scored.slice();
  while (queue.length) {
    const lastAuthor = ordered[ordered.length - 1]?.authorQcId;
    let pickIdx = 0;
    if (lastAuthor) {
      const altIdx = queue.findIndex((q) => q.post.authorQcId !== lastAuthor);
      if (altIdx >= 0) pickIdx = altIdx;
    }
    ordered.push(queue.splice(pickIdx, 1)[0].post);
  }
  return ordered;
}
