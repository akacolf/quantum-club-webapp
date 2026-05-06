"use server";

import { z } from "zod";
import { authWithQcIdClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";
import { sendNotification } from "@/lib/notifications";
import { env } from "@/env";

// ---------------------------------------------------------------------------
// sendCallNotification — authenticated, sends push notification for incoming call
// ---------------------------------------------------------------------------

const callNotificationSchema = z.object({
  calleeId: z.string().min(1, "Callee ID is required"),
  callerName: z.string().optional().default(""),
  chatId: z.string().min(1, "Chat ID is required"),
});

async function resolveCallerName(qcId: string, fallback: string): Promise<string> {
  const indexed = await firestore
    .collection("qcUsernames")
    .where("qcId", "==", qcId)
    .limit(1)
    .get();
  if (!indexed.empty) {
    const doc = indexed.docs[0];
    const display = (doc.data().displayUsername as string | undefined) ?? doc.id;
    if (display) return display.replace(/^@+/, "").trim();
  }
  const userSnap = await firestore.doc(`user/${qcId}`).get();
  const username = ((userSnap.data()?.qcUsername as string | undefined) ?? "")
    .replace(/^@+/, "")
    .trim();
  return username || fallback.replace(/^@+/, "").trim() || "Quantum Club user";
}

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

export const sendCallNotification = authWithQcIdClient
  .schema(callNotificationSchema)
  .action(async ({ parsedInput: { calleeId, callerName, chatId }, ctx: { qcId } }) => {
    try {
      const resolvedCallerName = await resolveCallerName(qcId, callerName);
      // Check presence — skip if user is currently online in-app
      const presenceSnap = await firestore.doc(`qc-presence/${calleeId}`).get();
      if (presenceSnap.exists) {
        const presence = presenceSnap.data();
        if (presence?.isOnline) {
          return { success: true, skipped: true };
        }
      }

      // Look up numerical Telegram ID from user doc
      const userSnap = await firestore.doc(`user/${calleeId}`).get();
      if (!userSnap.exists) {
        throw new Error("User not found");
      }

      const userData = userSnap.data();
      if (!userData) {
        throw new Error("Empty user data");
      }

      const numericalId = resolveTelegramId(userData);
      if (!numericalId) {
        throw new Error("No telegram ID");
      }

      const message = `Incoming voice call from <b>${resolvedCallerName}</b>`;
      const botUsername = env.BOT_USERNAME || "QuantumClubBot";
      const deepLinkUrl = `https://t.me/${botUsername}/app?startapp=chat_${chatId}`;
      const replyMarkup = {
        inline_keyboard: [[{ text: "Open Chat", url: deepLinkUrl }]],
      };

      await sendNotification(numericalId, message, { replyMarkup });
    } catch (err) {
      console.error("[sendCallNotification] Failed:", err);
    }

    return { success: true };
  });
