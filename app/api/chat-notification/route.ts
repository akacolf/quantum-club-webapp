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
        if (!userSnap.exists) return;

        const userData = userSnap.data();
        const userArray = userData?.userArray;
        if (typeof userArray !== "string") return;

        const numericalId = extractNumericalTelegramId(userArray);
        if (!numericalId) return;

        // Format message
        const message = isGroup
          ? `${senderName} in ${chatName}: New message`
          : `${senderName}: New message`;

        await sendNotification(numericalId, message);
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
