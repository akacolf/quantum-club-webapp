import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/app/(firebase)/server";
import { checkExistingUserSchema } from "@/lib/validations";

// Rate limiting to prevent enumeration
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

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

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP to prevent automated enumeration
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = checkExistingUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    const { email, qcId } = parsed.data;

    // Check by email
    if (email) {
      const snapshot = await firestore
        .collection("user")
        .where("email", "==", email)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        return NextResponse.json({ exists: true });
      }
    }

    // Check by QC ID (encrypted Telegram ID)
    if (qcId) {
      const doc = await firestore.collection("user").doc(qcId).get();
      if (doc.exists) {
        return NextResponse.json({ exists: true });
      }
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Check existing user error:", error);
    return NextResponse.json({ exists: false });
  }
}
