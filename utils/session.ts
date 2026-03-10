import { JWTPayload, jwtVerify,SignJWT } from "jose"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { env } from "@/env"

const key = new TextEncoder().encode(env.JWT_SECRET)
export const SESSION_DURATION = 24*60*60*1000
interface Payload extends JWTPayload {
    user: {
      telegramId: string;
    };
    expires: Date; // ISO date string
  }

export async function encrypt(payload:Payload) {
    return await new SignJWT(payload)
        .setProtectedHeader({alg:"HS256"})
        .setIssuedAt()
        .setExpirationTime("24 Hours")
        .sign(key)
}

export async function decrypt(input:string) {
    const { payload } = await jwtVerify(input, key, {
        algorithms: ["HS256"],
      });
    
      // Validate that the payload matches the Payload type
      if (
        typeof payload.user === "object" &&
        payload.user !== null && // Ensure it's not null
        "telegramId" in payload.user && // Check if 'telegramId' exists
        (typeof (payload.user as { telegramId: unknown }).telegramId === "string" ||
         typeof (payload.user as { telegramId: unknown }).telegramId === "number") &&
        typeof payload.expires === "string"
      ) {
        // Normalize telegramId to string
        const normalizedPayload = {
          ...payload,
          user: {
            telegramId: String((payload.user as { telegramId: unknown }).telegramId)
          }
        };
        return normalizedPayload as Payload; // Safe to cast now
      }
    
      throw new Error("Invalid payload structure");
}

export async function getSession() {
    const sessionCookie = await cookies()
    const session = sessionCookie.get('session')?.value
    if(!session) return null
    return await decrypt(session)
}

export async function updateSession(request:NextRequest) {
    const session = request.cookies.get("session")?.value
    if(!session) return

    const parsed = await decrypt(session)
    parsed.expires = new Date(Date.now() + SESSION_DURATION) // updating the expires date to 24 hours from now //
    const res = NextResponse.next()
    res.cookies.set({
        name:   "session",
        value:  await encrypt(parsed),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(parsed.expires), // explicitly stating the date of the parsed session //
    })
    return res;
}