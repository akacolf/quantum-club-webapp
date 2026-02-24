import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/utils/session";

const METERED_DOMAIN = process.env.METERED_DOMAIN;
const METERED_API_KEY = process.env.METERED_API_KEY;

export async function GET(req: NextRequest) {
  try {
    // Validate session
    const sessionCookie = req.cookies.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      await decrypt(sessionCookie);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!METERED_DOMAIN || !METERED_API_KEY) {
      // Fallback: return only STUN servers if TURN is not configured
      return NextResponse.json([
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ]);
    }

    const res = await fetch(
      `https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`,
    );

    if (!res.ok) {
      console.error("[turn-credentials] Metered API error:", res.status);
      return NextResponse.json([
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ]);
    }

    const iceServers = await res.json();
    return NextResponse.json(iceServers);
  } catch (error) {
    console.error("[turn-credentials] Route error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
