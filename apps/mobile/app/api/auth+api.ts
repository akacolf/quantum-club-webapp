// Authentication API route for mobile app
// Handles sign up, sign in, and token verification

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin (server-side)
function getAdminAuth() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getAuth();
}

// POST /api/auth - Handle auth operations
export async function POST(request: Request) {
  try {
    const { action, idToken, uid, email } = await request.json();
    const adminAuth = getAdminAuth();

    switch (action) {
      case "verify-token": {
        if (!idToken) {
          return Response.json({ error: "No token provided" }, { status: 400 });
        }
        try {
          const decodedToken = await adminAuth.verifyIdToken(idToken);
          return Response.json({
            valid: true,
            uid: decodedToken.uid,
            email: decodedToken.email,
          });
        } catch {
          return Response.json({ valid: false, error: "Invalid token" }, { status: 401 });
        }
      }

      case "create-custom-token": {
        if (!uid) {
          return Response.json({ error: "UID required" }, { status: 400 });
        }
        const customToken = await adminAuth.createCustomToken(uid);
        return Response.json({ token: customToken });
      }

      case "get-user": {
        if (!uid && !email) {
          return Response.json({ error: "UID or email required" }, { status: 400 });
        }
        try {
          const user = uid 
            ? await adminAuth.getUser(uid)
            : await adminAuth.getUserByEmail(email);
          return Response.json({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          });
        } catch {
          return Response.json({ error: "User not found" }, { status: 404 });
        }
      }

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Auth API error:", error);
    return Response.json(
      { error: error.message || "Authentication failed" },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
