"use server";

import { authWithQcIdClient, authActionClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";
import admin from "firebase-admin";

// ---------------------------------------------------------------------------
// claimTier2Rewards — authenticated (needs encrypted QC ID)
// ---------------------------------------------------------------------------

export const claimTier2Rewards = authWithQcIdClient
  .action(async ({ ctx: { qcId: telegramId } }) => {
    const secondTierRef = firestore.collection(`user/${telegramId}/secondTierReferrals`);
    const unclaimedSnapshot = await secondTierRef.where("claimed", "==", false).get();

    if (unclaimedSnapshot.empty) {
      return { success: true, claimedAmount: 0, message: "No pending rewards to claim" };
    }

    let totalReward = 0;
    const batch = firestore.batch();

    unclaimedSnapshot.forEach((docSnapshot: admin.firestore.QueryDocumentSnapshot) => {
      const data = docSnapshot.data();
      totalReward += Number(data.reward) || 0;
      batch.update(docSnapshot.ref, {
        claimed: true,
        claimedAt: new Date().toISOString(),
      });
    });

    const valuesRef = firestore.doc(`user/${telegramId}/miningData/values`);
    const valuesSnapshot = await valuesRef.get();
    if (!valuesSnapshot.exists) {
      throw new Error("User values not found");
    }

    const currentAmount = valuesSnapshot.data()?.QuantAmount || 0;
    const newAmount = Number(currentAmount) + totalReward;
    batch.update(valuesRef, { QuantAmount: newAmount });

    await batch.commit();

    return {
      success: true,
      claimedAmount: totalReward,
      newBalance: newAmount,
      claimedCount: unclaimedSnapshot.size,
    };
  });

// ---------------------------------------------------------------------------
// claimReferralTon — authenticated (uses raw telegramId, not encrypted)
// ---------------------------------------------------------------------------

export const claimReferralTon = authActionClient
  .action(async ({ ctx: { session } }) => {
    const telegramId = String(session.user.telegramId);

    const earningsRef = firestore.doc(`user/${telegramId}/referralEarnings/ton`);
    const earningsDoc = await earningsRef.get();

    if (!earningsDoc.exists) {
      return { success: true, claimedAmount: 0, message: "No pending earnings to claim" };
    }

    const earningsData = earningsDoc.data();
    const pendingAmount = Number(earningsData?.pendingAmount) || 0;

    if (pendingAmount <= 0) {
      return { success: true, claimedAmount: 0, message: "No pending earnings to claim" };
    }

    const userDoc = await firestore.doc(`user/${telegramId}`).get();
    const walletAddress = userDoc.data()?.walletAddress;
    if (!walletAddress) {
      throw new Error("No wallet address found. Please set up your QC Wallet first.");
    }

    await firestore.runTransaction(async (transaction) => {
      const freshEarningsDoc = await transaction.get(earningsRef);
      const freshPending = Number(freshEarningsDoc.data()?.pendingAmount) || 0;
      if (freshPending <= 0) {
        throw new Error("No pending earnings");
      }

      transaction.update(earningsRef, {
        pendingAmount: 0,
        claimedAmount: FieldValue.increment(freshPending),
        lastClaimAt: FieldValue.serverTimestamp(),
      });

      const claimRef = firestore.collection(`user/${telegramId}/referralClaims`).doc();
      transaction.set(claimRef, {
        amount: freshPending,
        walletAddress,
        status: "pending_payout",
        createdAt: FieldValue.serverTimestamp(),
      });

      const payoutRef = firestore.collection("referralPayouts").doc();
      transaction.set(payoutRef, {
        telegramId,
        walletAddress,
        amount: freshPending,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      success: true,
      claimedAmount: pendingAmount,
      message: "Claim submitted! TON will be sent to your wallet shortly.",
    };
  });
