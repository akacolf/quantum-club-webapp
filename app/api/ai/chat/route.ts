import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, AI_MODEL } from "@/lib/ai/system-prompt";
import { checkRateLimit, getRateLimitStatus } from "@/lib/ai/rate-limiter";
import { getSession } from "@/utils/session";

// Security: Input validation
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_LENGTH = 20;

function sanitizeMessage(message: string): string {
    // Remove potentially harmful characters and limit length
    return message.trim().slice(0, MAX_MESSAGE_LENGTH);
}

export async function POST(req: Request) {
    try {
        // Security: Check for API key
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Missing Gemini API key");
            return Response.json({ error: "AI service not configured" }, { status: 500 });
        }

        // Security: Validate session
        const session = await getSession();
        if (!session || !session.user?.telegramId) {
            return Response.json({ error: "Please log in to use AI" }, { status: 401 });
        }

        const userId = String(session.user.telegramId);

        // Rate limiting
        const rateLimitResult = await checkRateLimit(userId);
        if (!rateLimitResult.allowed) {
            return Response.json({
                error: rateLimitResult.error,
                remaining: rateLimitResult.remaining,
                resetAt: rateLimitResult.resetAt.toISOString(),
            }, { status: 429 });
        }

        // Security: Parse and validate request body
        let body;
        try {
            body = await req.json();
        } catch {
            return Response.json({ error: "Invalid request body" }, { status: 400 });
        }

        const { message, history = [] } = body;

        // Security: Validate message
        if (!message || typeof message !== "string") {
            return Response.json({ error: "Message is required" }, { status: 400 });
        }

        const sanitizedMessage = sanitizeMessage(message);
        if (!sanitizedMessage) {
            return Response.json({ error: "Message cannot be empty" }, { status: 400 });
        }

        // Security: Validate and limit history
        if (!Array.isArray(history)) {
            return Response.json({ error: "Invalid history format" }, { status: 400 });
        }

        const sanitizedHistory = history
            .slice(-MAX_HISTORY_LENGTH)
            .filter((msg): msg is { role: string; content: string } =>
                typeof msg === "object" &&
                msg !== null &&
                typeof msg.role === "string" &&
                typeof msg.content === "string"
            )
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

        // Generate response
        const response = await ai.models.generateContent({
            model: AI_MODEL,
            contents: contents,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 1024,
            },
        });

        const text = response.text;

        return Response.json({
            response: text,
            remaining: rateLimitResult.remaining,
        });
    } catch (error) {
        console.error("AI Chat Error:", error);

        const errorMessage = error instanceof Error ? error.message : String(error);

        // Don't expose internal error details to client in production
        if (process.env.NODE_ENV === "production") {
            return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
        }

        return Response.json({
            error: "AI error: " + errorMessage.substring(0, 100)
        }, { status: 500 });
    }
}

// GET endpoint to check rate limit status
export async function GET() {
    try {
        const session = await getSession();
        if (!session || !session.user?.telegramId) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = String(session.user.telegramId);
        const status = await getRateLimitStatus(userId);
        return Response.json(status);
    } catch {
        return Response.json({ error: "Failed to get status" }, { status: 500 });
    }
}
