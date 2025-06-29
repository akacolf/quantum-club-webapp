import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@/utils/session";

export async function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/home") ||
    request.nextUrl.pathname.startsWith("/frens") ||
    request.nextUrl.pathname.startsWith("/earn") ||
    request.nextUrl.pathname.startsWith("/story") ||
    request.nextUrl.pathname.startsWith("/leaderboard") ||
    request.nextUrl.pathname.startsWith("/ecosystem")
  ) {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(new URL("/", request.url));
    }
  }
  return updateSession(request);
}

// paths middleware would work in //
export const config = {
  matcher: ["/home", "/frens", "/earn", "/story", "/leaderboard", "/ecosystem"], // middleware for specific routes //
};
