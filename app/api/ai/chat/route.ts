import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, AI_MODEL } from "@/lib/ai/system-prompt";
import { checkRateLimit, getRateLimitStatus } from "@/lib/ai/rate-limiter";
import { getSession } from "@/utils/session";
import { NextRequest, NextResponse } from "next/server";
import { createCipheriv } from "node:crypto";
import { z } from "zod";
import { env } from "@/env";

// Security: Input validation
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_LENGTH = 20;

const chatRequestSchema = z.object({
    message: z.string().min(1, "Message cannot be empty").max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`),
    history: z.array(
        z.object({
            role: z.string(),
            content: z.string(),
        })
    ).max(MAX_HISTORY_LENGTH).default([]),
    currentPage: z.string().optional(),
});

// Server-side encryption to get consistent user ID
function encryptTelegramId(telegramId: string): string {
    const encryptionKey = Buffer.from(env.AES_ENCRYPTION_KEY, 'base64');
    const iv = Buffer.from("00000000000000000000000000000000", 'utf8');
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
    let encrypted = cipher.update(telegramId, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted.replace(/['\"]+/g, "").replace(/[^a-zA-Z0-9]/g, "");
}

function sanitizeMessage(message: string): string {
    return message.trim().slice(0, MAX_MESSAGE_LENGTH);
}

// Get context-aware system prompt based on current page
function getContextualSystemPrompt(currentPage?: string): string {
    let contextHint = "";

    if (currentPage) {
        if (currentPage.startsWith("/wallet")) {
            contextHint = "\n\n[Context: User is currently viewing their wallet. They may have questions about sending/receiving crypto, managing assets, or understanding transaction fees.]";
        } else if (currentPage.startsWith("/groups") || currentPage.startsWith("/chat")) {
            contextHint = "\n\n[Context: User is in the social/community section. They may have questions about groups, messaging, or connecting with others.]";
        } else if (currentPage.startsWith("/earn")) {
            contextHint = "\n\n[Context: User is in the earn section. They may have questions about earning QNTM, daily rewards, referrals, or ranks.]";
        } else if (currentPage.startsWith("/frens")) {
            contextHint = "\n\n[Context: User is viewing referrals. They may have questions about inviting friends or referral rewards.]";
        }
    }

    return SYSTEM_PROMPT + contextHint;
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
                error: "You've reached your daily limit of 20 messages. Please try again tomorrow!",
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
                { error: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        const { message, history, currentPage } = parsed.data;

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

        // Get context-aware system prompt
        const systemPrompt = getContextualSystemPrompt(currentPage);

        // Generate streaming response
        const streamResponse = await ai.models.generateContentStream({
            model: AI_MODEL,
            contents: contents,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 1024,
            },
        });

        // Create a TransformStream for more reliable streaming
        const encoder = new TextEncoder();

        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of streamResponse) {
                        // Access the text content from the chunk
                        const text = chunk.text;
                        if (text) {
                            controller.enqueue(encoder.encode(text));
                        }
                    }
                } catch (streamError) {
                    console.error("Error during streaming:", streamError);
                } finally {
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

// GET endpoint to check rate limit status
export async function GET() {
    try {
        const session = await getSession();
        if (!session || !session.user?.telegramId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rawTelegramId = String(session.user.telegramId);
        const userId = encryptTelegramId(rawTelegramId);

        const status = await getRateLimitStatus(userId);
        return NextResponse.json(status);
    } catch {
        return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
    }
}

