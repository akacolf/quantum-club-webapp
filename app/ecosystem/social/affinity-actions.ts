"use server";

import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { authWithQcIdClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";
import { bumpAffinity } from "@/lib/social-affinity";

const recordProfileViewSchema = z.object({
  authorQcId: z.string().min(1),
});

const recordPostViewSchema = z.object({
  authorQcId: z.string().min(1),
  postId: z.string().min(1),
});

/**
 * Fire-and-forget on profile-page mount. Caller debounces to avoid spamming
 * counts during rapid back/forward navigation. No-op for self-views.
 */
export const recordSocialProfileView = authWithQcIdClient
  .schema(recordProfileViewSchema)
  .action(async ({ parsedInput: { authorQcId }, ctx: { qcId } }) => {
    await bumpAffinity(qcId, authorQcId, "profileView");
    return { success: true };
  });

/**
 * Fire-and-forget on post-detail mount. Same debounce contract as above.
 * Bumps the author-affinity counter and increments the post's `viewCount`
 * once per (reader, post) pair — a sentinel doc at
 * `.../posts/{postId}/views/{readerQcId}` dedups repeat visits.
 * Self-views (author === reader) don't increment the counter.
 */
export const recordSocialPostView = authWithQcIdClient
  .schema(recordPostViewSchema)
  .action(
    async ({ parsedInput: { authorQcId, postId }, ctx: { qcId } }) => {
      await bumpAffinity(qcId, authorQcId, "postView");

      if (qcId === authorQcId) return { success: true };

      const postRef = firestore.doc(
        `socialProfiles/${authorQcId}/posts/${postId}`,
      );
      const viewRef = postRef.collection("views").doc(qcId);

      try {
        await firestore.runTransaction(async (tx) => {
          const existing = await tx.get(viewRef);
          if (existing.exists) return;
          tx.set(viewRef, { viewedAt: FieldValue.serverTimestamp() });
          tx.update(postRef, { viewCount: FieldValue.increment(1) });
        });
      } catch (err) {
        // Best-effort — don't fail the user-facing action if the bump fails.
        console.error("[recordSocialPostView] viewCount bump failed:", err);
      }

      return { success: true };
    },
  );
