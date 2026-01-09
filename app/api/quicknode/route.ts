import { NextRequest, NextResponse } from "next/server";
import {
    isQuickNodeConfigured,
    getAccountInfo,
    getAccountBalance,
    getTransactions,
    getMasterchainInfo,
    getJettonData,
    healthCheck,
} from "@/lib/quicknode";

/**
 * GET /api/quicknode
 * 
 * Proxy endpoint for QuickNode API calls.
 * Supports various methods: account, balance, transactions, jetton, health
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const method = searchParams.get("method");
    const address = searchParams.get("address");

    // Check if QuickNode is configured
    if (!isQuickNodeConfigured()) {
        return NextResponse.json(
            { error: "QuickNode not configured", configured: false },
            { status: 503 }
        );
    }

    try {
        switch (method) {
            case "health":
                const healthy = await healthCheck();
                return NextResponse.json({ healthy, configured: true });

            case "masterchain":
                const info = await getMasterchainInfo();
                return NextResponse.json({ success: true, data: info });

            case "account":
                if (!address) {
                    return NextResponse.json({ error: "Address required" }, { status: 400 });
                }
                const accountInfo = await getAccountInfo(address);
                return NextResponse.json({ success: true, data: accountInfo });

            case "balance":
                if (!address) {
                    return NextResponse.json({ error: "Address required" }, { status: 400 });
                }
                const balance = await getAccountBalance(address);
                return NextResponse.json({ success: true, balance });

            case "transactions":
                if (!address) {
                    return NextResponse.json({ error: "Address required" }, { status: 400 });
                }
                const limit = parseInt(searchParams.get("limit") || "10");
                const lt = searchParams.get("lt") || undefined;
                const hash = searchParams.get("hash") || undefined;
                const txs = await getTransactions(address, limit, lt, hash);
                return NextResponse.json({ success: true, transactions: txs });

            case "jetton":
                if (!address) {
                    return NextResponse.json({ error: "Address required" }, { status: 400 });
                }
                const jettonData = await getJettonData(address);
                return NextResponse.json({ success: true, data: jettonData });

            default:
                return NextResponse.json(
                    { error: "Invalid method. Supported: health, masterchain, account, balance, transactions, jetton" },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error("QuickNode API error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "QuickNode request failed" },
            { status: 500 }
        );
    }
}
