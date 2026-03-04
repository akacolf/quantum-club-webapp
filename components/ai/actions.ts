"use server";

import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { authActionClient } from "@/lib/safe-action";
import { AI_MODEL } from "@/lib/ai/system-prompt";
import { env } from "@/env";
import { analyzeTokenSchema, portfolioHealthSchema } from "@/lib/validations";

// ---------------------------------------------------------------------------
// analyzeToken — AI-powered token analysis using Gemini
// ---------------------------------------------------------------------------

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

export const analyzeToken = authActionClient
    .schema(analyzeTokenSchema)
    .action(async ({ parsedInput: { tokenAddress, tokenData } }) => {
        const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY || env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("AI service not configured");
        }

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

        let responseText = "";
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) responseText += part.text;
            }
        }
        if (!responseText && response.text) responseText = response.text;
        if (!responseText) throw new Error("No response text from AI");

        try {
            const analysis: TokenAnalysisResponse = JSON.parse(responseText);
            return {
                success: true,
                analysis: {
                    riskScore: typeof analysis.riskScore === "number" ? Math.min(10, Math.max(1, analysis.riskScore)) : 5,
                    sentiment: ["BULLISH", "BEARISH", "NEUTRAL"].includes(analysis.sentiment || "") ? analysis.sentiment : "NEUTRAL",
                    summary: typeof analysis.summary === "string" ? analysis.summary : "Token analysis completed.",
                    warnings: Array.isArray(analysis.warnings) ? analysis.warnings.filter((w): w is string => typeof w === "string").slice(0, 5) : [],
                    recommendation: typeof analysis.recommendation === "string" ? analysis.recommendation : "",
                    tokenAddress,
                    analyzedAt: new Date().toISOString(),
                },
            };
        } catch {
            return {
                success: true,
                analysis: {
                    riskScore: 5,
                    sentiment: "NEUTRAL" as const,
                    summary: "This token appears to be a standard TON-based asset. Always do your own research before investing.",
                    warnings: ["Unable to fully analyze token. Please verify on-chain data."],
                    recommendation: "Review liquidity and holder distribution before trading.",
                    tokenAddress,
                    analyzedAt: new Date().toISOString(),
                },
            };
        }
    });

// ---------------------------------------------------------------------------
// analyzePortfolioHealth — AI portfolio health analysis
// ---------------------------------------------------------------------------

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

export const analyzePortfolioHealth = authActionClient
    .schema(portfolioHealthSchema)
    .action(async ({ parsedInput: { assets, totalValue, stakedAmount } }) => {
        const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY || env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("AI service not configured");
        }

        const assetList = assets.map((a) =>
            `- ${a.symbol}: $${a.value || "0"} (balance: ${a.balance})`
        ).join("\n");

        const portfolioContext = `Analyze this crypto portfolio:

Assets:
${assetList || "No assets"}

Total Value: $${totalValue || "Unknown"}
Staked Amount: $${stakedAmount || "0"}
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

        let responseText = "";
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) responseText += part.text;
            }
        }
        if (!responseText && response.text) responseText = response.text;
        if (!responseText) throw new Error("No response text from AI");

        try {
            const analysis: PortfolioAnalysisResponse = JSON.parse(responseText);
            return {
                success: true,
                analysis: {
                    healthScore: typeof analysis.healthScore === "number" ? Math.min(100, Math.max(0, analysis.healthScore)) : 50,
                    diversification: ["GOOD", "MODERATE", "POOR"].includes(analysis.diversification || "") ? analysis.diversification : "MODERATE",
                    risks: Array.isArray(analysis.risks) ? analysis.risks.filter((r): r is string => typeof r === "string").slice(0, 5) : [],
                    opportunities: Array.isArray(analysis.opportunities) ? analysis.opportunities.filter((o): o is string => typeof o === "string").slice(0, 5) : [],
                    summary: typeof analysis.summary === "string" ? analysis.summary : "Portfolio analysis completed.",
                    recommendation: typeof analysis.recommendation === "string" ? analysis.recommendation : "",
                    analyzedAt: new Date().toISOString(),
                },
            };
        } catch {
            throw new Error("Failed to parse analysis results. Please try again.");
        }
    });
