"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { actionClient, authWithQcIdClient } from "@/lib/safe-action";
import { firestore, auth as firebaseAuth } from "@/app/(firebase)/server";
import { encrypt, decrypt, SESSION_DURATION } from "@/utils/session";
import { validateTelegramWebAppData } from "@/utils/telegramAuth";
import { encryptTelegramId } from "@/utils/encrypt-telegram-id";

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

// ---------------------------------------------------------------------------
// authenticateTelegram — validates initData, creates session, returns custom token
// ---------------------------------------------------------------------------

const authenticateTelegramSchema = z.object({
  initData: z.string().min(1),
});

export const authenticateTelegram = actionClient
  .schema(authenticateTelegramSchema)
  .action(async ({ parsedInput: { initData } }) => {
    let rawTelegramId: string | null = null;
    let sessionSetFromInitData = false;

    // 1) Check existing session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (sessionCookie) {
      try {
        const sessionData = await decrypt(sessionCookie);
        rawTelegramId = String(sessionData.user.telegramId);
      } catch {
        rawTelegramId = null;
      }
    }

    // 2) Fallback: validate initData and bootstrap session
    if (!rawTelegramId && initData) {
      const validationResult = validateTelegramWebAppData(initData);
      const user = validationResult.user as { id?: string | number };
      if (!validationResult.validatedData || user?.id == null) {
        throw new Error(validationResult.message || "Invalid Telegram initData");
      }
      rawTelegramId = String(user.id);

      const expires = new Date(Date.now() + SESSION_DURATION);
      const session = await encrypt({ user: { telegramId: rawTelegramId }, expires });
      cookieStore.set("session", session, {
        expires,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });
      sessionSetFromInitData = true;
    }

    if (!rawTelegramId) {
      throw new Error("Unauthorized");
    }

    // Create Firebase custom token using encrypted QC ID so that
    // request.auth.uid matches Firestore document paths (user/{qcId}/...).
    const telegramIdEncrypted = encryptTelegramId(rawTelegramId);
    const customToken = await firebaseAuth.createCustomToken(telegramIdEncrypted);

    return { customToken, telegramIdEncrypted, sessionSetFromInitData };
  });

// ---------------------------------------------------------------------------
// checkUserRank — calculate and store user rank based on QNTM amount
// ---------------------------------------------------------------------------

const checkUserRankSchema = z.object({
  userName: z.string().optional(),
});

// ---------------------------------------------------------------------------
// processReferral — server-side referral processing (Admin SDK bypasses rules)
// Cross-user writes (referrer's subcollection, reward updates) cannot be done
// on the client because Firestore rules restrict writes to the document owner.
// ---------------------------------------------------------------------------

const processReferralSchema = z.object({
  referrerId: z.string().min(1),
  newUserQcId: z.string().min(1),
  quantValue: z.number(),
});

export const processReferral = actionClient
  .schema(processReferralSchema)
  .action(async ({ parsedInput: { referrerId, newUserQcId, quantValue } }) => {
    // Don't allow self-referral
    if (referrerId === newUserQcId) return { processed: false };

    // Check referrer exists
    const referrerValuesRef = firestore.doc(`user/${referrerId}/miningData/values`);
    const referrerValuesSnap = await referrerValuesRef.get();
    if (!referrerValuesSnap.exists) return { processed: false };

    // Check if referral already recorded
    const referralDocRef = firestore.doc(`user/${referrerId}/referrals/${newUserQcId}`);
    const existingReferral = await referralDocRef.get();
    if (existingReferral.exists) return { processed: false };

    // Record referral on referrer
    await referralDocRef.set({ telegramId: newUserQcId });

    // Store who referred the new user
    const newUserReferralInfo = firestore.doc(`user/${newUserQcId}/miningData/referralInfo`);
    await newUserReferralInfo.set({
      referredBy: referrerId,
      referredAt: new Date().toISOString(),
    });

    // 10% reward for referrer
    const referredAmount = referrerValuesSnap.data()?.QuantAmount;
    if (referredAmount != null) {
      const referredTenAmount = ((quantValue + 122) * 10) / 100;
      const referredUpdatedAmount = Number(referredAmount) + referredTenAmount;
      await referrerValuesRef.update({ QuantAmount: referredUpdatedAmount });
    }

    // 2% reward for referrer's referrer (second-tier referral)
    try {
      const referrerInfoSnap = await firestore.doc(`user/${referrerId}/miningData/referralInfo`).get();
      if (referrerInfoSnap.exists) {
        const grandReferrerID = referrerInfoSnap.data()?.referredBy;
        if (grandReferrerID && grandReferrerID !== newUserQcId && grandReferrerID !== referrerId) {
          const grandReferrerSnap = await firestore.doc(`user/${grandReferrerID}/miningData/values`).get();
          if (grandReferrerSnap.exists) {
            const secondTierReward = ((quantValue + 122) * 2) / 100;
            await firestore.doc(`user/${grandReferrerID}/secondTierReferrals/${newUserQcId}`).set({
              telegramId: newUserQcId,
              referredBy: referrerId,
              reward: secondTierReward,
              claimed: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err) {
      console.error("Second-tier referral error:", err);
    }

    return { processed: true };
  });

// ---------------------------------------------------------------------------
// checkUserRank — calculate and store user rank based on QNTM amount
// ---------------------------------------------------------------------------

export const checkUserRank = authWithQcIdClient
  .schema(checkUserRankSchema)
  .action(async ({ parsedInput: { userName }, ctx: { qcId } }) => {

    // Fetch QuantAmount from server, don't trust client
    const userMiningRef = firestore.doc(`user/${qcId}/miningData/values`);
    const userMiningDoc = await userMiningRef.get();
    const QuantAmount = userMiningDoc.exists ? (userMiningDoc.data()?.QuantAmount || 0) : 0;

    const userRank = await firestore
      .collection("userRanks")
      .where("QuantAmount", ">", QuantAmount)
      .count()
      .get();

    const rank = userRank.data().count + 1;
    const userRankRef = firestore.collection("userRanks").doc(qcId);
    await userRankRef.set({
      userId: qcId,
      rank,
      QuantAmount,
      username: userName,
    }, { merge: true });

    return { rank };
  });
