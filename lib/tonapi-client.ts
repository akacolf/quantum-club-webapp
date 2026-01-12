/**
 * TonAPI Client Utility
 * 
 * Uses server-side proxy to make authenticated requests to TonAPI
 * This keeps the API key secure and provides higher rate limits
 */

interface TonApiOptions {
    testnet?: boolean;
}

/**
 * Make a GET request to TonAPI via the server proxy
 * @param path - The API path (e.g., "/v2/accounts/{address}")
 * @param options - Options including testnet flag
 */
export async function tonApiGet<T>(path: string, options: TonApiOptions = {}): Promise<T> {
    const { testnet = false } = options;
    
    const params = new URLSearchParams({
        path,
        testnet: String(testnet),
    });

    const response = await fetch(`/api/tonapi?${params.toString()}`);
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || `TonAPI request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Make a POST request to TonAPI via the server proxy
 * @param path - The API path
 * @param body - The request body
 * @param options - Options including testnet flag
 */
export async function tonApiPost<T>(path: string, body: unknown, options: TonApiOptions = {}): Promise<T> {
    const { testnet = false } = options;
    
    const params = new URLSearchParams({
        path,
        testnet: String(testnet),
    });

    const response = await fetch(`/api/tonapi?${params.toString()}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || `TonAPI request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Get account information
 */
export async function getAccount(address: string, testnet = false) {
    return tonApiGet<{
        balance: string;
        status: string;
        address: { raw: string };
    }>(`/v2/accounts/${address}`, { testnet });
}

/**
 * Get account jettons with USD prices
 */
export async function getAccountJettons(address: string, testnet = false) {
    return tonApiGet<{
        balances: Array<{
            balance: string;
            wallet_address?: { address?: string };
            price?: { prices?: { USD?: number } };
            jetton: {
                address?: string;
                symbol?: string;
                name?: string;
                decimals?: number;
                image?: string;
            };
        }>;
    }>(`/v2/accounts/${address}/jettons?currencies=usd`, { testnet });
}

/**
 * Get account NFTs
 */
export async function getAccountNfts(address: string, testnet = false, limit = 100) {
    return tonApiGet<{
        nft_items: Array<{
            address: string;
            metadata?: {
                name?: string;
                description?: string;
                image?: string;
            };
            collection?: {
                address?: string;
                name?: string;
            };
            previews?: Array<{ resolution: string; url: string }>;
        }>;
    }>(`/v2/accounts/${address}/nfts?limit=${limit}`, { testnet });
}

/**
 * Get account transactions
 */
export async function getAccountTransactions(
    address: string,
    testnet = false,
    limit = 50,
    beforeLt?: string
) {
    let path = `/v2/accounts/${address}/events?limit=${limit}&subject_only=true`;
    if (beforeLt) {
        path += `&before_lt=${beforeLt}`;
    }
    return tonApiGet<{
        events: Array<unknown>;
        next_from?: string;
    }>(path, { testnet });
}

/**
 * Resolve DNS domain
 */
export async function resolveDns(domain: string) {
    return tonApiGet<{
        wallet?: { address: string };
    }>(`/v2/dns/${encodeURIComponent(domain)}/resolve`);
}
