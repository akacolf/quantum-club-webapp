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
const DOMAINS_COLLECTION = 'qcDomains';

// Domain validation rules
const DOMAIN_MIN_LENGTH = 3;
const DOMAIN_MAX_LENGTH = 24;
const DOMAIN_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/; // alphanumeric + hyphens, no leading/trailing hyphens
const RESERVED_DOMAINS = ['admin', 'support', 'help', 'quantum', 'qc', 'system', 'root', 'official', 'team', 'mod', 'moderator', 'bot'];

const CACHE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

/**
 * GET /api/qc-domain?name=yourname — Resolve a .qc domain to an address
 * GET /api/qc-domain?address=UQ... — Get the .qc domain for an address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name')?.toLowerCase().replace(/\.qc$/, '');
    const address = searchParams.get('address');

    if (name) {
      // Resolve domain → address
      const domainDoc = await db.collection(DOMAINS_COLLECTION).doc(name).get();
      
      if (!domainDoc.exists) {
        return NextResponse.json(
          { error: 'Domain not found', resolved: false },
          { status: 404, headers: CACHE_HEADERS }
        );
      }

      const data = domainDoc.data()!;
      return NextResponse.json({
        resolved: true,
        domain: `${name}.qc`,
        address: data.address,
        owner: data.qcId,
      }, { headers: CACHE_HEADERS });
    }

    if (address) {
      // Reverse lookup: address → domain
      const snapshot = await db.collection(DOMAINS_COLLECTION)
        .where('address', '==', address)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return NextResponse.json(
          { resolved: false, domain: null },
          { headers: CACHE_HEADERS }
        );
      }

      const doc = snapshot.docs[0];
      return NextResponse.json({
        resolved: true,
        domain: `${doc.id}.qc`,
        address: doc.data().address,
      }, { headers: CACHE_HEADERS });
    }

    return NextResponse.json(
      { error: 'Provide either ?name= or ?address= parameter' },
      { status: 400, headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Error resolving QC domain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/qc-domain — Register a new .qc domain
 * Body: { name: string, address: string, qcId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name: rawName, address, qcId } = body;

    if (!rawName || !address || !qcId) {
      return NextResponse.json(
        { error: 'name, address, and qcId are required' },
        { status: 400, headers: CACHE_HEADERS }
      );
    }

    const name = rawName.toLowerCase().replace(/\.qc$/, '').trim();

    // Validate domain name
    if (name.length < DOMAIN_MIN_LENGTH) {
      return NextResponse.json(
        { error: `Domain must be at least ${DOMAIN_MIN_LENGTH} characters` },
        { status: 400, headers: CACHE_HEADERS }
      );
    }
    if (name.length > DOMAIN_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Domain must be at most ${DOMAIN_MAX_LENGTH} characters` },
        { status: 400, headers: CACHE_HEADERS }
      );
    }
    if (!DOMAIN_REGEX.test(name)) {
      return NextResponse.json(
        { error: 'Domain can only contain lowercase letters, numbers, and hyphens (no leading/trailing hyphens)' },
        { status: 400, headers: CACHE_HEADERS }
      );
    }
    if (RESERVED_DOMAINS.includes(name)) {
      return NextResponse.json(
        { error: 'This domain name is reserved' },
        { status: 400, headers: CACHE_HEADERS }
      );
    }

    // Check if domain is already taken
    const existingDomain = await db.collection(DOMAINS_COLLECTION).doc(name).get();
    if (existingDomain.exists) {
      return NextResponse.json(
        { error: 'This domain is already taken' },
        { status: 409, headers: CACHE_HEADERS }
      );
    }

    // Check if this user already has a domain
    const existingUserDomain = await db.collection(DOMAINS_COLLECTION)
      .where('qcId', '==', qcId)
      .limit(1)
      .get();

    if (!existingUserDomain.empty) {
      return NextResponse.json(
        { error: 'You already have a .qc domain registered', existingDomain: `${existingUserDomain.docs[0].id}.qc` },
        { status: 409, headers: CACHE_HEADERS }
      );
    }

    // Register the domain
    await db.collection(DOMAINS_COLLECTION).doc(name).set({
      address,
      qcId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Also store the domain reference on the user's document for quick lookups
    await db.doc(`user/${qcId}`).set(
      { qcDomain: `${name}.qc` },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      domain: `${name}.qc`,
      address,
    }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Error registering QC domain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}

/**
 * PUT /api/qc-domain — Update the address for an existing .qc domain
 * Body: { name: string, address: string, qcId: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name: rawName, address, qcId } = body;

    if (!rawName || !address || !qcId) {
      return NextResponse.json(
        { error: 'name, address, and qcId are required' },
        { status: 400, headers: CACHE_HEADERS }
      );
    }

    const name = rawName.toLowerCase().replace(/\.qc$/, '').trim();
    
    // Verify ownership
    const domainDoc = await db.collection(DOMAINS_COLLECTION).doc(name).get();
    if (!domainDoc.exists) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404, headers: CACHE_HEADERS }
      );
    }

    if (domainDoc.data()?.qcId !== qcId) {
      return NextResponse.json(
        { error: 'You do not own this domain' },
        { status: 403, headers: CACHE_HEADERS }
      );
    }

    // Update the address
    await db.collection(DOMAINS_COLLECTION).doc(name).update({
      address,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      domain: `${name}.qc`,
      address,
    }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Error updating QC domain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}
