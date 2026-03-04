import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { decrypt } from "@/utils/session";
import { env } from "@/env";

const analyticsEventSchema = z.object({
    eventName: z.string().min(1),
    sessionId: z.string().min(1),
    userId: z.union([z.string().min(1), z.number()]),
    isPremium: z.boolean().optional(),
    platform: z.string().optional(),
    locale: z.string().optional(),
    options: z.object({
        isSuccess: z.boolean().optional(),
        errorMessage: z.string().optional(),
        errorCode: z.number().optional(),
        walletAddress: z.string().optional(),
        walletType: z.string().optional(),
        from: z.string().optional(),
        messages: z.array(z.object({ address: z.string(), amount: z.string() })).optional(),
    }).optional(),
});

const SDK_AUTH_TOKEN = env.TGA_AUTH_TOKEN ?? "";
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
        const parsed = analyticsEventSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0]?.message || "Invalid request body" },
                { status: 400 }
            );
        }
        const { eventName, userId, sessionId, isPremium, platform, locale, options } = parsed.data;

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
