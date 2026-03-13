import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/session";
import { decodeJwt } from "jose";

// OFAC sanctioned countries (ISO 3166-1 alpha-2 codes)
// This list should be kept up-to-date with current sanctions
const SANCTIONED_COUNTRIES = [
  "CU", // Cuba
  "IR", // Iran
  "KP", // North Korea
  "SY", // Syria
  "RU", // Russia (due to financial sanctions)
  "BY", // Belarus
  "MM", // Myanmar
  "VE", // Venezuela (partial sanctions)
  "ZW", // Zimbabwe
  "SD", // Sudan
  "CF", // Central African Republic
  "LY", // Libya
  "SO", // Somalia
  "YE", // Yemen
];

// Regions within sanctioned countries (Crimea, Donetsk, Luhansk)
const SANCTIONED_REGIONS = [
  "Crimea",
  "Donetsk",
  "Luhansk",
  "Sevastopol",
];

function isFromSanctionedLocation(request: NextRequest): boolean {
  // Check country from Cloudflare/Vercel headers
  const country = request.headers.get("x-vercel-ip-country") || 
                  request.headers.get("cf-ipcountry");
  
  if (country && SANCTIONED_COUNTRIES.includes(country.toUpperCase())) {
    return true;
  }

  // Check region for partially sanctioned areas
  const region = request.headers.get("x-vercel-ip-country-region");
  
  if (region && SANCTIONED_REGIONS.some(r => 
    region.toLowerCase().includes(r.toLowerCase())
  )) {
    return true;
  }

  return false;
}

export async function proxy(request: NextRequest) {
  // Allow unsupported region page without restrictions
  if (request.nextUrl.pathname === "/unsupported-region") {
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

  // OFAC sanctioned country check
  if (isFromSanctionedLocation(request)) {
    return NextResponse.redirect(new URL("/unsupported-region", request.url));
  }

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

// paths middleware would work in //
export const config = {
  matcher: [
    "/home/:path*",
    "/frens/:path*",
    "/earn/:path*",
    "/story/:path*",
    "/leaderboard/:path*",
    "/ecosystem/:path*",
    "/wallet/:path*",
    "/groups/:path*",
    "/user/:path*",
    "/unsupported-region",
  ],
};
