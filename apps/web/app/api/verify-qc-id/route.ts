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

// Rate limiting to prevent enumeration attacks
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function getRateLimitKey(request: NextRequest): string {
  // Use IP or a hash of headers as the rate limit key
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `verify_qcid_${ip}`;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request);
    const now = Date.now();
    const rateLimit = rateLimitMap.get(rateLimitKey);
    
    if (rateLimit) {
      if (now < rateLimit.resetTime) {
        if (rateLimit.count >= MAX_REQUESTS_PER_MINUTE) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Try again later.', exists: false },
            { status: 429 }
          );
        }
        rateLimit.count++;
      } else {
        rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      }
    } else {
      rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    }
    
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
      // Also fetch the user's profile to get their username
      const profileRef = db.doc(`user/${qcId.trim()}`);
      const profileSnapshot = await profileRef.get();
      const username = profileSnapshot.exists ? profileSnapshot.data()?.username || 'Quantum User' : 'Quantum User';

      return NextResponse.json({ exists: true, username });
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
