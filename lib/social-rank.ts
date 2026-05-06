/**
 * Phase-1 for-you ranker — pure heuristic, runs client-side over the
 * discover + following candidate pool. No per-user signals yet; phase 2
 * will introduce a Cloud Function that recomputes affinity from like/reply/
 * profile-view events and folds it in here.
 *
 * Score recipe:
 *   score = engagement(log-scaled) + recency_decay + affinity_boost
 *   then apply a diversity penalty over the sorted output so consecutive
 *   posts from the same author are pushed apart.
 */

import type { SocialPost } from "@/lib/social-types";

interface RankContext {
  /** qcIds the viewer follows — used for affinity boost */
  followedQcIds: Set<string>;
  /** Viewer's own qcId — small self-author penalty so own posts don't pin top */
  selfQcId: string | null;
  /** Reference time (ms). Defaults to Date.now(); injectable for tests. */
  now?: number;
}

const RECENCY_HALF_LIFE_HOURS = 6;
const FOLLOW_BOOST = 1.5;
const SELF_PENALTY = 0.5;
const POST_AGE_MAX_DAYS = 7;

function recencyScore(createdAtMs: number, nowMs: number): number {
  const ageHours = Math.max(0, (nowMs - createdAtMs) / 3_600_000);
  if (ageHours > POST_AGE_MAX_DAYS * 24) return 0;
  // Exponential decay with the configured half-life.
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

  // Diversity pass: if the next post has the same author as the previous
  // accepted post, swap it with the closest later candidate that doesn't.
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
