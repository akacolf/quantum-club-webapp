/**
 * Phase-2 affinity scoring — server-side counter writes. Counters are bumped
 * from server actions on meaningful interactions (likes, replies, follows,
 * unlocks, post/profile views) and read by the client at feed-render time.
 *
 * Storage: `user/{readerQcId}/socialAffinity/{authorQcId}` — a single doc per
 * reader/author pair. Lives under the reader's private user subcollection so
 * existing Firestore rules already scope reads/writes to the owner.
 *
 * Pure types/weights/scoring live in `lib/social-affinity-shared.ts` so the
 * client ranker can import them without pulling firebase-admin into the
 * browser bundle.
 */

import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "@/app/(firebase)/server";
import type { AffinityKind } from "@/lib/social-affinity-shared";

export type {
  AffinityKind,
  AffinityCounts,
} from "@/lib/social-affinity-shared";
export {
  AFFINITY_WEIGHTS,
  AFFINITY_CAPS,
  affinityScoreFromCounts,
} from "@/lib/social-affinity-shared";

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
