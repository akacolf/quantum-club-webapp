/**
 * Phase-2 affinity scoring — client-safe types, weights, and the pure scoring
 * function. Split out of `lib/social-affinity.ts` so the for-you ranker (which
 * runs in the client bundle) can import it without dragging firebase-admin in.
 */

export type AffinityKind =
  | "like"
  | "reply"
  | "unlock"
  | "follow"
  | "unfollow"
  | "profileView"
  | "postView";

export interface AffinityCounts {
  likes: number;
  replies: number;
  unlocks: number;
  follows: number;
  profileViews: number;
  postViews: number;
}

/**
 * Weights used by the client-side ranker. Tuned so the high-intent signals
 * (paying to unlock, following) dominate noisy ones (passive views).
 */
export const AFFINITY_WEIGHTS = {
  likes: 1,
  replies: 3,
  unlocks: 10,
  follows: 5,
  profileViews: 0.5,
  postViews: 0.1,
} as const;

/** Caps so a single dimension can't dominate the score. */
export const AFFINITY_CAPS = {
  profileViews: 5,
  postViews: 20,
} as const;

/**
 * Compute the boost a single (reader, author) pair contributes to the ranker.
 * Pure function so the client can apply it after pulling the affinity map.
 *
 * Formula: log1p of the weighted sum of all signals. Log-scaling means a
 * heavy-engager doesn't get an unbounded boost — the marginal effect of the
 * 100th like is much smaller than the first.
 */
export function affinityScoreFromCounts(counts: Partial<AffinityCounts>): number {
  const profileViews = Math.min(
    counts.profileViews ?? 0,
    AFFINITY_CAPS.profileViews,
  );
  const postViews = Math.min(counts.postViews ?? 0, AFFINITY_CAPS.postViews);

  const weighted =
    (counts.likes ?? 0) * AFFINITY_WEIGHTS.likes +
    (counts.replies ?? 0) * AFFINITY_WEIGHTS.replies +
    (counts.unlocks ?? 0) * AFFINITY_WEIGHTS.unlocks +
    (counts.follows ?? 0) * AFFINITY_WEIGHTS.follows +
    profileViews * AFFINITY_WEIGHTS.profileViews +
    postViews * AFFINITY_WEIGHTS.postViews;

  return Math.log1p(Math.max(0, weighted));
}
