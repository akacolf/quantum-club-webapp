/**
 * Phase-2 affinity scoring — per-(reader, author) engagement counters that
 * feed into the for-you ranker. Counters are bumped from server actions on
 * meaningful interactions (likes, replies, follows, unlocks, post/profile
 * views) and read by the client at feed-render time.
 *
 * Storage: `user/{readerQcId}/socialAffinity/{authorQcId}` — a single doc per
 * reader/author pair. Lives under the reader's private user subcollection so
 * existing Firestore rules already scope reads/writes to the owner.
 */

import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "@/app/(firebase)/server";

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
 * Bump the affinity counter for (reader → author) on a single interaction.
 * Self-engagement (reader == author) is a no-op since following/liking your
 * own posts shouldn't influence your for-you ranking.
 */
export async function bumpAffinity(
  readerQcId: string,
  authorQcId: string,
  kind: AffinityKind,
): Promise<void> {
  if (!readerQcId || !authorQcId || readerQcId === authorQcId) return;

  const ref = firestore.doc(
    `user/${readerQcId}/socialAffinity/${authorQcId}`,
  );

  const patch: Record<string, unknown> = {
    authorQcId,
    lastEngagedAt: FieldValue.serverTimestamp(),
  };

  switch (kind) {
    case "like":
      patch.likes = FieldValue.increment(1);
      break;
    case "reply":
      patch.replies = FieldValue.increment(1);
      break;
    case "unlock":
      patch.unlocks = FieldValue.increment(1);
      break;
    case "follow":
      // follow is a presence flag, not a counter — clamp to {0, 1}.
      patch.follows = 1;
      break;
    case "unfollow":
      patch.follows = 0;
      break;
    case "profileView":
      patch.profileViews = FieldValue.increment(1);
      break;
    case "postView":
      patch.postViews = FieldValue.increment(1);
      break;
  }

  await ref.set(patch, { merge: true });
}

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
