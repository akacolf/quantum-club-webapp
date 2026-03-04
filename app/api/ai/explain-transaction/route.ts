import { GoogleGenAI } from "@google/genai";
import { getSession } from "@/utils/session";
import { NextRequest, NextResponse } from "next/server";
import { AI_MODEL } from "@/lib/ai/system-prompt";
import { env } from "@/env";
import { explainTransactionSchema } from "@/lib/validations";

const TX_EXPLAIN_PROMPT = `You are a helpful AI that explains blockchain transactions in simple terms for Quantum Club wallet users.

Given transaction data, respond with a JSON object containing:
- type: the transaction type (e.g., "Transfer", "Swap", "Stake", "Contract Interaction")
- summary: 2-3 sentences explaining what happened in plain English (no jargon)
- participants: object with "from" and "to" fields (friendly descriptions)
- amount: the amount transferred (formatted nicely)
- fee: any fees involved (if known)

Keep explanations simple and user-friendly. Avoid technical blockchain jargon.`;

interface TransactionExplanationResponse {
    type?: string;
    summary?: string;
    participants?: { from?: string; to?: string };
    amount?: string;
    fee?: string;
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
        const parsed = explainTransactionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            );
        }
        const { hash, type, amount, from, to } = parsed.data;

        const txContext = `Explain this TON blockchain transaction:

Transaction Hash: ${hash}
Type: ${type || "unknown"}
From: ${from || "unknown"}
To: ${to || "unknown"}
Amount: ${amount || "unknown"}`;

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: AI_MODEL,
            contents: [{ role: "user", parts: [{ text: txContext }] }],
            config: {
                systemInstruction: TX_EXPLAIN_PROMPT,
                temperature: 0.2,
                maxOutputTokens: 400,
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
            const explanation: TransactionExplanationResponse = JSON.parse(responseText);
            
            return NextResponse.json({
                success: true,
                explanation: {
                    type: typeof explanation.type === 'string' ? explanation.type : type || "Transaction",
                    summary: typeof explanation.summary === 'string' ? explanation.summary : "This transaction was processed successfully.",
                    participants: explanation.participants || { from, to },
                    amount: typeof explanation.amount === 'string' ? explanation.amount : amount || "0",
                    fee: typeof explanation.fee === 'string' ? explanation.fee : "",
                    txHash: hash,
                    explainedAt: new Date().toISOString(),
                },
            });
        } catch (parseError) {
            console.error("JSON parse error:", parseError, "Response:", responseText);

            // Return a default explanation if parsing fails
            const txType = type || "transaction";

            return NextResponse.json({
                success: true,
                explanation: {
                    type: txType,
                    summary: `You ${type === 'Received' ? 'received' : 'sent'} ${amount || "some"} TON. This transaction has been confirmed on the TON blockchain.`,
                    participants: { from, to },
                    amount: amount || "0",
                    fee: "",
                    txHash: hash,
                    explainedAt: new Date().toISOString(),
                },
            });
        }
    } catch (error) {
        console.error("Transaction explain error:", error);
        return NextResponse.json({ error: "Explanation failed. Please try again." }, { status: 500 });
    }
}
