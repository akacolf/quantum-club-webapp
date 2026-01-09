/**
 * QuickNode TON API Integration
 * 
 * Provides high-performance, rate-limit-free access to TON blockchain data.
 * Uses QuickNode's managed endpoints for reliable blockchain interactions.
 */

// QuickNode endpoint configuration
const QUICKNODE_ENDPOINT = process.env.NEXT_PUBLIC_QUICKNODE_TON_ENDPOINT || "";
const QUICKNODE_API_TOKEN = process.env.QUICKNODE_API_TOKEN || "";

// Types for QuickNode responses
export interface QuickNodeAccountInfo {
    address: string;
    balance: string;
    status: "active" | "uninitialized" | "frozen";
    last_transaction_lt?: string;
    last_transaction_hash?: string;
}

export interface QuickNodeTransaction {
    hash: string;
    lt: string;
    account: string;
    success: boolean;
    utime: number;
    in_msg?: {
        source: string;
        destination: string;
        value: string;
        op_name?: string;
    };
    out_msgs?: Array<{
        destination: string;
        value: string;
    }>;
    total_fees: string;
}

export interface QuickNodeMasterchainInfo {
    workchain: number;
    shard: string;
    seqno: number;
    root_hash: string;
    file_hash: string;
}

export interface QuickNodeJettonData {
    total_supply: string;
    mintable: boolean;
    admin_address: string;
    jetton_content: {
        name?: string;
        symbol?: string;
        image?: string;
        description?: string;
        decimals?: string;
    };
}

/**
 * Check if QuickNode is configured
 */
export function isQuickNodeConfigured(): boolean {
    return !!QUICKNODE_ENDPOINT && QUICKNODE_ENDPOINT.includes("quiknode.pro");
}

/**
 * Get the QuickNode base URL
 */
function getQuickNodeUrl(method: string): string {
    if (!QUICKNODE_ENDPOINT) {
        throw new Error("QuickNode endpoint not configured. Set NEXT_PUBLIC_QUICKNODE_TON_ENDPOINT");
    }
    // Ensure endpoint doesn't have trailing slash
    const baseUrl = QUICKNODE_ENDPOINT.replace(/\/$/, "");
    return `${baseUrl}/${method}`;
}

/**
 * Make a GET request to QuickNode
 */
async function quickNodeGet<T>(method: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(getQuickNodeUrl(method));
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
            "accept": "application/json",
            ...(QUICKNODE_API_TOKEN && { "x-api-key": QUICKNODE_API_TOKEN }),
        },
        next: { revalidate: 5 }, // Cache for 5 seconds
    });

    if (!response.ok) {
        throw new Error(`QuickNode API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.ok && data.error) {
        throw new Error(`QuickNode API error: ${data.error}`);
    }

    return data.result || data;
}

/**
 * Make a POST request to QuickNode
 */
async function quickNodePost<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const url = getQuickNodeUrl(method);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "accept": "application/json",
            "content-type": "application/json",
            ...(QUICKNODE_API_TOKEN && { "x-api-key": QUICKNODE_API_TOKEN }),
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`QuickNode API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.ok && data.error) {
        throw new Error(`QuickNode API error: ${data.error}`);
    }

    return data.result || data;
}

// =====================================================
// Account Methods
// =====================================================

/**
 * Get account information
 */
export async function getAccountInfo(address: string): Promise<QuickNodeAccountInfo> {
    return quickNodeGet<QuickNodeAccountInfo>("getAddressInformation", { address });
}

/**
 * Get account balance
 */
export async function getAccountBalance(address: string): Promise<string> {
    const result = await quickNodeGet<{ balance: string }>("getAddressBalance", { address });
    return result.balance;
}

/**
 * Get account state (active, uninitialized, frozen)
 */
export async function getAccountState(address: string): Promise<string> {
    const result = await quickNodeGet<{ state: string }>("getAddressState", { address });
    return result.state;
}

// =====================================================
// Transaction Methods
// =====================================================

/**
 * Get transaction by hash
 */
export async function getTransaction(hash: string): Promise<QuickNodeTransaction> {
    return quickNodeGet<QuickNodeTransaction>("getTransactions", { hash, limit: "1" });
}

/**
 * Get transactions for an address
 */
export async function getTransactions(
    address: string,
    limit: number = 10,
    lt?: string,
    hash?: string
): Promise<QuickNodeTransaction[]> {
    const params: Record<string, string> = { address, limit: String(limit) };
    if (lt) params.lt = lt;
    if (hash) params.hash = hash;
    
    const result = await quickNodeGet<QuickNodeTransaction[]>("getTransactions", params);
    return result;
}

// =====================================================
// Blockchain Info Methods
// =====================================================

/**
 * Get masterchain info
 */
export async function getMasterchainInfo(): Promise<QuickNodeMasterchainInfo> {
    return quickNodeGet<QuickNodeMasterchainInfo>("getMasterchainInfo");
}

/**
 * Get current block seqno
 */
export async function getCurrentBlockSeqno(): Promise<number> {
    const info = await getMasterchainInfo();
    return info.seqno;
}

// =====================================================
// Smart Contract Methods
// =====================================================

/**
 * Run GET method on smart contract
 */
export async function runGetMethod(
    address: string,
    method: string,
    stack?: Array<{ type: string; value: string }>
): Promise<{ exit_code: number; stack: unknown[] }> {
    return quickNodePost<{ exit_code: number; stack: unknown[] }>("runGetMethod", {
        address,
        method,
        stack: stack || [],
    });
}

/**
 * Get Jetton data from contract
 */
export async function getJettonData(jettonAddress: string): Promise<QuickNodeJettonData | null> {
    try {
        const result = await runGetMethod(jettonAddress, "get_jetton_data");
        
        if (result.exit_code !== 0) {
            return null;
        }

        // Parse the stack to extract jetton data
        // Stack order: total_supply, mintable, admin_address, content, wallet_code
        const stack = result.stack;
        if (stack.length < 4) return null;

        return {
            total_supply: String(stack[0]),
            mintable: stack[1] === -1,
            admin_address: String(stack[2]),
            jetton_content: {}, // Content parsing would require additional processing
        };
    } catch (error) {
        console.error("Failed to get jetton data via QuickNode:", error);
        return null;
    }
}

/**
 * Get Jetton wallet address for owner
 */
export async function getJettonWalletAddress(
    jettonAddress: string,
    ownerAddress: string
): Promise<string | null> {
    try {
        const result = await runGetMethod(jettonAddress, "get_wallet_address", [
            { type: "slice", value: ownerAddress }
        ]);
        
        if (result.exit_code !== 0) {
            return null;
        }

        return String(result.stack[0]);
    } catch (error) {
        console.error("Failed to get jetton wallet address via QuickNode:", error);
        return null;
    }
}

// =====================================================
// Send BOC (Broadcast Transaction)
// =====================================================

/**
 * Send BOC (serialized transaction) to the network
 */
export async function sendBoc(boc: string): Promise<{ hash: string }> {
    return quickNodePost<{ hash: string }>("sendBoc", { boc });
}

/**
 * Send BOC and get result (waits for confirmation)
 */
export async function sendBocReturnHash(boc: string): Promise<{ hash: string }> {
    return quickNodePost<{ hash: string }>("sendBocReturnHash", { boc });
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Estimate fees for a transaction
 */
export async function estimateFee(
    address: string,
    body: string,
    initCode?: string,
    initData?: string
): Promise<{ source_fees: { in_fwd_fee: number; storage_fee: number; gas_fee: number; fwd_fee: number } }> {
    return quickNodePost("estimateFee", {
        address,
        body,
        init_code: initCode,
        init_data: initData,
    });
}

/**
 * Pack address to proper format
 */
export async function packAddress(address: string): Promise<string> {
    const result = await quickNodeGet<{ address: string }>("packAddress", { address });
    return result.address;
}

/**
 * Unpack address from raw format
 */
export async function unpackAddress(address: string): Promise<string> {
    const result = await quickNodeGet<{ address: string }>("unpackAddress", { address });
    return result.address;
}

// =====================================================
// Health Check
// =====================================================

/**
 * Check QuickNode connectivity
 */
export async function healthCheck(): Promise<boolean> {
    try {
        const info = await getMasterchainInfo();
        return info.seqno > 0;
    } catch {
        return false;
    }
}
