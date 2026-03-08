"use server";

import { z } from "zod";
import { authWithQcIdClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";
import admin from "firebase-admin";

// ---------------------------------------------------------------------------
// fetchFrensData — server-side fetch of referral counts, rewards, earnings
// ---------------------------------------------------------------------------

export const fetchFrensData = authWithQcIdClient
  .action(async ({ ctx: { qcId } }) => {
    const referralsRef = firestore.collection(`user/${qcId}/referrals`);
    const secondTierRef = firestore.collection(`user/${qcId}/secondTierReferrals`);

    const [referralSnap, secondTierSnap, unclaimedSnap, earningsDoc] = await Promise.all([
      referralsRef.count().get(),
      secondTierRef.count().get(),
      secondTierRef.where("claimed", "==", false).get(),
      firestore.doc(`user/${qcId}/referralEarnings/ton`).get(),
    ]);

    let pendingRewards = 0;
    unclaimedSnap.forEach((d: admin.firestore.QueryDocumentSnapshot) => {
      pendingRewards += Number(d.data().reward) || 0;
    });

    const tonEarnings = earningsDoc.exists
      ? Number(earningsDoc.data()?.pendingAmount) || 0
      : 0;

    return {
      referralCount: referralSnap.data().count,
      secondTierCount: secondTierSnap.data().count,
      pendingRewards,
      tonEarnings,
    };
  });

// ---------------------------------------------------------------------------
// fetchReferralList — server-side fetch of referral details (cross-user reads)
// ---------------------------------------------------------------------------

const MAX_REFERRALS = 20;

export const fetchReferralList = authWithQcIdClient
  .action(async ({ ctx: { qcId } }) => {
    const referralsSnap = await firestore.collection(`user/${qcId}/referrals`).get();

    if (referralsSnap.empty) return { referrals: [] };

    const referrals: Array<{ id: string; username: string; quantamount: number }> = [];
    let count = 0;

    for (const docSnapshot of referralsSnap.docs) {
      if (count >= MAX_REFERRALS) break;
      const referredId = docSnapshot.id;
      try {
        const [referredDoc, coinsDoc] = await Promise.all([
          firestore.doc(`user/${referredId}`).get(),
          firestore.doc(`user/${referredId}/miningData/values`).get(),
        ]);
        const username = referredDoc.data()?.username ?? "";
        const coins = coinsDoc.exists && coinsDoc.data()?.firstQuant
          ? parseFloat(coinsDoc.data()!.firstQuant).toFixed(0)
          : "0";

        referrals.push({ id: referredId, username, quantamount: Number(coins) });
        count++;
      } catch (error) {
        console.error("Error fetching referral:", error);
      }
    }

    return { referrals };
  });

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
// claimReferralTon — authenticated (uses encrypted QC ID for Firestore paths)
// ---------------------------------------------------------------------------

export const claimReferralTon = authWithQcIdClient
  .action(async ({ ctx: { qcId } }) => {
    const earningsRef = firestore.doc(`user/${qcId}/referralEarnings/ton`);
    const earningsDoc = await earningsRef.get();

    if (!earningsDoc.exists) {
      return { success: true, claimedAmount: 0, message: "No pending earnings to claim" };
    }

    const earningsData = earningsDoc.data();
    const pendingAmount = Number(earningsData?.pendingAmount) || 0;

    if (pendingAmount <= 0) {
      return { success: true, claimedAmount: 0, message: "No pending earnings to claim" };
    }

    const userDoc = await firestore.doc(`user/${qcId}`).get();
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

      const claimRef = firestore.collection(`user/${qcId}/referralClaims`).doc();
      transaction.set(claimRef, {
        amount: freshPending,
        walletAddress,
        status: "pending_payout",
        createdAt: FieldValue.serverTimestamp(),
      });

      const payoutRef = firestore.collection("referralPayouts").doc();
      transaction.set(payoutRef, {
        qcId,
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
