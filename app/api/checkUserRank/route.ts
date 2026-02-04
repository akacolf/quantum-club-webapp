import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { decrypt } from '@/utils/session';
import { createCipheriv } from 'node:crypto';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

// Server-side encryption to get QC ID
function encryptTelegramId(telegramId: string): string {
  const encryptionKey = Buffer.from(process.env.AES_ENCRYPTION_KEY!, 'base64');
  const iv = Buffer.from("00000000000000000000000000000000", 'utf8');
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  let encrypted = cipher.update(telegramId, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted.replace(/['"]+/g, "").replace(/[^a-zA-Z0-9]/g, "");
}

export async function POST(request:NextRequest) {
  try {
    // Validate and decrypt session
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Session invalid' }, { status: 401 });
    }

    let sessionData;
    try {
      sessionData = await decrypt(sessionCookie);
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get the authenticated user's ID from session
    const rawTelegramId = String(sessionData.user.telegramId);
    const telegramId = encryptTelegramId(rawTelegramId);

    // Get username from request (less sensitive)
    const body = await request.json();
    const { userName } = body;

    // IMPORTANT: Fetch QuantAmount from server, don't trust client
    const userMiningRef = admin.firestore().doc(`user/${telegramId}/miningData/values`);
    const userMiningDoc = await userMiningRef.get();
    const QuantAmount = userMiningDoc.exists ? (userMiningDoc.data()?.QuantAmount || 0) : 0;

    const userRank = await admin.firestore()
      .collection('userRanks')
      .where('QuantAmount', '>', QuantAmount)
      .count()
      .get();

    const rank = userRank.data().count + 1;
    const userRankRef = admin.firestore().collection('userRanks').doc(telegramId);
    await userRankRef.set({
      userId: telegramId,
      rank: rank,
      QuantAmount: QuantAmount,
      username: userName,
    }, { merge: true });

    return NextResponse.json({ rank }, { status: 200 });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}