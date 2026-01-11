import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/app/(firebase)/server";

/**
 * Check if a token symbol is available
 * GET /api/check-symbol?symbol=XYZ&excludeTokenId=abc123
 * 
 * excludeTokenId is optional - used when editing/retrying an existing token
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get("symbol");
        const excludeTokenId = searchParams.get("excludeTokenId");

        if (!symbol) {
            return NextResponse.json(
                { error: "Symbol parameter is required" },
                { status: 400 }
            );
        }

        // Validate symbol format
        if (!/^[A-Za-z0-9]+$/.test(symbol)) {
            return NextResponse.json({
                available: false,
                reason: "Symbol can only contain letters and numbers"
            });
        }

        if (symbol.length > 10) {
            return NextResponse.json({
                available: false,
                reason: "Symbol must be 10 characters or less"
            });
        }

        // Check for duplicate symbol (case-insensitive)
        const symbolLower = symbol.toLowerCase();
        const duplicateCheck = await firestore.collection("tokens")
            .where("symbolLower", "==", symbolLower)
            .limit(1)
            .get();

        if (!duplicateCheck.empty) {
            // If excludeTokenId is provided, check if the duplicate is the same token
            const existingToken = duplicateCheck.docs[0];
            if (!excludeTokenId || existingToken.id !== excludeTokenId) {
                return NextResponse.json({
                    available: false,
                    reason: `Symbol "${symbol.toUpperCase()}" is already taken`
                });
            }
            // If it's the same token (e.g., retry scenario), consider it available
        }

        return NextResponse.json({
            available: true,
            symbol: symbol.toUpperCase()
        });

    } catch (error) {
        console.error("Error checking symbol availability:", error);
        return NextResponse.json(
            { error: "Failed to check symbol availability" },
            { status: 500 }
        );
    }
}
