import { NextRequest, NextResponse } from "next/server";

const SDK_AUTH_TOKEN = "eyJhcHBfbmFtZSI6InFudG1fY2x1YiIsImFwcF91cmwiOiJodHRwczovL3QubWUvUXVhbnR1bUNsdWJCb3QiLCJhcHBfZG9tYWluIjoiaHR0cHM6Ly9xdWFudHVtY2x1Yi5zcGFjZS8ifQ==!WjIA5nO87o5qYCowGzsEH+ip9PqI9jDgAiwWgAmsFLQ=";
const APP_NAME = "qntm_club";

// Whitelist of allowed event names to prevent abuse
const ALLOWED_EVENTS = new Set([
    "app-init",
    "connection-started",
    "connection-completed",
    "connection-error",
    "disconnection",
    "transaction-sent-for-signature",
    "transaction-signed",
    "transaction-signing-failed",
    "wallet-created",
    "wallet-imported",
]);

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
        const body = await req.json();
        const { eventName, userId, sessionId, isPremium, platform, locale, options } = body;

        // Validate event name is in our whitelist
        if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
            return NextResponse.json(
                { success: false },
                { status: 200 } // Don't reveal validation errors
            );
        }

        if (!sessionId || !userId) {
            return NextResponse.json(
                { success: false },
                { status: 200 }
            );
        }

        const payload: EventPayload[] = [{
            event_name: eventName,
            session_id: String(sessionId).slice(0, 100),
            user_id: Number(userId) || 0,
            app_name: APP_NAME,
            is_premium: Boolean(isPremium),
            platform: String(platform || "unknown").slice(0, 50),
            locale: String(locale || "en").slice(0, 10),
            client_timestamp: Date.now().toString(),
            ...(options?.isSuccess !== undefined && { is_success: Boolean(options.isSuccess) }),
            ...(options?.errorMessage && { error_message: String(options.errorMessage).slice(0, 200) }),
            ...(options?.errorCode && { error_code: Number(options.errorCode) }),
            ...(options?.walletAddress && { wallet_address: String(options.walletAddress).slice(0, 100) }),
            ...(options?.walletType && { wallet_type: String(options.walletType).slice(0, 50) }),
            ...(options?.from && { from: String(options.from).slice(0, 100) }),
            ...(options?.messages && Array.isArray(options.messages) && {
                messages: options.messages.slice(0, 10).map((m: { address?: string; amount?: string }) => ({
                    address: String(m.address || "").slice(0, 100),
                    amount: String(m.amount || "").slice(0, 50)
                }))
            }),
        }];

        const response = await fetch("https://tganalytics.xyz/events", {
            method: "POST",
            headers: {
                "TGA-Auth-Token": SDK_AUTH_TOKEN,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (response.status === 201) {
            return NextResponse.json({ success: true });
        } else {
            console.warn(`[TelegramAnalytics] Event "${eventName}" failed:`, response.status);
            return NextResponse.json({ success: false }, { status: 200 });
        }
    } catch (error) {
        console.error("[TelegramAnalytics] API Error:", error);
        return NextResponse.json({ success: false }, { status: 200 });
    }
}
