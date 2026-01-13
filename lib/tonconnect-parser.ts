"use client";

/**
 * TON Connect URI Parser
 * Parses TON Connect connection URIs from dApp QR codes
 */

export interface TonConnectRequest {
    version: number;
    id: string;
    manifestUrl: string;
    returnUrl?: string;
    returnStrategy?: "back" | "none";
    items: Array<{
        name: string;
        payload?: string;
    }>;
}

export interface DAppManifest {
    url: string;
    name: string;
    iconUrl?: string;
    termsOfUseUrl?: string;
    privacyPolicyUrl?: string;
}

/**
 * Parse a TON Connect URI from a QR code
 * Supports both `tc://` protocol and universal links
 * 
 * Format examples:
 * - tc://?v=2&id=abc123&r=https://app.example.com&ret=back
 * - https://app.tonkeeper.com/ton-connect?v=2&id=abc123&r=https://app.example.com
 * - JSON-based: {"manifestUrl":"...","items":[...]}
 */
export function parseTonConnectUri(uri: string): TonConnectRequest | null {
    try {
        // Try parsing as JSON first (some dApps embed JSON directly)
        if (uri.startsWith("{")) {
            const parsed = JSON.parse(uri);
            if (parsed.manifestUrl) {
                return {
                    version: parsed.v || 2,
                    id: parsed.id || generateSessionId(),
                    manifestUrl: parsed.manifestUrl,
                    returnUrl: parsed.r || parsed.returnUrl,
                    returnStrategy: parsed.ret || "back",
                    items: parsed.items || [{ name: "ton_addr" }],
                };
            }
        }

        // Parse as URL
        let url: URL;
        let params: URLSearchParams;

        if (uri.startsWith("tc://")) {
            // tc:// protocol
            url = new URL(uri.replace("tc://", "https://tonconnect."));
            params = url.searchParams;
        } else if (uri.includes("ton-connect") || uri.includes("tonconnect")) {
            // Universal link format
            url = new URL(uri);
            params = url.searchParams;
        } else {
            // Try as generic URL with query params
            url = new URL(uri);
            params = url.searchParams;
        }

        const version = parseInt(params.get("v") || "2");
        const id = params.get("id") || generateSessionId();
        const returnUrl = params.get("r") || undefined;
        const returnStrategy = (params.get("ret") as "back" | "none") || "back";

        // The manifest URL is typically in a separate parameter or encoded
        // Different dApps encode this differently
        let actualManifestUrl = params.get("manifest") || params.get("manifestUrl") || "";
        
        // Some use the return URL domain to construct manifest
        if (!actualManifestUrl && returnUrl) {
            try {
                const returnUrlParsed = new URL(returnUrl);
                actualManifestUrl = `${returnUrlParsed.origin}/tonconnect-manifest.json`;
            } catch {
                // Ignore
            }
        }

        // If still no manifest, try common patterns
        if (!actualManifestUrl && uri.includes("//")) {
            const matches = uri.match(/https?:\/\/[^?#\s]+/g);
            if (matches) {
                for (const match of matches) {
                    if (match.includes("manifest")) {
                        actualManifestUrl = match;
                        break;
                    }
                }
            }
        }

        if (!actualManifestUrl) {
            // Can't proceed without manifest URL
            console.warn("No manifest URL found in TON Connect URI");
            return null;
        }

        return {
            version,
            id,
            manifestUrl: actualManifestUrl,
            returnUrl,
            returnStrategy,
            items: [{ name: "ton_addr" }],
        };
    } catch (error) {
        console.error("Failed to parse TON Connect URI:", error);
        return null;
    }
}

/**
 * Fetch the dApp manifest from its URL
 */
export async function fetchDAppManifest(manifestUrl: string): Promise<DAppManifest | null> {
    try {
        const response = await fetch(manifestUrl, {
            headers: {
                "Accept": "application/json",
            },
            // Allow CORS
            mode: "cors",
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const manifest = await response.json();

        return {
            url: manifest.url || new URL(manifestUrl).origin,
            name: manifest.name || "Unknown dApp",
            iconUrl: manifest.iconUrl,
            termsOfUseUrl: manifest.termsOfUseUrl,
            privacyPolicyUrl: manifest.privacyPolicyUrl,
        };
    } catch (error) {
        console.error("Failed to fetch dApp manifest:", error);
        
        // Return a basic manifest based on the URL
        try {
            const url = new URL(manifestUrl);
            return {
                url: url.origin,
                name: url.hostname.replace("www.", ""),
            };
        } catch {
            return null;
        }
    }
}

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Validate if a string looks like a TON Connect URI
 */
export function isTonConnectUri(uri: string): boolean {
    if (!uri) return false;
    
    // Check for known patterns
    if (uri.startsWith("tc://")) return true;
    if (uri.includes("ton-connect")) return true;
    if (uri.includes("tonconnect")) return true;
    
    // Check for JSON with manifestUrl
    if (uri.startsWith("{")) {
        try {
            const parsed = JSON.parse(uri);
            if (parsed.manifestUrl) return true;
        } catch {
            // Not valid JSON
        }
    }
    
    return false;
}
