"use server";

import { z } from "zod";
import { actionClient, authWithQcIdClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";
import admin from "firebase-admin";

// ---------------------------------------------------------------------------
// verifyQcId — public (no auth required), checks if a QC ID exists
// ---------------------------------------------------------------------------

export const verifyQcId = actionClient
  .schema(z.object({ qcId: z.string().min(1, "QC ID is required") }))
  .action(async ({ parsedInput: { qcId } }) => {
    const trimmed = qcId.trim();

    const userRef = firestore.doc(`user/${trimmed}/miningData/values`);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return { exists: false as const };
    }

    const profileRef = firestore.doc(`user/${trimmed}`);
    const profileSnapshot = await profileRef.get();
    const username = profileSnapshot.exists
      ? profileSnapshot.data()?.username || "Quantum User"
      : "Quantum User";

    return { exists: true as const, username };
  });

// ---------------------------------------------------------------------------
// transferQntm — authenticated, performs QNTM transfer between users
// ---------------------------------------------------------------------------

const transferSchema = z.object({
  recipientQcId: z.string().min(1, "recipientQcId is required"),
  amount: z.coerce.number().refine((val) => val > 0, {
    message: "Amount must be a positive number",
  }),
});

export const transferQntm = authWithQcIdClient
  .schema(transferSchema)
  .action(async ({ parsedInput: { recipientQcId, amount: transferAmount }, ctx: { qcId: senderQcId } }) => {
    // Prevent self-transfer
    if (senderQcId === recipientQcId) {
      throw new Error("Cannot transfer to yourself");
    }

    // Check sender exists
    const senderMiningRef = firestore.doc(`user/${senderQcId}/miningData/values`);
    const senderSnapshot = await senderMiningRef.get();
    if (!senderSnapshot.exists) {
      throw new Error("Sender account not found");
    }

    const senderBalance = senderSnapshot.data()?.QuantAmount || 0;
    if (senderBalance < transferAmount) {
      throw new Error("Insufficient QNTM balance");
    }

    // Check recipient exists
    const recipientMiningRef = firestore.doc(`user/${recipientQcId}/miningData/values`);
    const recipientSnapshot = await recipientMiningRef.get();
    if (!recipientSnapshot.exists) {
      throw new Error("Recipient not found. Make sure the QC ID is correct.");
    }

    // Atomic transfer
    const result = await firestore.runTransaction(async (transaction) => {
      const senderDoc = await transaction.get(senderMiningRef);
      if (!senderDoc.exists) throw new Error("Sender account not found");
      const currentSenderBalance = senderDoc.data()?.QuantAmount || 0;
      if (currentSenderBalance < transferAmount) throw new Error("Insufficient QNTM balance");

      const recipientDoc = await transaction.get(recipientMiningRef);
      if (!recipientDoc.exists) throw new Error("Recipient not found");
      const currentRecipientBalance = recipientDoc.data()?.QuantAmount || 0;

      const transferId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      transaction.update(senderMiningRef, {
        QuantAmount: currentSenderBalance - transferAmount,
      });
      transaction.update(recipientMiningRef, {
        QuantAmount: currentRecipientBalance + transferAmount,
      });

      // Transfer history — sender
      transaction.set(firestore.doc(`user/${senderQcId}/transferHistory/${transferId}_sent`), {
        type: "sent",
        amount: transferAmount,
        to: recipientQcId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        date: new Date().toISOString(),
      });

      // Transfer history — recipient
      transaction.set(firestore.doc(`user/${recipientQcId}/transferHistory/${transferId}_received`), {
        type: "received",
        amount: transferAmount,
        from: senderQcId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        date: new Date().toISOString(),
      });

      return { newSenderBalance: currentSenderBalance - transferAmount };
    });

    return {
      success: true,
      newBalance: result.newSenderBalance,
      transferredAmount: transferAmount,
    };
  });
