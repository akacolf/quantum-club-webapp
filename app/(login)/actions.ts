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

    // Create Firebase custom token and deterministic QC ID
    const customToken = await firebaseAuth.createCustomToken(rawTelegramId);
    const telegramIdEncrypted = encryptTelegramId(rawTelegramId);

    return { customToken, telegramIdEncrypted, sessionSetFromInitData };
  });

// ---------------------------------------------------------------------------
// checkUserRank — calculate and store user rank based on QNTM amount
// ---------------------------------------------------------------------------

const checkUserRankSchema = z.object({
  userName: z.string().optional(),
});

export const checkUserRank = authWithQcIdClient
  .schema(checkUserRankSchema)
  .action(async ({ parsedInput: { userName }, ctx: { telegramId } }) => {

    // Fetch QuantAmount from server, don't trust client
    const userMiningRef = firestore.doc(`user/${telegramId}/miningData/values`);
    const userMiningDoc = await userMiningRef.get();
    const QuantAmount = userMiningDoc.exists ? (userMiningDoc.data()?.QuantAmount || 0) : 0;

    const userRank = await firestore
      .collection("userRanks")
      .where("QuantAmount", ">", QuantAmount)
      .count()
      .get();

    const rank = userRank.data().count + 1;
    const userRankRef = firestore.collection("userRanks").doc(telegramId);
    await userRankRef.set({
      userId: telegramId,
      rank,
      QuantAmount,
      username: userName,
    }, { merge: true });

    return { rank };
  });
