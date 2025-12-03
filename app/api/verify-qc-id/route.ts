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
    const body = await request.json();
    const { qcId } = body;

    if (!qcId || typeof qcId !== 'string') {
      return NextResponse.json(
        { error: 'QC ID is required', exists: false },
        { status: 400 }
      );
    }

    // Check if the QC ID exists in the database
    const userRef = db.doc(`user/${qcId.trim()}/miningData/values`);
    const userSnapshot = await userRef.get();

    if (userSnapshot.exists) {
      return NextResponse.json({ exists: true });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error('Error verifying QC ID:', error);
    return NextResponse.json(
      { error: 'Failed to verify QC ID', exists: false },
      { status: 500 }
    );
  }
}
