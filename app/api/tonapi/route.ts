import { NextRequest, NextResponse } from "next/server";

// Allowed API path prefixes to prevent SSRF attacks
const ALLOWED_PATH_PREFIXES = [
    "/v2/accounts",
    "/v2/nfts",
    "/v2/jettons",
    "/v2/blockchain",
    "/v2/events",
    "/v2/rates",
    "/v2/traces",
    "/v2/wallet",
    "/v2/staking",
    "/v2/dns",
];

/**
 * Validate that the path is an allowed TonAPI endpoint
 */
function isValidPath(path: string): boolean {
    // Path must start with /
    if (!path.startsWith("/")) {
        return false;
    }
    
    // Check against allowed prefixes
    return ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
}

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
    
    // Security: Validate path to prevent SSRF
    if (!isValidPath(path)) {
        console.warn(`[TonAPI Proxy] Blocked invalid path: ${path}`);
        return NextResponse.json({ error: "Invalid API path" }, { status: 400 });
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
            next: { revalidate: 0 },
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
    
    // Security: Validate path to prevent SSRF
    if (!isValidPath(path)) {
        console.warn(`[TonAPI Proxy] Blocked invalid path: ${path}`);
        return NextResponse.json({ error: "Invalid API path" }, { status: 400 });
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

        // For blockchain/message endpoint, success may return empty or non-200 that still worked
        if (path.includes("/blockchain/message")) {
            // 200 is success, but response might be empty
            if (response.ok) {
                const text = await response.text();
                try {
                    const data = text ? JSON.parse(text) : { success: true };
                    return NextResponse.json(data);
                } catch {
                    // Non-JSON response, but still success
                    return NextResponse.json({ success: true });
                }
            }
            
            // Some errors still mean the tx was sent (409 = already exists)
            if (response.status === 409) {
                return NextResponse.json({ success: true, alreadySent: true });
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`TonAPI error: ${response.status} - ${errorText}`);
            return NextResponse.json(
                { error: `TonAPI error: ${response.status}` },
                { status: response.status }
            );
        }

        const text = await response.text();
        try {
            const data = text ? JSON.parse(text) : {};
            return NextResponse.json(data);
        } catch {
            return NextResponse.json({});
        }
    } catch (error) {
        console.error("TonAPI proxy error:", error);
        return NextResponse.json(
            { error: "Failed to fetch from TonAPI" },
            { status: 500 }
        );
    }
}
