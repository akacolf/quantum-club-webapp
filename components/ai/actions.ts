"use server";

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import { AI_MODEL } from "@/lib/ai/system-prompt";
import { env } from "@/env";
import { analyzeTokenSchema, portfolioHealthSchema } from "@/lib/validations";

function getGoogle() {
    const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY || env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("AI service not configured");
    return createGoogleGenerativeAI({ apiKey });
}

// ---------------------------------------------------------------------------
// analyzeToken — AI-powered token analysis using Gemini
// ---------------------------------------------------------------------------

const tokenAnalysisSchema = z.object({
    riskScore: z.number().min(1).max(10),
    sentiment: z.enum(["BULLISH", "BEARISH", "NEUTRAL"]),
    summary: z.string(),
    warnings: z.array(z.string()).max(5),
    recommendation: z.string(),
});

export const analyzeToken = authActionClient
    .schema(analyzeTokenSchema)
    .action(async ({ parsedInput: { tokenAddress, tokenData } }) => {
        const google = getGoogle();

        const tokenContext = `Analyze this TON token:
- Address: ${tokenAddress}
- Name: ${tokenData?.name || "Unknown"}
- Symbol: ${tokenData?.symbol || "Unknown"}
- Price: ${tokenData?.price || "Unknown"} TON
- Market Cap: ${tokenData?.marketCap || "Unknown"} TON
- 24h Volume: ${tokenData?.volume24h || "Unknown"} TON
- Holders: ${tokenData?.holders || "Unknown"}
- Created: ${tokenData?.createdAt || "Unknown"}`;

        try {
            const { object: analysis } = await generateObject({
                model: google(AI_MODEL),
                schema: tokenAnalysisSchema,
                system: `You are a crypto token analyst AI for Quantum Club. Analyze the provided token data and give a concise, helpful assessment. Be concise but thorough. Consider liquidity, holder concentration, and trading patterns. Always remind users this is not financial advice.`,
                prompt: tokenContext,
                temperature: 0.3,
                maxOutputTokens: 600,
            });

            return {
                success: true,
                analysis: {
                    ...analysis,
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

const portfolioAnalysisSchema = z.object({
    healthScore: z.number().min(0).max(100),
    diversification: z.enum(["GOOD", "MODERATE", "POOR"]),
    risks: z.array(z.string()).max(5),
    opportunities: z.array(z.string()).max(5),
    summary: z.string(),
    recommendation: z.string(),
});

export const analyzePortfolioHealth = authActionClient
    .schema(portfolioHealthSchema)
    .action(async ({ parsedInput: { assets, totalValue, stakedAmount } }) => {
        const google = getGoogle();

        const assetList = assets.map((a) =>
            `- ${a.symbol}: $${a.value || "0"} (balance: ${a.balance})`
        ).join("\n");

        const portfolioContext = `Analyze this crypto portfolio:

Assets:
${assetList || "No assets"}

Total Value: $${totalValue || "Unknown"}
Staked Amount: $${stakedAmount || "0"}
Number of different assets: ${assets.length}`;

        const { object: analysis } = await generateObject({
            model: google(AI_MODEL),
            schema: portfolioAnalysisSchema,
            system: `You are a crypto portfolio analyst AI for Quantum Club. Analyze the user's portfolio and provide actionable insights. Be helpful and educational. Do not provide financial advice.`,
            prompt: portfolioContext,
            temperature: 0.3,
            maxOutputTokens: 800,
        });

        return {
            success: true,
            analysis: {
                ...analysis,
                analyzedAt: new Date().toISOString(),
            },
        };
    });
