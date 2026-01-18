"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    Loader2,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransactionExplanation {
    type: string;
    summary: string;
    participants?: { from: string; to: string };
    amount?: string;
    fee?: string;
}

interface TransactionData {
    type?: string;
    from?: string;
    to?: string;
    amount?: string;
    symbol?: string;
    fee?: string;
    timestamp?: string;
    status?: string;
    comment?: string;
}

interface TransactionExplainerProps {
    txHash: string;
    txData: TransactionData;
    walletAddress?: string;
    compact?: boolean;
}

export function TransactionExplainer({
    txHash,
    txData,
    walletAddress,
    compact = true,
}: TransactionExplainerProps) {
    const [explanation, setExplanation] = useState<TransactionExplanation | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const explainTransaction = useCallback(async () => {
        if (!txData) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/ai/explain-transaction", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ txHash, txData, walletAddress }),
            });

            if (!response.ok) {
                throw new Error("Failed to explain transaction");
            }

            const data = await response.json();
            if (data.success && data.explanation) {
                setExplanation(data.explanation);
                setIsExpanded(true);
            } else {
                throw new Error(data.error || "Explanation failed");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Explanation failed");
        } finally {
            setIsLoading(false);
        }
    }, [txHash, txData, walletAddress]);

    if (compact && !explanation && !isExpanded) {
        return (
            <Button
                variant="ghost"
                size="sm"
                onClick={explainTransaction}
                disabled={isLoading}
                className="text-xs gap-1 h-7 px-2 text-primary hover:text-primary"
            >
                {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                    <Sparkles className="w-3 h-3" />
                )}
                Explain
            </Button>
        );
    }

    return (
        <div className="mt-2">
            {/* Toggle Button */}
            <button
                onClick={() => {
                    if (!explanation && !isExpanded) {
                        explainTransaction();
                    } else {
                        setIsExpanded(!isExpanded);
                    }
                }}
                className="flex items-center gap-1 text-xs text-primary"
            >
                {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                    <Sparkles className="w-3 h-3" />
                )}
                <span>{explanation ? "AI Explanation" : "Explain this transaction"}</span>
                {explanation && (
                    isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                )}
            </button>

            {/* Explanation Content */}
            <AnimatePresence>
                {isExpanded && (explanation || error) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        {error ? (
                            <div className="mt-2 p-2 bg-red-500/10 rounded-lg text-xs text-red-400">
                                {error}
                            </div>
                        ) : explanation ? (
                            <div className="mt-2 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                                <p className="text-sm text-gray-300 leading-relaxed">
                                    {explanation.summary}
                                </p>
                                <p className="text-[10px] text-gray-600 mt-2 italic">
                                    AI-generated explanation
                                </p>
                            </div>
                        ) : null}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
