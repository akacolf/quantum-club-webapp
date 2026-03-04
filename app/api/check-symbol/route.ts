import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/app/(firebase)/server";
import { decrypt } from "@/utils/session";
import { checkSymbolSchema } from "@/lib/validations";

// Rate limiting to prevent symbol scraping
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return `check_symbol_${ip}`;
}

/**
 * Check if a token symbol is available
 * GET /api/check-symbol?symbol=XYZ&excludeTokenId=abc123
 * 
 * excludeTokenId is optional - used when editing/retrying an existing token
 */
export async function GET(request: NextRequest) {
    try {
        // Validate session
        const sessionCookie = request.cookies.get("session")?.value;
        if (!sessionCookie) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
            await decrypt(sessionCookie);
        } catch {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limiting
        const rateLimitKey = getRateLimitKey(request);
        const now = Date.now();
        const rateLimit = rateLimitMap.get(rateLimitKey);
        
        if (rateLimit) {
            if (now < rateLimit.resetTime) {
                if (rateLimit.count >= MAX_REQUESTS_PER_MINUTE) {
                    return NextResponse.json(
                        { error: "Rate limit exceeded. Try again later.", available: false },
                        { status: 429 }
                    );
                }
                rateLimit.count++;
            } else {
                rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
            }
        } else {
            rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        }
        
        const { searchParams } = new URL(request.url);
        const excludeTokenId = searchParams.get("excludeTokenId");

        const parsed = checkSymbolSchema.safeParse({
            symbol: searchParams.get("symbol"),
        });
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            );
        }
        const { symbol } = parsed.data;

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
