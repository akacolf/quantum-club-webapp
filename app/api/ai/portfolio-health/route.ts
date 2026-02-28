import { GoogleGenAI } from "@google/genai";
import { getSession } from "@/utils/session";
import { NextRequest, NextResponse } from "next/server";
import { AI_MODEL } from "@/lib/ai/system-prompt";

const PORTFOLIO_PROMPT = `You are a crypto portfolio analyst AI for Quantum Club. Analyze the user's portfolio and provide actionable insights.

Respond with a JSON object containing:
- healthScore: number from 1-100 (overall portfolio health)
- diversification: "GOOD", "MODERATE", or "POOR"
- risks: array of 2-3 short risk warnings (strings)
- opportunities: array of 2-3 improvement suggestions (strings)
- summary: a 2-sentence plain text overview of the portfolio
- recommendation: one actionable recommendation (string)

Be helpful and educational. Do not provide financial advice.`;

interface PortfolioAnalysisResponse {
    healthScore?: number;
    diversification?: string;
    risks?: string[];
    opportunities?: string[];
    summary?: string;
    recommendation?: string;
}

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
        const { assets, totalValue, stakedAmount } = body;

        if (!assets || !Array.isArray(assets)) {
            return NextResponse.json({ error: "Assets data required" }, { status: 400 });
        }

        // Build portfolio context
        const assetList = assets.map((a: { symbol: string; value: number; percentage: number }) => 
            `- ${a.symbol}: $${a.value?.toFixed(2) || "0"} (${a.percentage?.toFixed(1) || "0"}%)`
        ).join("\n");

        const portfolioContext = `Analyze this crypto portfolio:

Total Value: $${totalValue?.toFixed(2) || "0"}
Staked Amount: $${stakedAmount?.toFixed(2) || "0"}

Assets:
${assetList || "No assets"}

Number of different assets: ${assets.length}`;

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: AI_MODEL,
            contents: [{ role: "user", parts: [{ text: portfolioContext }] }],
            config: {
                systemInstruction: PORTFOLIO_PROMPT,
                temperature: 0.3,
                maxOutputTokens: 800,
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
            const analysis: PortfolioAnalysisResponse = JSON.parse(responseText);
            
            return NextResponse.json({
                success: true,
                analysis: {
                    healthScore: typeof analysis.healthScore === 'number' ? Math.min(100, Math.max(0, analysis.healthScore)) : 50,
                    diversification: ['GOOD', 'MODERATE', 'POOR'].includes(analysis.diversification || '') ? analysis.diversification : 'MODERATE',
                    risks: Array.isArray(analysis.risks) ? analysis.risks.filter((r): r is string => typeof r === 'string').slice(0, 5) : [],
                    opportunities: Array.isArray(analysis.opportunities) ? analysis.opportunities.filter((o): o is string => typeof o === 'string').slice(0, 5) : [],
                    summary: typeof analysis.summary === 'string' ? analysis.summary : "Portfolio analysis completed.",
                    recommendation: typeof analysis.recommendation === 'string' ? analysis.recommendation : "",
                    analyzedAt: new Date().toISOString(),
                },
            });
        } catch (parseError) {
            console.error("JSON parse error:", parseError, "Response:", responseText);

            return NextResponse.json({
                success: false,
                error: "Failed to parse analysis results. Please try again.",
            }, { status: 500 });
        }
    } catch (error) {
        console.error("Portfolio health error:", error);
        return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
    }
}
