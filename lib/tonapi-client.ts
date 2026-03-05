/**
 * TonAPI Client Utility
 *
 * Uses server actions to make authenticated requests to TonAPI
 * This keeps the API key secure and provides higher rate limits
 */
import { tonApiGet as tonApiGetAction, tonApiPost as tonApiPostAction } from "@/lib/ton-actions";

interface TonApiOptions {
    testnet?: boolean;
}

/**
 * Make a GET request to TonAPI via the server action
 * @param path - The API path (e.g., "/v2/accounts/{address}")
 * @param options - Options including testnet flag
 */
export async function tonApiGet<T>(path: string, options: TonApiOptions = {}): Promise<T> {
    const { testnet = false } = options;

    const result = await tonApiGetAction({ path, testnet });

    if (result?.serverError) {
        throw new Error(result.serverError);
    }

    if (!result?.data) {
        throw new Error(`TonAPI request failed for path: ${path}`);
    }

    return result.data as T;
}

/**
 * Make a POST request to TonAPI via the server action
 * @param path - The API path
 * @param body - The request body
 * @param options - Options including testnet flag
 */
export async function tonApiPost<T>(path: string, body: unknown, options: TonApiOptions = {}): Promise<T> {
    const { testnet = false } = options;

    const result = await tonApiPostAction({ path, body, testnet });

    if (result?.serverError) {
        throw new Error(result.serverError);
    }

    if (!result?.data) {
        throw new Error(`TonAPI request failed for path: ${path}`);
    }

    return result.data as T;
}

// ---- Convenience helpers (same API surface as before) ----

export async function getAccount(address: string, options?: TonApiOptions) {
    return tonApiGet(`/v2/accounts/${address}`, options);
}

export async function getAccountJettons(address: string, options?: TonApiOptions & { currencies?: string }) {
    const currencies = options?.currencies || "usd";
    return tonApiGet(`/v2/accounts/${address}/jettons?currencies=${currencies}`, options);
}

export async function getAccountNfts(address: string, options?: TonApiOptions) {
    return tonApiGet(`/v2/accounts/${address}/nfts`, options);
}

export async function sendBoc(boc: string, options?: TonApiOptions) {
    return tonApiPost(`/v2/blockchain/message`, { boc }, options);
}

export async function sendBlockchainMessage(boc: string, testnet?: boolean) {
    return tonApiPost<{ hash?: string }>(`/v2/blockchain/message`, { boc }, { testnet });
}

