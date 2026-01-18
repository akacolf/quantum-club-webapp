import { GoogleGenAI } from "@google/genai";
import { getSession } from "@/utils/session";
import { NextRequest, NextResponse } from "next/server";
import { AI_MODEL } from "@/lib/ai/system-prompt";

const TX_EXPLAIN_PROMPT = `You are a helpful AI that explains blockchain transactions in simple terms for Quantum Club wallet users.

Given transaction data, explain:
1. What type of transaction this is (transfer, swap, stake, mint, etc.)
2. Who the participants are
3. What happened in plain English
4. Any fees involved

Keep explanations concise (2-3 sentences max) and user-friendly. Avoid technical jargon.

Format as JSON:
{
  "type": "string",
  "summary": "string",
  "participants": { "from": "string", "to": "string" },
  "amount": "string",
  "fee": "string"
}`;

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
        const { txHash, txData, walletAddress } = body;

        if (!txData) {
            return NextResponse.json({ error: "Transaction data required" }, { status: 400 });
        }

        const txContext = `
Explain this TON blockchain transaction for a user with wallet ${walletAddress || "unknown"}:

Transaction Hash: ${txHash || "N/A"}
Type: ${txData.type || "unknown"}
From: ${txData.from || "unknown"}
To: ${txData.to || "unknown"}
Amount: ${txData.amount || "unknown"} ${txData.symbol || "TON"}
Fee: ${txData.fee || "unknown"} TON
Timestamp: ${txData.timestamp || "unknown"}
Status: ${txData.status || "unknown"}
${txData.comment ? `Comment/Memo: ${txData.comment}` : ""}

Explain what happened in this transaction.`;

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: AI_MODEL,
            contents: [{ role: "user", parts: [{ text: txContext }] }],
            config: {
                systemInstruction: TX_EXPLAIN_PROMPT,
                temperature: 0.2,
                maxOutputTokens: 300,
            },
        });

        const text = response.text || "";
        
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const explanation = JSON.parse(jsonMatch[0]);
                return NextResponse.json({
                    success: true,
                    explanation: {
                        ...explanation,
                        txHash,
                        explainedAt: new Date().toISOString(),
                    },
                });
            }
        } catch {
            // Fallback to text
        }

        return NextResponse.json({
            success: true,
            explanation: {
                type: txData.type || "transaction",
                summary: text.slice(0, 200),
                txHash,
                explainedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("Transaction explain error:", error);
        return NextResponse.json({ error: "Explanation failed" }, { status: 500 });
    }
}
