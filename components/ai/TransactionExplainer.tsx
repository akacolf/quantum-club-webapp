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
import { AIGlowBorder } from "./AIGlow";

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
        setIsExpanded(true);
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
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    explainTransaction();
                }}
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
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
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
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-2 pb-1 px-1">
                            {isLoading ? (
                                <AIGlowBorder isLoading={true}>
                                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl min-h-[60px] flex items-center justify-center relative z-10">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-xs text-primary animate-pulse">Analyzing blockchain data...</span>
                                        </div>
                                    </div>
                                </AIGlowBorder>
                            ) : error ? (
                                <div className="p-2 bg-red-500/10 rounded-xl text-xs text-red-400">
                                    {error}
                                </div>
                            ) : explanation ? (
                                <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                            {explanation.type}
                                        </span>
                                        {explanation.fee && (
                                            <span className="text-[10px] text-gray-500">
                                                Fee: {explanation.fee}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-300 leading-relaxed">
                                        {explanation.summary}
                                    </p>
                                    <p className="text-[10px] text-gray-600 mt-2 italic">
                                        AI-generated explanation
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
