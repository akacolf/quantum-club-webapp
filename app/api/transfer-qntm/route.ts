import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

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

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Session invalid' }, { status: 401 });
    }

    const body = await request.json();
    const { senderTelegramId, recipientQcId, amount } = body;

    // Validate input
    if (!senderTelegramId || !recipientQcId || !amount) {
      return NextResponse.json(
        { error: 'senderTelegramId, recipientQcId, and amount are required' },
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
    if (senderTelegramId === recipientQcId) {
      return NextResponse.json(
        { error: 'Cannot transfer to yourself' },
        { status: 400 }
      );
    }

    // Get sender's balance
    const senderMiningRef = db.doc(`user/${senderTelegramId}/miningData/values`);
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
        `user/${senderTelegramId}/transferHistory/${Date.now()}`
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
        from: senderTelegramId,
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
