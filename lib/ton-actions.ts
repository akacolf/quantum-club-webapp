"use server";

import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import { env } from "@/env";

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

function isValidPath(path: string): boolean {
    if (!path.startsWith("/")) return false;
    return ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
}

const tonApiGetSchema = z.object({
    path: z.string().min(1),
    testnet: z.boolean().optional().default(false),
});

export const tonApiGet = authActionClient
    .schema(tonApiGetSchema)
    .action(async ({ parsedInput: { path, testnet } }) => {
        if (!isValidPath(path)) {
            throw new Error("Invalid API path");
        }

        const TONAPI_KEY = env.TONAPI_KEY;
        const baseUrl = testnet ? "https://testnet.tonapi.io" : "https://tonapi.io";

        const headers: HeadersInit = { "Content-Type": "application/json" };
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
            throw new Error(`TonAPI error: ${response.status}`);
        }

        return response.json();
    });

const tonApiPostSchema = z.object({
    path: z.string().min(1),
    body: z.unknown(),
    testnet: z.boolean().optional().default(false),
});

export const tonApiPost = authActionClient
    .schema(tonApiPostSchema)
    .action(async ({ parsedInput: { path, body, testnet } }) => {
        if (!isValidPath(path)) {
            throw new Error("Invalid API path");
        }

        const TONAPI_KEY = env.TONAPI_KEY;
        const baseUrl = testnet ? "https://testnet.tonapi.io" : "https://tonapi.io";

        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (TONAPI_KEY) {
            headers["Authorization"] = `Bearer ${TONAPI_KEY}`;
        }

        const response = await fetch(`${baseUrl}${path}`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });

        // For blockchain/message endpoint, handle special cases
        if (path.includes("/blockchain/message")) {
            if (response.ok) {
                const text = await response.text();
                try {
                    return text ? JSON.parse(text) : { success: true };
                } catch {
                    return { success: true };
                }
            }
            if (response.status === 409) {
                return { success: true, alreadySent: true };
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`TonAPI error: ${response.status} - ${errorText}`);
            throw new Error(`TonAPI error: ${response.status}`);
        }

        const text = await response.text();
        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return {};
        }
    });
