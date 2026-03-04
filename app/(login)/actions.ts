"use server";

import { z } from "zod";
import { actionClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";

// ---------------------------------------------------------------------------
// checkExistingUser — public (no auth required), checks if user exists by email or QC ID
// ---------------------------------------------------------------------------

const checkExistingUserSchema = z
  .object({
    email: z.string().email().optional(),
    qcId: z.string().min(1).max(100).optional(),
  })
  .refine((d) => d.email || d.qcId, { message: "Provide email or qcId" });

export const checkExistingUser = actionClient
  .schema(checkExistingUserSchema)
  .action(async ({ parsedInput: { email, qcId } }) => {
    if (email) {
      const snapshot = await firestore
        .collection("user")
        .where("email", "==", email)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        return { exists: true };
      }
    }

    if (qcId) {
      const doc = await firestore.collection("user").doc(qcId).get();
      if (doc.exists) {
        return { exists: true };
      }
    }

    return { exists: false };
  });
