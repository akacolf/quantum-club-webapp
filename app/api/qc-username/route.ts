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
const USERNAMES_COLLECTION = 'qcUsernames';

// Validation rules
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;
const USERNAME_REGEX = /^[a-z0-9][a-z0-9._]*[a-z0-9]$/;
const RESERVED_USERNAMES = [
  'admin', 'support', 'help', 'quantum', 'quantumclub', 'qc', 'system',
  'root', 'official', 'team', 'mod', 'moderator', 'bot', 'wallet',
  'send', 'receive', 'swap', 'trade', 'stake', 'earn', 'null', 'undefined',
];

const CACHE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

/**
 * GET /api/qc-username?username=windblown — Check if a username is available
 * GET /api/qc-username?qcId=abc123 — Get the username for a QC ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usernameParam = searchParams.get('username')?.toLowerCase().replace(/^@/, '');
    const qcId = searchParams.get('qcId');

    if (usernameParam) {
      // Check availability
      const doc = await db.collection(USERNAMES_COLLECTION).doc(usernameParam).get();
      return NextResponse.json({
        username: usernameParam,
        available: !doc.exists,
        ...(doc.exists ? { owner: doc.data()?.qcId } : {}),
      }, { headers: CACHE_HEADERS });
    }

    if (qcId) {
      // Reverse lookup: qcId → username
      const snapshot = await db.collection(USERNAMES_COLLECTION)
        .where('qcId', '==', qcId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return NextResponse.json({ username: null }, { headers: CACHE_HEADERS });
      }

      const doc = snapshot.docs[0];
      return NextResponse.json({
        username: doc.id,
        qcDomain: `${doc.id}.qc`,
        address: doc.data().address || null,
      }, { headers: CACHE_HEADERS });
    }

    return NextResponse.json(
      { error: 'Provide ?username= or ?qcId= parameter' },
      { status: 400, headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Error checking QC username:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/qc-username — Register a QC username
 * Body: { username: string, qcId: string, address?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username: rawUsername, qcId, address } = body;

    if (!rawUsername || !qcId) {
      return NextResponse.json(
        { error: 'username and qcId are required' },
        { status: 400, headers: CACHE_HEADERS }
      );
    }

    const username = rawUsername.toLowerCase().replace(/^@/, '').trim();

    // Validate
    if (username.length < USERNAME_MIN_LENGTH) {
      return NextResponse.json(
        { error: `Username must be at least ${USERNAME_MIN_LENGTH} characters` },
        { status: 400, headers: CACHE_HEADERS }
      );
    }
    if (username.length > USERNAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Username must be at most ${USERNAME_MAX_LENGTH} characters` },
        { status: 400, headers: CACHE_HEADERS }
      );
    }
    if (!USERNAME_REGEX.test(username)) {
      return NextResponse.json(
        { error: 'Only lowercase letters, numbers, dots, and underscores allowed (no leading/trailing special chars)' },
        { status: 400, headers: CACHE_HEADERS }
      );
    }
    if (RESERVED_USERNAMES.includes(username)) {
      return NextResponse.json(
        { error: 'This username is reserved' },
        { status: 400, headers: CACHE_HEADERS }
      );
    }

    // Check if username is taken
    const existing = await db.collection(USERNAMES_COLLECTION).doc(username).get();
    if (existing.exists) {
      return NextResponse.json(
        { error: 'This username is already taken' },
        { status: 409, headers: CACHE_HEADERS }
      );
    }

    // Check if user already has a username
    const existingUser = await db.collection(USERNAMES_COLLECTION)
      .where('qcId', '==', qcId)
      .limit(1)
      .get();

    if (!existingUser.empty) {
      return NextResponse.json(
        { error: 'You already have a username', existingUsername: existingUser.docs[0].id },
        { status: 409, headers: CACHE_HEADERS }
      );
    }

    // Register username
    await db.collection(USERNAMES_COLLECTION).doc(username).set({
      qcId,
      address: address || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Store on user document for quick lookup
    await db.doc(`user/${qcId}`).set(
      { qcUsername: username, qcDomain: `${username}.qc` },
      { merge: true }
    );

    // Also create the domain mapping
    await db.collection('qcDomains').doc(username).set({
      address: address || null,
      qcId,
      username,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      username,
      qcDomain: `${username}.qc`,
    }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Error registering QC username:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}

/**
 * PUT /api/qc-username — Update the wallet address for a username
 * Body: { qcId: string, address: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { qcId, address } = body;

    if (!qcId || !address) {
      return NextResponse.json(
        { error: 'qcId and address are required' },
        { status: 400, headers: CACHE_HEADERS }
      );
    }

    // Find user's username
    const snapshot = await db.collection(USERNAMES_COLLECTION)
      .where('qcId', '==', qcId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'No username found for this user' },
        { status: 404, headers: CACHE_HEADERS }
      );
    }

    const username = snapshot.docs[0].id;

    // Update address in username doc
    await db.collection(USERNAMES_COLLECTION).doc(username).update({ address });

    // Update address in domain doc
    await db.collection('qcDomains').doc(username).update({
      address,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      username,
      qcDomain: `${username}.qc`,
      address,
    }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Error updating QC username:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}
