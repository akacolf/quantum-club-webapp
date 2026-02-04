import { NextRequest, NextResponse } from "next/server";
import { auth as adminAuth } from "@/app/(firebase)/server";

// POST /api/mobile/auth - Verify tokens and create sessions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, idToken, uid } = body;

    if (action === "verify-token") {
      // Verify Firebase ID token from mobile app
      if (!idToken) {
        return NextResponse.json({ error: "No token provided" }, { status: 400 });
      }

      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        return NextResponse.json({
          valid: true,
          uid: decodedToken.uid,
          email: decodedToken.email,
        });
      } catch (error) {
        return NextResponse.json({ valid: false, error: "Invalid token" }, { status: 401 });
      }
    }

    if (action === "create-custom-token") {
      // Create custom token for mobile app authentication
      if (!uid) {
        return NextResponse.json({ error: "UID required" }, { status: 400 });
      }

      const customToken = await adminAuth.createCustomToken(uid);
      return NextResponse.json({ token: customToken });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Mobile auth error:", error);
    return NextResponse.json(
      { error: error.message || "Authentication failed" },
      { status: 500 }
    );
  }
}

// GET /api/mobile/auth - Get Firebase config for mobile
export async function GET() {
  // Return only the public Firebase config needed for client SDK
  return NextResponse.json({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_APP_ID,
  });
}
