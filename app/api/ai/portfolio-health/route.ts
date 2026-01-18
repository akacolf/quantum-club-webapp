import { GoogleGenAI } from "@google/genai";
import { getSession } from "@/utils/session";
import { NextRequest, NextResponse } from "next/server";
import { AI_MODEL } from "@/lib/ai/system-prompt";

const PORTFOLIO_PROMPT = `You are a crypto portfolio analyst AI for Quantum Club. Analyze the user's portfolio and provide actionable insights.

Your response should include:
1. **Health Score** (1-100): Overall portfolio health considering diversification, risk, and potential
2. **Diversification**: How well-diversified is the portfolio
3. **Risks**: Key risks to be aware of
4. **Opportunities**: Potential improvements or opportunities
5. **Summary**: Brief 2-sentence portfolio overview

Format as JSON:
{
  "healthScore": number,
  "diversification": "GOOD" | "MODERATE" | "POOR",
  "risks": ["string"],
  "opportunities": ["string"],
  "summary": "string",
  "recommendation": "string"
}

Be helpful but include disclaimers. Focus on education over financial advice.`;

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

        const portfolioContext = `
Analyze this crypto portfolio:

Total Value: $${totalValue?.toFixed(2) || "0"}
Staked Amount: $${stakedAmount?.toFixed(2) || "0"}

Assets:
${assetList || "No assets"}

Number of different assets: ${assets.length}

Provide your portfolio health analysis.`;

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: AI_MODEL,
            contents: [{ role: "user", parts: [{ text: portfolioContext }] }],
            config: {
                systemInstruction: PORTFOLIO_PROMPT,
                temperature: 0.3,
                maxOutputTokens: 500,
            },
        });

        const text = response.text || "";
        
        try {
            // Remove markdown code blocks if present
            const cleanText = text
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();
            
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                return NextResponse.json({
                    success: true,
                    analysis: {
                        healthScore: typeof analysis.healthScore === 'number' ? Math.min(100, Math.max(0, analysis.healthScore)) : 50,
                        diversification: ['GOOD', 'MODERATE', 'POOR'].includes(analysis.diversification) ? analysis.diversification : 'MODERATE',
                        risks: Array.isArray(analysis.risks) ? analysis.risks.filter((r: unknown) => typeof r === 'string') : [],
                        opportunities: Array.isArray(analysis.opportunities) ? analysis.opportunities.filter((o: unknown) => typeof o === 'string') : [],
                        summary: typeof analysis.summary === 'string' ? analysis.summary : "Portfolio analysis completed",
                        recommendation: typeof analysis.recommendation === 'string' ? analysis.recommendation : "",
                        analyzedAt: new Date().toISOString(),
                    },
                });
            }
        } catch {
            // Fallback on parse error
        }

        // Fallback: Clean up text for summary
        const cleanSummary = text
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .replace(/\{[\s\S]*\}/g, '')
            .trim()
            .slice(0, 300);

        return NextResponse.json({
            success: true,
            analysis: {
                healthScore: 50,
                diversification: "MODERATE",
                risks: [],
                opportunities: [],
                summary: cleanSummary || "Your portfolio has been analyzed. Consider diversifying across different asset classes.",
                analyzedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("Portfolio health error:", error);
        return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
    }
}
