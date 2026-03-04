import { NextRequest, NextResponse } from "next/server";
import { Address, beginCell, toNano } from "@ton/core";
import { getAdminApiKey, PLATFORM_WALLET_ADDRESS } from "@/lib/platform-config";
import { adminWithdrawFeesSchema } from "@/lib/validations";

/**
 * POST /api/admin/withdraw-fees
 * 
 * Build a transaction to withdraw platform fees from a token contract.
 * This endpoint is protected by an API key and returns the transaction
 * parameters for the platform wallet to sign.
 * 
 * Headers:
 *   x-api-key: Admin API key
 * 
 * Body: {
 *   jettonAddress: string; // Token contract address
 * }
 * 
 * Returns transaction params for platform wallet to sign
 */
export async function POST(request: NextRequest) {
    try {
        // Verify API key
        const apiKey = request.headers.get("x-api-key");
        const adminKey = getAdminApiKey();
        if (!adminKey || apiKey !== adminKey) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (!PLATFORM_WALLET_ADDRESS) {
            return NextResponse.json(
                { error: "Platform wallet not configured" },
                { status: 500 }
            );
        }

        const body = await request.json();
        const parsed = adminWithdrawFeesSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            );
        }
        const { jettonAddress } = parsed.data;

        // Parse and validate address
        let targetAddress: Address;
        try {
            targetAddress = Address.parse(jettonAddress);
        } catch {
            return NextResponse.json(
                { error: "Invalid jetton address" },
                { status: 400 }
            );
        }

        // Build withdraw_fees message
        // op::withdraw_fees = 0x46454553 ("FEES")
        const messageBody = beginCell()
            .storeUint(0x46454553, 32) // op::withdraw_fees
            .storeUint(Date.now(), 64) // query_id
            .endCell();

        return NextResponse.json({
            success: true,
            transaction: {
                to: targetAddress.toString({ bounceable: true }),
                value: toNano("0.05").toString(), // Gas for the operation
                body: messageBody.toBoc().toString("base64"),
            },
            message: "Sign this transaction from the platform wallet to withdraw fees",
        });
    } catch (error) {
        console.error("Withdraw fees error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
