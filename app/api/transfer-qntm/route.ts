import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { createCipheriv } from 'node:crypto';
import { decrypt } from '@/utils/session';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// Server-side encryption function to get the encrypted telegram ID
function encryptTelegramId(telegramId: string): string {
  const encryptionKey = Buffer.from(process.env.AES_ENCRYPTION_KEY!, 'base64');
  // Note: Static IV for deterministic encryption - same telegramId = same QC ID
  const iv = Buffer.from("00000000000000000000000000000000", 'utf8'); // Original 32-char IV for backwards compatibility
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  
  let encrypted = cipher.update(telegramId, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  return encrypted.replace(/['"]+/g, "").replace(/[^a-zA-Z0-9]/g, "");
}

export async function POST(request: NextRequest) {
  try {
    // Validate session and extract the authenticated user's telegram ID
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Session invalid' }, { status: 401 });
    }

    // Decrypt the session to get the authenticated user's telegram ID
    let sessionData;
    try {
      sessionData = await decrypt(sessionCookie);
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get the raw telegram ID from the session (this is the source of truth)
    const rawTelegramId = sessionData.user.telegramId;
    if (!rawTelegramId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Encrypt the telegram ID server-side to get the sender's QC ID
    const senderQcId = encryptTelegramId(String(rawTelegramId));

    const body = await request.json();
    const { recipientQcId, amount } = body;

    // Validate input - senderTelegramId is no longer accepted from client
    if (!recipientQcId || !amount) {
      return NextResponse.json(
        { error: 'recipientQcId and amount are required' },
        { status: 400 }
      );
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Prevent self-transfer
    if (senderQcId === recipientQcId) {
      return NextResponse.json(
        { error: 'Cannot transfer to yourself' },
        { status: 400 }
      );
    }

    // Get sender's balance using the server-derived QC ID
    const senderMiningRef = db.doc(`user/${senderQcId}/miningData/values`);
    const senderSnapshot = await senderMiningRef.get();

    if (!senderSnapshot.exists) {
      return NextResponse.json(
        { error: 'Sender account not found' },
        { status: 404 }
      );
    }

    const senderData = senderSnapshot.data();
    const senderBalance = senderData?.QuantAmount || 0;

    if (senderBalance < transferAmount) {
      return NextResponse.json(
        { error: 'Insufficient QNTM balance', balance: senderBalance },
        { status: 400 }
      );
    }

    // Find recipient by QC ID (encrypted telegram ID)
    const recipientMiningRef = db.doc(`user/${recipientQcId}/miningData/values`);
    const recipientSnapshot = await recipientMiningRef.get();

    if (!recipientSnapshot.exists) {
      return NextResponse.json(
        { error: 'Recipient not found. Make sure the QC ID is correct.' },
        { status: 404 }
      );
    }

    const recipientData = recipientSnapshot.data();
    const recipientBalance = recipientData?.QuantAmount || 0;

    // Perform the transfer using a transaction for atomicity
    await db.runTransaction(async (transaction) => {
      // Deduct from sender
      transaction.update(senderMiningRef, {
        QuantAmount: senderBalance - transferAmount,
      });

      // Add to recipient
      transaction.update(recipientMiningRef, {
        QuantAmount: recipientBalance + transferAmount,
      });

      // Create transfer history for sender
      const senderHistoryRef = db.doc(
        `user/${senderQcId}/transferHistory/${Date.now()}`
      );
      transaction.set(senderHistoryRef, {
        type: 'sent',
        amount: transferAmount,
        to: recipientQcId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        date: new Date().toISOString(),
      });

      // Create transfer history for recipient
      const recipientHistoryRef = db.doc(
        `user/${recipientQcId}/transferHistory/${Date.now()}`
      );
      transaction.set(recipientHistoryRef, {
        type: 'received',
        amount: transferAmount,
        from: senderQcId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        date: new Date().toISOString(),
      });
    });

    const newSenderBalance = senderBalance - transferAmount;

    return NextResponse.json({
      success: true,
      message: 'Transfer successful',
      newBalance: newSenderBalance,
      transferredAmount: transferAmount,
    });
  } catch (error) {
    console.error('QNTM Transfer error:', error);
    return NextResponse.json(
      { error: 'Transfer failed. Please try again.' },
      { status: 500 }
    );
  }
}
