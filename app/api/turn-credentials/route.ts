import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/utils/session";
import { env } from "@/env";

const TURN_KEY_ID = env.CLOUDFLARE_TURN_KEY_ID;
const TURN_API_TOKEN = env.CLOUDFLARE_TURN_API_TOKEN;

const FALLBACK_ICE_SERVERS = [
  { urls: "stun:stun.cloudflare.com:3478" },
];

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

    if (!TURN_KEY_ID || !TURN_API_TOKEN) {
      // Fallback: return only STUN servers if TURN is not configured
      return NextResponse.json(FALLBACK_ICE_SERVERS);
    }

    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TURN_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 86400 }),
      },
    );

    if (!res.ok) {
      console.error("[turn-credentials] Cloudflare API error:", res.status);
      return NextResponse.json(FALLBACK_ICE_SERVERS);
    }

    const data = await res.json();
    return NextResponse.json(data.iceServers);
  } catch (error) {
    console.error("[turn-credentials] Route error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
