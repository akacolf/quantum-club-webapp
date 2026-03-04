"use server";

import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";
import { sendNotification } from "@/lib/notifications";
import { env } from "@/env";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_REGEX,
  RESERVED_USERNAMES,
} from "@/lib/validations";

// ---------------------------------------------------------------------------
// sendChatNotification — fire-and-forget push notification for chat messages
// ---------------------------------------------------------------------------

const chatNotificationSchema = z.object({
  recipientIds: z.array(z.string().min(1)).min(1),
  senderName: z.string().min(1),
  chatId: z.string().min(1),
  chatName: z.string().optional().default(""),
  isGroup: z.boolean().optional().default(false),
});

function resolveTelegramId(userData: Record<string, unknown>): string | null {
  if (userData.numericalTelegramId) {
    return String(userData.numericalTelegramId);
  }
  const userArray = userData.userArray;
  if (typeof userArray === "string") {
    const match = userArray.match(/telegramId=(\d+)/);
    return match ? match[1] : null;
  }
  return null;
}

// Rate limit: 1 notification per user per chat per 30s
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 30_000;

function isRateLimited(userId: string, chatId: string): boolean {
  const key = `${userId}:${chatId}`;
  const last = rateLimitMap.get(key);
  const now = Date.now();
  if (last && now - last < RATE_LIMIT_MS) return true;
  rateLimitMap.set(key, now);
  if (rateLimitMap.size > 10_000) {
    const cutoff = now - RATE_LIMIT_MS;
    for (const [k, v] of rateLimitMap) {
      if (v < cutoff) rateLimitMap.delete(k);
    }
  }
  return false;
}

export const sendChatNotification = authActionClient
  .schema(chatNotificationSchema)
  .action(
    async ({
      parsedInput: { recipientIds, senderName, chatId, chatName, isGroup },
    }) => {
      const promises = recipientIds.map(async (encryptedId) => {
        try {
          if (isRateLimited(encryptedId, chatId)) return;

          // Check presence — skip if user is online viewing this chat
          const presenceSnap = await firestore
            .doc(`qc-presence/${encryptedId}`)
            .get();
          if (presenceSnap.exists) {
            const presence = presenceSnap.data();
            if (presence?.isOnline && presence?.currentChatId === chatId)
              return;
          }

          // Look up numerical Telegram ID from user doc
          const userSnap = await firestore.doc(`user/${encryptedId}`).get();
          if (!userSnap.exists) return;

          const userData = userSnap.data();
          if (!userData) return;

          const numericalId = resolveTelegramId(userData);
          if (!numericalId) return;

          const message = isGroup
            ? `<b>${senderName}</b> in <b>${chatName}</b>\nYou have a new message`
            : `You have a new message from <b>${senderName}</b>`;

          const botUsername = env.BOT_USERNAME || "QuantumClubBot";
          const deepLinkUrl = `https://t.me/${botUsername}/app?startapp=chat_${chatId}`;
          const replyMarkup = {
            inline_keyboard: [[{ text: "Open Chat", url: deepLinkUrl }]],
          };

          await sendNotification(numericalId, message, { replyMarkup });
        } catch (err) {
          console.error(
            `[sendChatNotification] Failed for ${encryptedId}:`,
            err,
          );
        }
      });

      await Promise.allSettled(promises);
      return { success: true };
    },
  );

// ---------------------------------------------------------------------------
// registerQcUsername — register a QC chat username
// ---------------------------------------------------------------------------

const USERNAMES_COLLECTION = "qcUsernames";

const registerUsernameSchema = z.object({
  username: z.string().min(1, "Username is required"),
  qcId: z.string().min(1).max(100),
  address: z
    .string()
    .max(100)
    .regex(
      /^(EQ|UQ|0:|kQ)[a-zA-Z0-9_-]{46,48}$/,
      "Invalid wallet address format",
    )
    .optional(),
});

export const registerQcUsername = authActionClient
  .schema(registerUsernameSchema)
  .action(async ({ parsedInput: { username: rawUsername, qcId, address } }) => {
    const username = rawUsername.toLowerCase().replace(/^@/, "").trim();
    const displayUsername = rawUsername.replace(/^@/, "").trim();

    if (username.length < USERNAME_MIN_LENGTH) {
      throw new Error(
        `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
      );
    }
    if (username.length > USERNAME_MAX_LENGTH) {
      throw new Error(
        `Username must be at most ${USERNAME_MAX_LENGTH} characters`,
      );
    }
    if (!USERNAME_REGEX.test(username)) {
      throw new Error(
        "Letters, numbers, dots, underscores, and hyphens only (no leading/trailing special chars)",
      );
    }
    if (RESERVED_USERNAMES.includes(username)) {
      throw new Error("This username is reserved");
    }

    const existing = await firestore
      .collection(USERNAMES_COLLECTION)
      .doc(username)
      .get();
    if (existing.exists) {
      throw new Error("This username is already taken");
    }

    const existingUser = await firestore
      .collection(USERNAMES_COLLECTION)
      .where("qcId", "==", qcId)
      .limit(1)
      .get();
    if (!existingUser.empty) {
      throw new Error("You already have a username");
    }

    await firestore.collection(USERNAMES_COLLECTION).doc(username).set({
      qcId,
      displayUsername,
      address: address || null,
      createdAt: new Date(),
    });

    await firestore
      .doc(`user/${qcId}`)
      .set({ qcUsername: displayUsername }, { merge: true });

    return { success: true, username: displayUsername };
  });

// ---------------------------------------------------------------------------
// updateQcUsernameAddress — link wallet address to existing QC username
// ---------------------------------------------------------------------------

const updateAddressSchema = z.object({
  qcId: z.string().min(1).max(100),
  address: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^(EQ|UQ|0:|kQ)[a-zA-Z0-9_-]{46,48}$/,
      "Invalid wallet address format",
    ),
});

export const updateQcUsernameAddress = authActionClient
  .schema(updateAddressSchema)
  .action(async ({ parsedInput: { qcId, address } }) => {
    const snapshot = await firestore
      .collection(USERNAMES_COLLECTION)
      .where("qcId", "==", qcId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error("No username found for this user");
    }

    const usernameDocId = snapshot.docs[0].id;
    await firestore
      .collection(USERNAMES_COLLECTION)
      .doc(usernameDocId)
      .update({ address });

    return { success: true, username: usernameDocId, address };
  });
