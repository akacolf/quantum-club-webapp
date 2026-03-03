import { GoogleGenAI } from "@google/genai";
import { getSession } from "@/utils/session";
import { NextRequest, NextResponse } from "next/server";
import { AI_MODEL } from "@/lib/ai/system-prompt";
import { env } from "@/env";

const ANALYSIS_SYSTEM_PROMPT = `You are a crypto token analyst AI for Quantum Club. Analyze the provided token data and give a concise, helpful assessment.

Respond with a JSON object containing:
- riskScore: number from 1-10 (1 = safest, 10 = riskiest)
- sentiment: "BULLISH", "BEARISH", or "NEUTRAL"
- summary: 2-3 sentences describing the token and its current state
- warnings: array of 1-3 short warning strings (potential red flags)
- recommendation: one short actionable recommendation

Be concise but thorough. Consider liquidity, holder concentration, and trading patterns. Always remind users this is not financial advice.`;

interface TokenAnalysisResponse {
    riskScore?: number;
    sentiment?: string;
    summary?: string;
    warnings?: string[];
    recommendation?: string;
}

export async function POST(req: NextRequest) {
    try {
        const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY || env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
        }

        const session = await getSession();
        if (!session || !session.user?.telegramId) {
            return NextResponse.json({ error: "Please log in" }, { status: 401 });
        }

        const body = await req.json();
        const { tokenAddress, tokenData } = body;

        if (!tokenAddress) {
            return NextResponse.json({ error: "Token address required" }, { status: 400 });
        }

        // Build token context for AI
        const tokenContext = `Analyze this TON token:
- Address: ${tokenAddress}
- Name: ${tokenData?.name || "Unknown"}
- Symbol: ${tokenData?.symbol || "Unknown"}
- Price: ${tokenData?.price || "Unknown"} TON
- Market Cap: ${tokenData?.marketCap || "Unknown"} TON
- 24h Volume: ${tokenData?.volume24h || "Unknown"} TON
- Holders: ${tokenData?.holders || "Unknown"}
- Created: ${tokenData?.createdAt || "Unknown"}`;

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: AI_MODEL,
            contents: [{ role: "user", parts: [{ text: tokenContext }] }],
            config: {
                systemInstruction: ANALYSIS_SYSTEM_PROMPT,
                temperature: 0.3,
                maxOutputTokens: 600,
                responseMimeType: "application/json",
            },
        });

        // Get text from response
        let responseText = "";
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    responseText += part.text;
                }
            }
        }
        
        // Fallback to response.text if available
        if (!responseText && response.text) {
            responseText = response.text;
        }

        if (!responseText) {
            throw new Error("No response text from AI");
        }

        // Parse the JSON response
        try {
            const analysis: TokenAnalysisResponse = JSON.parse(responseText);
            
            return NextResponse.json({
                success: true,
                analysis: {
                    riskScore: typeof analysis.riskScore === 'number' ? Math.min(10, Math.max(1, analysis.riskScore)) : 5,
                    sentiment: ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(analysis.sentiment || '') ? analysis.sentiment : 'NEUTRAL',
                    summary: typeof analysis.summary === 'string' ? analysis.summary : "Token analysis completed.",
                    warnings: Array.isArray(analysis.warnings) ? analysis.warnings.filter((w): w is string => typeof w === 'string').slice(0, 5) : [],
                    recommendation: typeof analysis.recommendation === 'string' ? analysis.recommendation : "",
                    tokenAddress,
                    analyzedAt: new Date().toISOString(),
                },
            });
        } catch (parseError) {
            console.error("JSON parse error:", parseError, "Response:", responseText);
            
            // Return a default analysis if parsing fails
            return NextResponse.json({
                success: true,
                analysis: {
                    riskScore: 5,
                    sentiment: "NEUTRAL",
                    summary: "This token appears to be a standard TON-based asset. Always do your own research before investing.",
                    warnings: ["Unable to fully analyze token. Please verify on-chain data."],
                    recommendation: "Review liquidity and holder distribution before trading.",
                    tokenAddress,
                    analyzedAt: new Date().toISOString(),
                },
            });
        }
    } catch (error) {
        console.error("Token analysis error:", error);
        return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
    }
}
