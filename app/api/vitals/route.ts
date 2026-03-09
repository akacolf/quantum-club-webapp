import { NextResponse } from "next/server";

/**
 * Beacon endpoint for Web Vitals metrics.
 * Receives metrics from the client WebVitals component via navigator.sendBeacon.
 * Logs to stdout for Vercel log drains / monitoring tools.
 */
export async function POST(req: Request) {
  try {
    const metric = await req.json();
    // Structured log — picked up by Vercel log drains, Datadog, etc.
    console.log(JSON.stringify({ type: "web-vital", ...metric }));
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
