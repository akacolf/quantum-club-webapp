import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import admin from 'firebase-admin';
import { decrypt } from '@/utils/session';
import { env } from '@/env';
import { USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH, USERNAME_REGEX, RESERVED_USERNAMES } from '@/lib/validations';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const USERNAMES_COLLECTION = 'qcUsernames';

const CACHE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

// Rate limiting (in-memory, per serverless instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per window per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Zod schemas
const registerUsernameSchema = z.object({
  username: z.string().min(1, "Username is required"),
  qcId: z.string().min(1, "qcId is required").max(100).regex(/^[a-zA-Z0-9_-]+$/, "Invalid qcId format"),
  address: z.string().max(100).regex(/^(EQ|UQ|0:|kQ)[a-zA-Z0-9_-]{46,48}$/, "Invalid wallet address format").optional(),
});

const updateAddressSchema = z.object({
  qcId: z.string().min(1, "qcId is required").max(100).regex(/^[a-zA-Z0-9_-]+$/, "Invalid qcId format"),
  address: z.string().min(1, "Address is required").max(100).regex(/^(EQ|UQ|0:|kQ)[a-zA-Z0-9_-]{46,48}$/, "Invalid wallet address format"),
});

/**
 * GET /api/qc-username?username=windblown — Check availability or resolve username → address
 * GET /api/qc-username?qcId=abc123 — Reverse lookup: get a user's username
 * GET /api/qc-username?address=UQ... — Reverse lookup: get username for a wallet address
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(request.url);
    const usernameParam = searchParams.get('username')?.toLowerCase().replace(/^@/, '');
    const qcId = searchParams.get('qcId');
    const address = searchParams.get('address');

    if (usernameParam) {
      const doc = await db.collection(USERNAMES_COLLECTION).doc(usernameParam).get();

      if (!doc.exists) {
        return NextResponse.json({
          username: usernameParam,
          available: true,
          resolved: false,
        }, { headers: CACHE_HEADERS });
      }

      const data = doc.data()!;
      return NextResponse.json({
        username: usernameParam,
        available: false,
        resolved: true,
        address: data.address || null,
        owner: data.qcId,
      }, { headers: CACHE_HEADERS });
    }

    if (qcId) {
      const snapshot = await db.collection(USERNAMES_COLLECTION)
        .where('qcId', '==', qcId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return NextResponse.json({ username: null }, { headers: CACHE_HEADERS });
      }

      const doc = snapshot.docs[0];
      return NextResponse.json({
        username: doc.data().displayUsername || doc.id,
        address: doc.data().address || null,
      }, { headers: CACHE_HEADERS });
    }

    if (address) {
      const snapshot = await db.collection(USERNAMES_COLLECTION)
        .where('address', '==', address)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return NextResponse.json({ username: null }, { headers: CACHE_HEADERS });
      }

      const doc = snapshot.docs[0];
      return NextResponse.json({
        username: doc.data().displayUsername || doc.id,
        address: doc.data().address,
      }, { headers: CACHE_HEADERS });
    }

    return NextResponse.json(
      { error: 'Provide ?username=, ?qcId=, or ?address= parameter' },
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
    // Validate session
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CACHE_HEADERS });
    }
    try {
      await decrypt(sessionCookie);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CACHE_HEADERS });
    }

    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: CACHE_HEADERS }
      );
    }

    const body = await request.json();
    const parsed = registerUsernameSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400, headers: CACHE_HEADERS }
      );
    }

    const { username: rawUsername, qcId, address } = parsed.data;

    const username = rawUsername.toLowerCase().replace(/^@/, '').trim();
    const displayUsername = rawUsername.replace(/^@/, '').trim();

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
        { error: 'Letters, numbers, dots, underscores, and hyphens only (no leading/trailing special chars)' },
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

    // Register username (lowercase key, preserve display casing)
    await db.collection(USERNAMES_COLLECTION).doc(username).set({
      qcId,
      displayUsername,
      address: address || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Store on user document for quick lookup
    await db.doc(`user/${qcId}`).set(
      { qcUsername: displayUsername },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      username: displayUsername,
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
 * PUT /api/qc-username — Update the wallet address linked to a username
 * Body: { qcId: string, address: string }
 */
export async function PUT(request: NextRequest) {
  try {
    // Validate session
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CACHE_HEADERS });
    }
    try {
      await decrypt(sessionCookie);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CACHE_HEADERS });
    }

    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: CACHE_HEADERS }
      );
    }

    const body = await request.json();
    const parsed = updateAddressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400, headers: CACHE_HEADERS }
      );
    }

    const { qcId, address } = parsed.data;

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

    // Update address
    await db.collection(USERNAMES_COLLECTION).doc(username).update({ address });

    return NextResponse.json({
      success: true,
      username,
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
