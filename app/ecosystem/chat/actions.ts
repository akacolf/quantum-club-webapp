"use server";

import { z } from "zod";
import { authActionClient, authWithQcIdClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";
import { sendNotification } from "@/lib/notifications";
import { env } from "@/env";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_REGEX,
  RESERVED_USERNAMES,
  createTokenCommunityChatSchema,
} from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";

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

function formatQcDisplayName(value: string, fallback: string) {
  const normalized = value.replace(/^@+/, "").trim();
  return normalized ? `@${normalized}` : fallback;
}

export const sendChatNotification = authActionClient
  .schema(chatNotificationSchema)
  .action(
    async ({
      parsedInput: { recipientIds, senderName, chatId, chatName, isGroup },
    }) => {
      const promises = recipientIds.map(async (encryptedId) => {
        try {
          if (await checkRateLimit(`chat:${encryptedId}:${chatId}`, 30_000, 1)) return;

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

          const displaySenderName = formatQcDisplayName(senderName, "Quantum Club user");
          const displayChatName = chatName.trim() || "QC chat";
          const message = isGroup
            ? `<b>${displaySenderName}</b> in <b>${displayChatName}</b>\nYou have a new message`
            : `You have a new message from <b>${displaySenderName}</b>`;

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
  address: z
    .string()
    .max(100)
    .regex(
      /^(EQ|UQ|0:|kQ)[a-zA-Z0-9_-]{46,48}$/,
      "Invalid wallet address format",
    )
    .optional(),
});

export const registerQcUsername = authWithQcIdClient
  .schema(registerUsernameSchema)
  .action(async ({ parsedInput: { username: rawUsername, address }, ctx: { qcId } }) => {
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
  address: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^(EQ|UQ|0:|kQ)[a-zA-Z0-9_-]{46,48}$/,
      "Invalid wallet address format",
    ),
});

export const updateQcUsernameAddress = authWithQcIdClient
  .schema(updateAddressSchema)
  .action(async ({ parsedInput: { address }, ctx: { qcId } }) => {
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

// ---------------------------------------------------------------------------
// resolveQcUsername — resolve a QC username to check availability / get address
// ---------------------------------------------------------------------------

const resolveUsernameSchema = z.object({
  username: z.string().optional(),
  qcId: z.string().optional(),
  address: z.string().optional(),
}).refine((d) => d.username || d.qcId || d.address, {
  message: "Provide username, qcId, or address",
});

export const resolveQcUsername = authActionClient
  .schema(resolveUsernameSchema)
  .action(async ({ parsedInput: { username: usernameParam, qcId, address } }) => {
    if (usernameParam) {
      const normalizedUsername = usernameParam.toLowerCase().replace(/^@/, "");
      const doc = await firestore
        .collection(USERNAMES_COLLECTION)
        .doc(normalizedUsername)
        .get();

      if (!doc.exists) {
        return {
          username: normalizedUsername,
          available: true,
          resolved: false,
          address: null,
          owner: null,
          profilePhotoUrl: null,
        };
      }

      const data = doc.data()!;
      return {
        username: normalizedUsername,
        available: false,
        resolved: true,
        address: data.address || null,
        owner: data.qcId,
        profilePhotoUrl: data.profilePhotoUrl || null,
      };
    }

    if (qcId) {
      const snapshot = await firestore
        .collection(USERNAMES_COLLECTION)
        .where("qcId", "==", qcId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return { username: null, address: null, profilePhotoUrl: null };
      }

      const doc = snapshot.docs[0];
      return {
        username: doc.data().displayUsername || doc.id,
        address: doc.data().address || null,
        profilePhotoUrl: doc.data().profilePhotoUrl || null,
      };
    }

    if (address) {
      const snapshot = await firestore
        .collection(USERNAMES_COLLECTION)
        .where("address", "==", address)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return { username: null, address: null, profilePhotoUrl: null };
      }

      const doc = snapshot.docs[0];
      return {
        username: doc.data().displayUsername || doc.id,
        address: doc.data().address,
        profilePhotoUrl: doc.data().profilePhotoUrl || null,
      };
    }

    throw new Error("Provide username, qcId, or address parameter");
  });

// ---------------------------------------------------------------------------
// updateProfilePhotoUrl — persist a new profile photo URL on the user's
// qcUsername doc. The upload itself happens client-side directly to Firebase
// Storage (see storage.rules: profile-photos/{userId}); this action only
// writes the resulting download URL into the public qcUsernames collection
// which is write-gated to the Admin SDK.
// ---------------------------------------------------------------------------

const updateProfilePhotoSchema = z.object({
  url: z
    .string()
    .url("Invalid photo URL")
    .max(2048, "URL too long"),
});

export const updateProfilePhotoUrl = authWithQcIdClient
  .schema(updateProfilePhotoSchema)
  .action(async ({ parsedInput: { url }, ctx: { qcId } }) => {
    const snapshot = await firestore
      .collection(USERNAMES_COLLECTION)
      .where("qcId", "==", qcId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error("Claim a QC username before uploading a photo");
    }

    const usernameDocId = snapshot.docs[0].id;
    await firestore
      .collection(USERNAMES_COLLECTION)
      .doc(usernameDocId)
      .update({ profilePhotoUrl: url });

    return { success: true, url };
  });

// ---------------------------------------------------------------------------
// getTurnCredentials — get TURN/STUN server credentials for WebRTC
// ---------------------------------------------------------------------------

export const getTurnCredentials = authActionClient
  .schema(z.object({}))
  .action(async () => {
    const { env } = await import("@/env");
    const TURN_KEY_ID = env.CLOUDFLARE_TURN_KEY_ID;
    const TURN_API_TOKEN = env.CLOUDFLARE_TURN_API_TOKEN;

    const FALLBACK_ICE_SERVERS = [
      { urls: "stun:stun.cloudflare.com:3478" },
    ];

    if (!TURN_KEY_ID || !TURN_API_TOKEN) {
      return FALLBACK_ICE_SERVERS;
    }

    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TURN_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 86400 }),
      },
    );

    if (!res.ok) {
      console.error("[turn-credentials] Cloudflare API error:", res.status);
      return FALLBACK_ICE_SERVERS;
    }

    const data = await res.json();
    return data.iceServers;
  });

// ---------------------------------------------------------------------------
// createTokenCommunityChat — create a QC Chat group linked to a token
// ---------------------------------------------------------------------------

export const createTokenCommunityChat = authWithQcIdClient
  .schema(createTokenCommunityChatSchema)
  .action(
    async ({
      parsedInput: { tokenId, tokenSymbol, tokenName },
      ctx: { qcId },
    }) => {
      // Idempotency: check if a community chat already exists for this token
      const existingSnap = await firestore
        .collection("qc-chats")
        .where("linkedTokenId", "==", tokenId)
        .where("isGroup", "==", true)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        return { success: true, chatId: existingSnap.docs[0].id };
      }

      // Resolve display name from QC username
      const usernameSnap = await firestore
        .collection("qcUsernames")
        .where("qcId", "==", qcId)
        .limit(1)
        .get();

      const displayName = usernameSnap.empty
        ? "Unknown"
        : usernameSnap.docs[0].data().displayUsername || usernameSnap.docs[0].id;

      // Generate join code and epoch nonce
      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { randomBytes } = await import("crypto");
      const epochNonce = randomBytes(16).toString("hex");

      const chatId = `token_${tokenId}_${Date.now()}`;

      await firestore.collection("qc-chats").doc(chatId).set({
        isGroup: true,
        isGlobal: false,
        groupName: `${tokenSymbol} Community`,
        participants: [qcId],
        participantNames: { [qcId]: displayName },
        createdBy: qcId,
        joinCode,
        linkedTokenId: tokenId,
        linkedTokenSymbol: tokenSymbol,
        lastMessage: `${displayName} created the ${tokenName} community`,
        lastMessageBy: "system",
        lastMessageAt: new Date(),
        createdAt: new Date(),
        epochNonce,
        epochCounter: 0,
        epochNonces: { 0: epochNonce },
      });

      // Write communityChatId back to the token doc for fast lookup
      await firestore
        .doc(`tokens/${tokenId}`)
        .update({ communityChatId: chatId });

      return { success: true, chatId };
    },
  );
