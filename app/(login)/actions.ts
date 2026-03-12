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
        return { exists: true, qcId: snapshot.docs[0].id };
      }
    }

    if (qcId) {
      const doc = await firestore.collection("user").doc(qcId).get();
      if (doc.exists) {
        return { exists: true, qcId };
      }
    }

    return { exists: false, qcId: null };
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

    const cookieStore = await cookies();

    // Always validate initData when provided — ensures a fresh session on
    // every explicit login, preventing stale session cookies from causing
    // auth loops after sign-out.
    if (initData) {
      const validationResult = validateTelegramWebAppData(initData);
      const user = validationResult.user as { id?: string | number };
      if (!validationResult.validatedData || user?.id == null) {
        throw new Error(validationResult.message || "Invalid Telegram initData");
      }
      rawTelegramId = String(user.id);

      // Always create a fresh session cookie
      const expires = new Date(Date.now() + SESSION_DURATION);
      const session = await encrypt({ user: { telegramId: rawTelegramId }, expires });
      cookieStore.set("session", session, {
        expires,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    // Fallback: try existing session cookie (e.g. rehydration calls without fresh initData)
    if (!rawTelegramId) {
      const sessionCookie = cookieStore.get("session")?.value;
      if (sessionCookie) {
        try {
          const sessionData = await decrypt(sessionCookie);
          rawTelegramId = String(sessionData.user.telegramId);
        } catch {
          // Session cookie is invalid/expired — clear it
          cookieStore.delete("session");
          rawTelegramId = null;
        }
      }
    }

    if (!rawTelegramId) {
      throw new Error("Unauthorized");
    }

    // Create Firebase custom token using encrypted QC ID so that
    // request.auth.uid matches Firestore document paths (user/{qcId}/...).
    const telegramIdEncrypted = encryptTelegramId(rawTelegramId);
    const customToken = await firebaseAuth.createCustomToken(telegramIdEncrypted);

    return { customToken, telegramIdEncrypted };
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

    const referrerValuesRef = firestore.doc(`user/${referrerId}/miningData/values`);
    const referralDocRef = firestore.doc(`user/${referrerId}/referrals/${newUserQcId}`);

    // Use transaction to prevent duplicate referrals from concurrent requests
    const result = await firestore.runTransaction(async (tx) => {
      const [referrerValuesSnap, existingReferral] = await Promise.all([
        tx.get(referrerValuesRef),
        tx.get(referralDocRef),
      ]);

      if (!referrerValuesSnap.exists) return { processed: false };
      if (existingReferral.exists) return { processed: false };

      // Record referral on referrer
      tx.set(referralDocRef, { telegramId: newUserQcId });

      // Store who referred the new user
      tx.set(firestore.doc(`user/${newUserQcId}/miningData/referralInfo`), {
        referredBy: referrerId,
        referredAt: new Date().toISOString(),
      });

      // 10% reward for referrer
      const referredAmount = referrerValuesSnap.data()?.QuantAmount;
      if (referredAmount != null) {
        const referredTenAmount = ((quantValue + 122) * 10) / 100;
        const referredUpdatedAmount = Number(referredAmount) + referredTenAmount;
        tx.update(referrerValuesRef, { QuantAmount: referredUpdatedAmount });
      }

      return { processed: true };
    });

    if (!result.processed) return result;

    // 2% reward for referrer's referrer (second-tier, outside transaction — non-critical)
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
