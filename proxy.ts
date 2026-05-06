import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/session";
import { decodeJwt } from "jose";
import { env } from "@/env";

// =====================================================
// Maintenance mode check (Firestore REST API, Edge-compatible)
// =====================================================

const FIRESTORE_SETTINGS_URL = `https://firestore.googleapis.com/v1/projects/${env.NEXT_PUBLIC_PROJECT_ID}/databases/(default)/documents/set/settings`;

let maintenanceCache: { value: boolean; expiry: number } | null = null;

async function isMaintenanceMode(): Promise<boolean> {
  if (maintenanceCache && Date.now() < maintenanceCache.expiry) {
    return maintenanceCache.value;
  }
  try {
    const res = await fetch(FIRESTORE_SETTINGS_URL);
    const data = await res.json();
    const maintenance = data.fields?.maintenance_mode?.booleanValue === true;
    maintenanceCache = { value: maintenance, expiry: Date.now() + 300_000 };
    return maintenance;
  } catch {
    // If Firestore is unreachable, don't block users
    return maintenanceCache?.value ?? false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Maintenance mode — block ALL routes except /maintenance itself
  const maintenance = await isMaintenanceMode();
  if (maintenance && pathname !== "/maintenance") {
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }
  // If maintenance is OFF but user is on /maintenance, send them to login
  if (!maintenance && pathname === "/maintenance") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  // Let /maintenance page through
  if (pathname === "/maintenance") {
    return NextResponse.next();
  }

  // Login page (/) and signup don't need auth checks
  if (pathname === "/" || pathname === "/signup") {
    return NextResponse.next();
  }
  // Check for either auth system: session cookie (Telegram) or Firebase auth token.
  // Also check the refresh token: the ID token cookie expires in ~1h (scoped to
  // Firebase's token lifetime), but the client silently refreshes it. The 30-day
  // refresh token cookie proves the user has an active session even when the
  // short-lived ID token cookie has expired.
  const sessionCookie = request.cookies.get("session")?.value;
  const firebaseToken = request.cookies.get("firebaseAuthToken")?.value;
  const firebaseRefreshToken = request.cookies.get("firebaseAuthRefreshToken")?.value;

  // No auth at all → redirect to login (root page)
  if (!sessionCookie && !firebaseToken && !firebaseRefreshToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Basic sanity check: if we only have a Firebase token (no session cookie),
  // make sure it's a valid JWT and hasn't expired
  if (firebaseToken && !sessionCookie) {
    try {
      const decoded = decodeJwt(firebaseToken);
      // Check if the token has expired (exp is in seconds)
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        // Token expired — only allow through if refresh token can renew it
        if (!firebaseRefreshToken) {
          return NextResponse.redirect(new URL("/", request.url));
        }
      }
    } catch (err) {
      console.error("[proxy] Invalid Firebase JWT cookie:", err);
      // Fall through — if refresh token exists, allow the request (client will refresh)
      if (!firebaseRefreshToken) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }
  // Note: Token refresh is handled client-side by Firebase SDK + auth.tsx setToken()

  // Extend session cookie if present
  if (sessionCookie) {
    try {
      return await updateSession(request);
    } catch (err) {
      console.error("[proxy] Session update failed:", err);
      // Session is invalid — delete it. If a valid Firebase token exists,
      // let the request through instead of redirecting to avoid a loop
      // (login page would see the Firebase user and redirect right back).
      if (firebaseToken) {
        const response = NextResponse.next();
        response.cookies.delete("session");
        return response;
      }
      const response = NextResponse.redirect(new URL("/", request.url));
      response.cookies.delete("session");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/signup",
    "/maintenance",
    "/home/:path*",
    "/frens/:path*",
    "/earn/:path*",
    "/story/:path*",
    "/leaderboard/:path*",
    "/ecosystem/:path*",
    "/wallet/:path*",
    "/user/:path*",
  ],
};
