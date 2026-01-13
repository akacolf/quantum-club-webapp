import { NextRequest, NextResponse } from "next/server";

/**
 * TonAPI Proxy Route
 * Proxies requests to TonAPI with authentication
 * This keeps the API key secure on the server side
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const testnet = searchParams.get("testnet") === "true";

    if (!path) {
        return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    const TONAPI_KEY = process.env.TONAPI_KEY;
    const baseUrl = testnet ? "https://testnet.tonapi.io" : "https://tonapi.io";

    try {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };

        // Add authorization header if API key is available
        if (TONAPI_KEY) {
            headers["Authorization"] = `Bearer ${TONAPI_KEY}`;
        }

        const response = await fetch(`${baseUrl}${path}`, {
            method: "GET",
            headers,
            // Cache for 5 seconds to reduce API calls
            next: { revalidate: 5 },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`TonAPI error: ${response.status} - ${errorText}`);
            return NextResponse.json(
                { error: `TonAPI error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("TonAPI proxy error:", error);
        return NextResponse.json(
            { error: "Failed to fetch from TonAPI" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const testnet = searchParams.get("testnet") === "true";

    if (!path) {
        return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    const TONAPI_KEY = process.env.TONAPI_KEY;
    const baseUrl = testnet ? "https://testnet.tonapi.io" : "https://tonapi.io";

    try {
        const body = await request.json();
        
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };

        if (TONAPI_KEY) {
            headers["Authorization"] = `Bearer ${TONAPI_KEY}`;
        }

        const response = await fetch(`${baseUrl}${path}`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`TonAPI error: ${response.status} - ${errorText}`);
            return NextResponse.json(
                { error: `TonAPI error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("TonAPI proxy error:", error);
        return NextResponse.json(
            { error: "Failed to fetch from TonAPI" },
            { status: 500 }
        );
    }
}
