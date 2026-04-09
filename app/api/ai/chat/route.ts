import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
    SYSTEM_PROMPT,
    AI_MODEL,
    buildUserContextBlock,
    type UserAIContext,
} from "@/lib/ai/system-prompt";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { getSession } from "@/utils/session";
import { encryptTelegramId } from "@/utils/encrypt-telegram-id";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";

const userContextSchema = z.object({
    qntmBalance: z.string().max(50).optional(),
    rank: z.string().max(20).optional(),
    streak: z.number().int().min(0).max(99999).optional(),
    walletConnected: z.boolean().optional(),
    referralCount: z.number().int().min(0).max(999999).optional(),
    solveToEarnPasses: z.number().int().min(0).max(100).optional(),
}).optional();

// Context hints with detailed feature knowledge per page
function getContextHint(currentPage?: string): string {
    if (!currentPage) return "";

    if (currentPage.match(/\/ecosystem\/trade\/[^/]+/) || currentPage.match(/\/trade\/[^/]+/)) {
        return `\n\n[Context: User is viewing a specific token's trading page. They can buy/sell via the bonding curve, see the price chart, holder count, market cap, and creator info. Help with: trading mechanics, bonding curves, slippage, graduation threshold (2000 TON), fees (1.1% total), and reading token metrics.]`;
    }
    if (currentPage.includes("/trade/create") || currentPage.includes("/ecosystem/trade/create")) {
        return `\n\n[Context: User is creating a new token. Token creation is FREE, deployment costs 0.05 TON. They need a name, ticker, description, and optional image. Guide them through the process and explain what happens after launch (bonding curve starts, others can trade it).]`;
    }
    if (currentPage.startsWith("/ecosystem/trade") || currentPage.startsWith("/trade")) {
        return `\n\n[Context: User is browsing the token marketplace. They can see Trending, New, and Graduated tokens. Help with: understanding token metrics, how to evaluate tokens, what graduation means, and how to start trading.]`;
    }
    if (currentPage.startsWith("/wallet/staking")) {
        return `\n\n[Context: User is viewing staking options. They can stake TON via liquid staking protocols for ~5% APY. Explain: liquid staking tokens (tsTON, stTON, hTON), normal vs instant unstaking, and staking rewards.]`;
    }
    if (currentPage.startsWith("/wallet/nft")) {
        return `\n\n[Context: User is viewing their NFT collection. They can view, send, and trade NFTs. Marketplace fee is 0.5%.]`;
    }
    if (currentPage.startsWith("/wallet")) {
        return `\n\n[Context: User is in their wallet. Features: send/receive TON and Jettons, view multi-chain balances (TON, ETH, BTC, SOL, TRON), manage assets, access staking, and view NFTs. Help with: transactions, gas fees, recovery phrase security, and asset management.]`;
    }
    if (currentPage.startsWith("/ecosystem/chat") || currentPage.startsWith("/chat")) {
        return `\n\n[Context: User is in a chat conversation. Real-time messaging with other community members.]`;
    }
    if (currentPage.startsWith("/earn/solvetoearn")) {
        return `\n\n[Context: User is in Solve-to-Earn -- a timed math quiz where they solve arithmetic problems in 60 seconds. +3 QNTM per correct answer, -1 per wrong. Each game costs 1 pass (earned from daily check-in, +7 per day). Help with: game strategy and earning tips.]`;
    }
    if (currentPage.startsWith("/earn")) {
        return `\n\n[Context: User is in the Earn section. Features: daily mining check-in (streak-based QNTM rewards), Solve-to-Earn (timed math quiz), and tasks (Limited, In-App, Partner). Help with: maximizing earnings, streak maintenance, and task completion.]`;
    }
    if (currentPage.startsWith("/frens")) {
        return `\n\n[Context: User is viewing their referrals. They earn QNTM for invites and 0.1% of referred users' trades. Milestones: Networker (1), Team Builder (5), Referral King (10+). Help with: referral strategy and sharing invite links.]`;
    }
    if (currentPage.startsWith("/leaderboard")) {
        return `\n\n[Context: User is viewing the global leaderboard ranked by QNTM balance. Help with: understanding rankings and how to climb the leaderboard (daily mining, tasks, referrals, Solve-to-Earn).]`;
    }
    if (currentPage.startsWith("/home/profile")) {
        return `\n\n[Context: User is viewing their profile with achievements, badges, stats, and rank. Help with: understanding achievement requirements and how to unlock more.]`;
    }

    return "";
}

export async function POST(req: NextRequest) {
    try {
        // Security: Check for API key
        const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY || env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Missing Gemini API key");
            return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
        }

        // Security: Validate session
        const session = await getSession();
        if (!session || !session.user?.telegramId) {
            return NextResponse.json({ error: "Please log in to use AI" }, { status: 401 });
        }

        // Use encrypted user ID for consistency with other Firebase operations
        const rawTelegramId = String(session.user.telegramId);
        const userId = encryptTelegramId(rawTelegramId);

        // Rate limiting
        const rateLimitResult = await checkRateLimit(userId);
        if (!rateLimitResult.allowed) {
            return NextResponse.json({
                error: "You've reached your daily limit of 50 messages. Please try again tomorrow!",
                remaining: 0,
                resetAt: rateLimitResult.resetAt.toISOString(),
            }, { status: 429 });
        }

        // Parse request body
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        const { messages, currentPage, userContext: rawUserContext } = body as {
            messages: UIMessage[];
            currentPage?: string;
            userContext?: unknown;
        };

        if (!Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
        }

        // Validate user context
        const userContextParsed = userContextSchema.safeParse(rawUserContext);
        const userContext = userContextParsed.success ? userContextParsed.data : undefined;

        // Build context-aware system prompt
        const contextHint = getContextHint(currentPage);
        const userContextBlock = buildUserContextBlock(userContext as UserAIContext | undefined);
        const systemPrompt = SYSTEM_PROMPT + userContextBlock + contextHint;

        // Initialize Google provider
        const google = createGoogleGenerativeAI({ apiKey });

        // Stream response via AI SDK
        const result = streamText({
            model: google(AI_MODEL),
            system: systemPrompt,
            messages: await convertToModelMessages(messages),
            maxOutputTokens: 4096,
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingLevel: "medium",
                    },
                },
            },
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error("AI Chat Error:", error);

        const errorMessage = error instanceof Error ? error.message : String(error);

        // Don't expose internal error details to client in production
        if (process.env.NODE_ENV === "production") {
            return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
        }

        return NextResponse.json({
            error: "AI error: " + errorMessage.substring(0, 100)
        }, { status: 500 });
    }
}
