import { GoogleGenAI } from "@google/genai";
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

// Security: Input validation
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_LENGTH = 20;

const userContextSchema = z.object({
    qntmBalance: z.string().max(50).optional(),
    rank: z.string().max(20).optional(),
    streak: z.number().int().min(0).max(99999).optional(),
    walletConnected: z.boolean().optional(),
    referralCount: z.number().int().min(0).max(999999).optional(),
}).optional();

const chatRequestSchema = z.object({
    message: z.string().min(1, "Message cannot be empty").max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`),
    history: z.array(
        z.object({
            role: z.enum(["user", "model"]),
            content: z.string().max(MAX_MESSAGE_LENGTH),
        })
    ).max(MAX_HISTORY_LENGTH).default([]),
    currentPage: z.string().max(200).optional(),
    userContext: userContextSchema,
});

function sanitizeMessage(message: string): string {
    return message.trim().slice(0, MAX_MESSAGE_LENGTH);
}

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
    if (currentPage.startsWith("/groups")) {
        return `\n\n[Context: User is in the groups section. They can create/join groups, link groups to tokens, and chat in real-time. Some groups are NFT-gated. Help with: group features, creating communities around tokens, and group management.]`;
    }
    if (currentPage.startsWith("/ecosystem/chat") || currentPage.startsWith("/chat")) {
        return `\n\n[Context: User is in a chat conversation. Real-time messaging with other community members.]`;
    }
    if (currentPage.startsWith("/earn/solvetoearn")) {
        return `\n\n[Context: User is playing Solve-to-Earn puzzles. Each game costs 1 pass (earned from daily check-in, +7 per day). Help with: game mechanics and earning strategy.]`;
    }
    if (currentPage.startsWith("/earn")) {
        return `\n\n[Context: User is in the Earn section. Features: daily mining check-in (streak-based QNTM rewards), Solve-to-Earn puzzles, and tasks (Limited, In-App, Partner). Help with: maximizing earnings, streak maintenance, and task completion.]`;
    }
    if (currentPage.startsWith("/frens")) {
        return `\n\n[Context: User is viewing their referrals. They earn QNTM for invites and 0.1% of referred users' trades. Milestones: Networker (1), Team Builder (5), Referral King (10+). Help with: referral strategy and sharing invite links.]`;
    }
    if (currentPage.startsWith("/leaderboard")) {
        return `\n\n[Context: User is viewing the global leaderboard ranked by QNTM balance. Help with: understanding rankings and how to climb the leaderboard (daily mining, tasks, referrals, puzzles).]`;
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

        // Security: Parse and validate request body
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        const parsed = chatRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const { message, history, currentPage, userContext } = parsed.data;

        // Security: Sanitize message content
        const sanitizedMessage = sanitizeMessage(message);
        if (!sanitizedMessage) {
            return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
        }

        // Security: Sanitize history entries
        const sanitizedHistory = history
            .slice(-MAX_HISTORY_LENGTH)
            .map(msg => ({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: sanitizeMessage(msg.content) }],
            }));

        // Initialize AI
        const ai = new GoogleGenAI({ apiKey });

        // Build conversation
        const contents = [
            ...sanitizedHistory,
            { role: "user", parts: [{ text: sanitizedMessage }] },
        ];

        // Build context-aware system prompt with user profile and page context
        const contextHint = getContextHint(currentPage);
        const userContextBlock = buildUserContextBlock(userContext as UserAIContext | undefined);
        const systemPrompt = SYSTEM_PROMPT + userContextBlock + contextHint;

        // Generate streaming response with thinking enabled
        const streamResponse = await ai.models.generateContentStream({
            model: AI_MODEL,
            contents: contents,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 4096,
                thinkingConfig: {
                    thinkingBudget: 2048,
                },
            },
        });

        // Create a TransformStream for more reliable streaming
        const encoder = new TextEncoder();

        const STREAM_TIMEOUT_MS = 60_000; // 60 second timeout
        const readable = new ReadableStream({
            async start(controller) {
                let timeoutId: ReturnType<typeof setTimeout> | undefined;
                try {
                    const timeoutPromise = new Promise<never>((_, reject) => {
                        timeoutId = setTimeout(() => reject(new Error("Stream timeout")), STREAM_TIMEOUT_MS);
                    });

                    const streamPromise = (async () => {
                        for await (const chunk of streamResponse) {
                            // Only stream the text output, not thinking
                            const text = chunk.text;
                            if (text) {
                                controller.enqueue(encoder.encode(text));
                            }
                        }
                    })();

                    await Promise.race([streamPromise, timeoutPromise]);
                } catch (streamError) {
                    console.error("Error during streaming:", streamError);
                } finally {
                    clearTimeout(timeoutId);
                    controller.close();
                }
            },
        });

        return new Response(readable, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
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
