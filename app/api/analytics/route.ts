import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/utils/session";

const SDK_AUTH_TOKEN = process.env.TGA_AUTH_TOKEN || "";
const APP_NAME = "qntm_club";
const APP_DOMAIN = "https://quantumclub.space";

interface EventPayload {
    event_name: string;
    session_id: string;
    user_id: number;
    app_name: string;
    is_premium?: boolean;
    platform?: string;
    locale?: string;
    client_timestamp?: string;
    is_success?: boolean;
    error_message?: string;
    error_code?: number;
    wallet_address?: string;
    wallet_type?: string;
    from?: string;
    messages?: { address: string; amount: string }[];
}

export async function POST(req: NextRequest) {
    try {
        // Validate session
        const sessionCookie = req.cookies.get("session")?.value;
        if (!sessionCookie) {
            return NextResponse.json({ success: false }, { status: 401 });
        }
        try {
            await decrypt(sessionCookie);
        } catch {
            return NextResponse.json({ success: false }, { status: 401 });
        }

        if (!SDK_AUTH_TOKEN) {
            return NextResponse.json({ success: false }, { status: 200 });
        }

        const body = await req.json();
        const { eventName, userId, sessionId, isPremium, platform, locale, options } = body;

        if (!eventName || !sessionId || !userId) {
            return NextResponse.json({ success: false }, { status: 200 });
        }

        const payload: EventPayload[] = [{
            event_name: String(eventName),
            session_id: String(sessionId),
            user_id: Number(userId) || 0,
            app_name: APP_NAME,
            is_premium: Boolean(isPremium),
            platform: String(platform || "unknown"),
            locale: String(locale || "en"),
            client_timestamp: Date.now().toString(),
            ...(options?.isSuccess !== undefined && { is_success: Boolean(options.isSuccess) }),
            ...(options?.errorMessage && { error_message: String(options.errorMessage) }),
            ...(options?.errorCode && { error_code: Number(options.errorCode) }),
            ...(options?.walletAddress && { wallet_address: String(options.walletAddress) }),
            ...(options?.walletType && { wallet_type: String(options.walletType) }),
            ...(options?.from && { from: String(options.from) }),
            ...(options?.messages && Array.isArray(options.messages) && { messages: options.messages }),
        }];

        const response = await fetch("https://tganalytics.xyz/events", {
            method: "POST",
            headers: {
                "TGA-Auth-Token": SDK_AUTH_TOKEN,
                "Content-Type": "application/json",
                "Origin": APP_DOMAIN,
                "Referer": APP_DOMAIN + "/",
            },
            body: JSON.stringify(payload),
        });

        if (response.status === 201) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false }, { status: 200 });
        }
    } catch {
        return NextResponse.json({ success: false }, { status: 200 });
    }
}
