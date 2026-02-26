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
  if (request.method === "POST") {
    return NextResponse.next();
  }

  // Check for either auth system: session cookie (Telegram) or Firebase auth token
  const sessionCookie = request.cookies.get("session")?.value;
  const firebaseToken = request.cookies.get("firebaseAuthToken")?.value;

  // No auth at all → redirect to login (root page)
  if (!sessionCookie && !firebaseToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If we have a Firebase token, validate it hasn't expired
  if (firebaseToken) {
    try {
      const decoded = decodeJwt(firebaseToken);
      if (decoded.exp && (decoded.exp - 300) * 1000 < Date.now()) {
        const { pathname } = request.nextUrl;
        return NextResponse.redirect(
          new URL(
            `/api/refresh-token?redirect=${encodeURIComponent(pathname)}`,
            request.url
          )
        );
      }
    } catch {
      // Malformed token — if no session cookie either, redirect to login
      if (!sessionCookie) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  // OFAC sanctioned country check
  if (isFromSanctionedLocation(request)) {
    return NextResponse.redirect(new URL("/unsupported-region", request.url));
  }

  // Extend session cookie if present
  if (sessionCookie) {
    return updateSession(request);
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
    "/chat/:path*",
    "/groups/:path*",
    "/badges/:path*",
    "/user/:path*",
    "/unsupported-region",
  ],
};
