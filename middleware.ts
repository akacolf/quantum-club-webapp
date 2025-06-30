import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@/utils/session";

export async function middleware(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return updateSession(request);
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
  ],
};
