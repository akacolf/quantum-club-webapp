import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { sendNotification } from "@/lib/notifications";
import { decrypt } from "@/utils/session";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    }),
  });
}

const db = admin.firestore();

// Rate limit: 1 notification per user per chat per 30s
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 30_000;

function isRateLimited(userId: string, chatId: string): boolean {
  const key = `${userId}:${chatId}`;
  const last = rateLimitMap.get(key);
  const now = Date.now();
  if (last && now - last < RATE_LIMIT_MS) return true;
  rateLimitMap.set(key, now);
  // Clean old entries periodically
  if (rateLimitMap.size > 10_000) {
    const cutoff = now - RATE_LIMIT_MS;
    for (const [k, v] of rateLimitMap) {
      if (v < cutoff) rateLimitMap.delete(k);
    }
  }
  return false;
}

function extractNumericalTelegramId(userArray: string): string | null {
  const match = userArray.match(/telegramId=(\d+)/);
  return match ? match[1] : null;
}

function resolveTelegramId(userData: admin.firestore.DocumentData): string | null {
  // Primary: dedicated field (most reliable)
  if (userData.numericalTelegramId) {
    return String(userData.numericalTelegramId);
  }
  // Fallback: extract from userArray string
  const userArray = userData.userArray;
  if (typeof userArray === "string") {
    return extractNumericalTelegramId(userArray);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Validate session
    const sessionCookie = req.cookies.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      await decrypt(sessionCookie);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { recipientIds, senderName, chatId, chatName, isGroup } = body as {
      recipientIds: string[];
      senderName: string;
      chatId: string;
      chatName: string;
      isGroup: boolean;
    };

    if (!recipientIds?.length || !senderName || !chatId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Process notifications in parallel (fire-and-forget style but within route)
    const promises = recipientIds.map(async (encryptedId) => {
      try {
        if (isRateLimited(encryptedId, chatId)) return;

        // Check presence — skip if user is online viewing this chat
        const presenceSnap = await db.doc(`qc-presence/${encryptedId}`).get();
        if (presenceSnap.exists) {
          const presence = presenceSnap.data();
          if (presence?.isOnline && presence?.currentChatId === chatId) return;
        }

        // Look up numerical Telegram ID from user doc
        const userSnap = await db.doc(`user/${encryptedId}`).get();
        if (!userSnap.exists) {
          console.warn(`[chat-notification] No user doc for ${encryptedId}`);
          return;
        }

        const userData = userSnap.data();
        if (!userData) {
          console.warn(`[chat-notification] Empty user data for ${encryptedId}`);
          return;
        }

        const numericalId = resolveTelegramId(userData);
        if (!numericalId) {
          console.warn(`[chat-notification] No telegramId resolved for ${encryptedId}`);
          return;
        }

        // Read unread count from chat doc for richer message content
        let unreadCount = 1;
        try {
          const chatSnap = await db.doc(`qc-chats/${chatId}`).get();
          if (chatSnap.exists) {
            const chatData = chatSnap.data();
            const count = chatData?.unreadCounts?.[encryptedId];
            if (typeof count === "number" && count > 0) {
              unreadCount = count;
            }
          }
        } catch {
          // Non-critical, use default count
        }

        // Format message with unread count
        const countText = unreadCount === 1
          ? "new message"
          : `${unreadCount} new messages`;
        const message = isGroup
          ? `<b>${senderName}</b> in <b>${chatName}</b>\nYou have ${countText}`
          : `You have ${countText} from <b>${senderName}</b>`;

        // Build deep link button to open the chat directly
        const botUsername = process.env.BOT_USERNAME || "QuantumClubBot";
        const deepLinkUrl = `https://t.me/${botUsername}/app?startapp=chat_${chatId}`;
        const replyMarkup = {
          inline_keyboard: [[{ text: "Open Chat", url: deepLinkUrl }]],
        };

        await sendNotification(numericalId, message, { replyMarkup });
      } catch (err) {
        console.error(`[chat-notification] Failed for ${encryptedId}:`, err);
      }
    });

    await Promise.allSettled(promises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[chat-notification] Route error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
