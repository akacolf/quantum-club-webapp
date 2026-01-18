import { GoogleGenAI } from "@google/genai";
import { getSession } from "@/utils/session";
import { NextRequest, NextResponse } from "next/server";
import { AI_MODEL } from "@/lib/ai/system-prompt";

const ANALYSIS_SYSTEM_PROMPT = `You are a crypto token analyst AI for Quantum Club. Analyze the provided token data and give a concise, helpful assessment.

Your response should include:
1. **Risk Score** (1-10, where 1 is safest): Based on liquidity, holder concentration, contract verification, and trading patterns
2. **Sentiment**: BULLISH, BEARISH, or NEUTRAL with brief reasoning
3. **Summary**: 2-3 sentence overview of the token
4. **Warnings**: Any red flags users should know about

Format your response as JSON:
{
  "riskScore": number,
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "summary": "string",
  "warnings": ["string"],
  "recommendation": "string"
}

Be concise but thorough. Always include disclaimers about crypto volatility.`;

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

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
        const tokenContext = `
Analyze this TON token:
- Address: ${tokenAddress}
- Name: ${tokenData?.name || "Unknown"}
- Symbol: ${tokenData?.symbol || "Unknown"}
- Price: ${tokenData?.price || "Unknown"}
- Market Cap: ${tokenData?.marketCap || "Unknown"}
- 24h Volume: ${tokenData?.volume24h || "Unknown"}
- 24h Change: ${tokenData?.priceChange24h || "Unknown"}%
- Holders: ${tokenData?.holders || "Unknown"}
- Liquidity: ${tokenData?.liquidity || "Unknown"}
- Created: ${tokenData?.createdAt || "Unknown"}

Provide your analysis in the JSON format specified.`;

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: AI_MODEL,
            contents: [{ role: "user", parts: [{ text: tokenContext }] }],
            config: {
                systemInstruction: ANALYSIS_SYSTEM_PROMPT,
                temperature: 0.3,
                maxOutputTokens: 500,
            },
        });

        const text = response.text || "";
        
        // Try to parse JSON from response
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                return NextResponse.json({
                    success: true,
                    analysis: {
                        riskScore: analysis.riskScore || 5,
                        sentiment: analysis.sentiment || "NEUTRAL",
                        summary: analysis.summary || "Unable to generate summary",
                        warnings: analysis.warnings || [],
                        recommendation: analysis.recommendation || "",
                        tokenAddress,
                        analyzedAt: new Date().toISOString(),
                    },
                });
            }
        } catch {
            // If JSON parsing fails, return raw text
        }

        return NextResponse.json({
            success: true,
            analysis: {
                riskScore: 5,
                sentiment: "NEUTRAL",
                summary: text.slice(0, 300),
                warnings: [],
                tokenAddress,
                analyzedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("Token analysis error:", error);
        return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
    }
}
