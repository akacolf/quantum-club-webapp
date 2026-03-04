import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { decrypt } from '@/utils/session';
import { createCipheriv } from 'node:crypto';
import { env } from '@/env';
import { z } from 'zod';

const getUserValuesSchema = z.object({
  telegramId: z.string().min(1).optional(),
});

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

function encryptTelegramId(telegramId: string): string {
  const encryptionKey = Buffer.from(env.AES_ENCRYPTION_KEY, 'base64');
  const iv = Buffer.from("00000000000000000000000000000000", 'utf8');
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  let encrypted = cipher.update(telegramId, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted.replace(/['"]+/g, "").replace(/[^a-zA-Z0-9]/g, "");
}

async function resolveTelegramId(
  request: NextRequest,
  requestedTelegramId: string | null
): Promise<string | null> {
  // 1) Preferred auth source for Telegram Mini App sessions
  const sessionCookie = request.cookies.get('session')?.value;
  if (sessionCookie) {
    try {
      const sessionData = await decrypt(sessionCookie);
      const rawTelegramId = String(sessionData.user?.telegramId || "");
      if (rawTelegramId) {
        return encryptTelegramId(rawTelegramId);
      }
    } catch {
      // Ignore invalid session cookie and continue with fallback auth sources.
    }
  }

  // 2) Fallback for email/Firebase auth flows
  const firebaseAuthToken = request.cookies.get("firebaseAuthToken")?.value;
  if (firebaseAuthToken) {
    try {
      const decoded = await admin.auth().verifyIdToken(firebaseAuthToken);
      const uid = String(decoded.uid || "");
      const encryptedUid = uid ? encryptTelegramId(uid) : "";

      // For email users, map account email -> QC user doc ID.
      if (decoded.email) {
        const snapshot = await admin
          .firestore()
          .collection("user")
          .where("email", "==", decoded.email)
          .limit(1)
          .get();
        if (!snapshot.empty) {
          return snapshot.docs[0].id;
        }
      }

      // If client provided a QC ID that matches authenticated uid/encrypted uid, trust it.
      if (
        requestedTelegramId &&
        (requestedTelegramId === uid || requestedTelegramId === encryptedUid)
      ) {
        return requestedTelegramId;
      }

      // If no explicit mapping found, use whichever uid form exists as a user doc.
      if (uid) {
        const uidDoc = await admin.firestore().doc(`user/${uid}`).get();
        if (uidDoc.exists) return uid;
      }
      if (encryptedUid) {
        const encryptedDoc = await admin.firestore().doc(`user/${encryptedUid}`).get();
        if (encryptedDoc.exists) return encryptedUid;
      }
    } catch {
      // Ignore invalid Firebase token and fall through to best-effort fallback.
    }
  }

  // 3) Best-effort fallback so leaderboard remains visible even without a valid auth cookie.
  return requestedTelegramId;
}

export async function POST(request:NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = getUserValuesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    const requestedTelegramId = parsed.data.telegramId ?? null;
    const telegramId = await resolveTelegramId(request, requestedTelegramId);

    const valuesSnapshot = await admin.firestore()
      .collection('userRanks') 
      .orderBy('QuantAmount', 'desc')
      .limit(50)
      .get();

    const allValues = valuesSnapshot.docs.map((rankDoc) => ({
      username: rankDoc.data().username,
      QuantAmount: Math.round(Number(rankDoc.data().QuantAmount || 0)),
    }));

    let rank = 0;
    if (telegramId) {
      const rankSnapshot = await admin.firestore().doc(`userRanks/${telegramId}`).get();
      if (rankSnapshot.exists) {
        rank = Number(rankSnapshot.data()?.rank || 0);
      }
    }
    
    const colsnap = admin.firestore().collectionGroup('miningData');

    const snapshot = await colsnap
    .aggregate({
      totalAmount: admin.firestore.AggregateField.sum('QuantAmount'),
    })
    .get();


    const totalAmount = Math.round(Number(snapshot.data().totalAmount || 0));
    const usersnapshot = await admin.firestore().collection("user").count().get()
    const userCount = usersnapshot.data().count
    return NextResponse.json(
      { allValues, totalAmount, rank, userCount },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
