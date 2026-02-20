import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/session";
import { cookies } from "next/headers";
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
  // Allow unsupported region page to be accessed without restrictions
  if (request.nextUrl.pathname === "/unsupported-region") {
    return NextResponse.next();
  }
  if (request.method === "POST") {
    return NextResponse.next();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("firebaseAuthToken")?.value;
  const { pathname } = request.nextUrl;

  if (
    !token &&
    (pathname.startsWith("/login") ||
      pathname.startsWith("/signup"))
  ) {
    return NextResponse.next();
  }
  if (
    token &&
    (pathname.startsWith("/login"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const decodedToken = decodeJwt(token);
  if (decodedToken.exp && (decodedToken.exp - 300) * 1000 < Date.now()) {
    return NextResponse.redirect(
      new URL(
        `/api/refresh-token?redirect=${encodeURIComponent(pathname)}`,
        request.url
      )
    );
  }

  if (!decodedToken && pathname.startsWith("/home")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  // Check for sanctioned countries on wallet routes and protected routes
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/wallet") ||
                           request.nextUrl.pathname.startsWith("/home") ||
                           request.nextUrl.pathname.startsWith("/frens") ||
                           request.nextUrl.pathname.startsWith("/earn") ||
                           request.nextUrl.pathname.startsWith("/story") ||
                           request.nextUrl.pathname.startsWith("/leaderboard") ||
                           request.nextUrl.pathname.startsWith("/trade") ||
                           request.nextUrl.pathname.startsWith("/ecosystem");
  
  if (isProtectedRoute && isFromSanctionedLocation(request)) {
    // Redirect to the unsupported region page
    return NextResponse.redirect(new URL("/unsupported-region", request.url));
  }

  // Check for either auth system: session cookie (Telegram initData) or Firebase auth token
  const hasSession = request.cookies.get("session")?.value;
  const hasFirebaseToken = request.cookies.get("firebaseAuthToken")?.value;

  if (!hasSession && !hasFirebaseToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If we have a session cookie, try to update/extend it
  if (hasSession) {
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
    "/trade/:path*",
    "/unsupported-region",
  ],
};
