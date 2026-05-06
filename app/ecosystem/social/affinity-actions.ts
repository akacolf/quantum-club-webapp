"use server";

import { z } from "zod";
import { authWithQcIdClient } from "@/lib/safe-action";
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
 * `postId` is accepted for future per-post view tracking; today only the
 * author-affinity counter is bumped.
 */
export const recordSocialPostView = authWithQcIdClient
  .schema(recordPostViewSchema)
  .action(async ({ parsedInput: { authorQcId }, ctx: { qcId } }) => {
    await bumpAffinity(qcId, authorQcId, "postView");
    return { success: true };
  });
