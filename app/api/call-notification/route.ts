// @deprecated — use server action sendCallNotification in app/(contexts)/call-actions.ts instead
import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { sendNotification } from "@/lib/notifications";
import { decrypt } from "@/utils/session";
import { env } from "@/env";
import { callNotificationSchema } from "@/lib/validations";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();

function resolveTelegramId(userData: admin.firestore.DocumentData): string | null {
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
    const parsed = callNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    const { calleeId, callerName, chatId } = parsed.data;

    try {
      // Check presence — skip if user is currently online in-app
      const presenceSnap = await db.doc(`qc-presence/${calleeId}`).get();
      if (presenceSnap.exists) {
        const presence = presenceSnap.data();
        if (presence?.isOnline) {
          // User is online, the in-app overlay will handle it
          return NextResponse.json({ success: true, skipped: true });
        }
      }

      // Look up numerical Telegram ID from user doc
      const userSnap = await db.doc(`user/${calleeId}`).get();
      if (!userSnap.exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const userData = userSnap.data();
      if (!userData) {
        return NextResponse.json({ error: "Empty user data" }, { status: 404 });
      }

      const numericalId = resolveTelegramId(userData);
      if (!numericalId) {
        return NextResponse.json({ error: "No telegram ID" }, { status: 404 });
      }

      const message = `Incoming voice call from <b>${callerName}</b>`;

      const botUsername = env.BOT_USERNAME || "QuantumClubBot";
      const deepLinkUrl = `https://t.me/${botUsername}/app?startapp=chat_${chatId}`;
      const replyMarkup = {
        inline_keyboard: [[{ text: "Open Chat", url: deepLinkUrl }]],
      };

      await sendNotification(numericalId, message, { replyMarkup });
    } catch (err) {
      console.error("[call-notification] Failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[call-notification] Route error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
