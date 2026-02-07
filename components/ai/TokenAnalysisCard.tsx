"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIGlowBorder } from "./AIGlow";

interface TokenAnalysis {
    riskScore: number;
    sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
    summary: string;
    warnings: string[];
    recommendation?: string;
    analyzedAt: string;
}

interface TokenData {
    name?: string;
    symbol?: string;
    price?: number;
    marketCap?: number;
    volume24h?: number;
    priceChange24h?: number;
    holders?: number;
    liquidity?: number;
    createdAt?: string;
}

interface TokenAnalysisCardProps {
    tokenAddress: string;
    tokenData?: TokenData;
    autoAnalyze?: boolean;
}

export function TokenAnalysisCard({
    tokenAddress,
    tokenData,
    autoAnalyze = false,
}: TokenAnalysisCardProps) {
    const [analysis, setAnalysis] = useState<TokenAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyzeToken = useCallback(async () => {
        if (!tokenAddress) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/ai/analyze-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tokenAddress, tokenData }),
            });

            if (!response.ok) {
                throw new Error("Failed to analyze token");
            }

            const data = await response.json();
            if (data.success && data.analysis) {
                setAnalysis(data.analysis);
                setIsExpanded(true);
            } else {
                throw new Error(data.error || "Analysis failed");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Analysis failed");
        } finally {
            setIsLoading(false);
        }
    }, [tokenAddress, tokenData]);

    useEffect(() => {
        if (autoAnalyze && tokenAddress) {
            analyzeToken();
        }
    }, [autoAnalyze, tokenAddress, analyzeToken]);

    const getRiskColor = (score: number) => {
        if (score <= 3) return "text-green-400";
        if (score <= 6) return "text-yellow-400";
        return "text-red-400";
    };

    const getRiskBadge = (score: number) => {
        if (score <= 3) return { label: "Low Risk", className: "bg-green-500/20 text-green-400" };
        if (score <= 6) return { label: "Medium Risk", className: "bg-yellow-500/20 text-yellow-400" };
        return { label: "High Risk", className: "bg-red-500/20 text-red-400" };
    };

    const getSentimentIcon = (sentiment: string) => {
        switch (sentiment) {
            case "BULLISH":
                return <Icon icon="lucide:trending-up" className="w-4 h-4 text-green-400" />;
            case "BEARISH":
                return <Icon icon="lucide:trending-down" className="w-4 h-4 text-red-400" />;
            default:
                return <Icon icon="lucide:shield" className="w-4 h-4 text-gray-400" />;
        }
    };

    if (error) {
        return (
            <Card className="bg-red-500/10 border-red-500/20">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <Icon icon="lucide:alert-triangle" className="w-4 h-4" />
                            <span>{error}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={analyzeToken}
                            className="h-8 text-xs"
                        >
                            <Icon icon="lucide:refresh-cw" className="w-3 h-3 mr-1" />
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <AIGlowBorder isLoading={isLoading}>
            <Card className="bg-[#111] border-[#222] overflow-hidden relative z-10">
                <CardContent className="p-0">
                    {/* Header - Always visible */}
                    <button
                        onClick={() => analysis ? setIsExpanded(!isExpanded) : analyzeToken()}
                        className="w-full p-4 flex items-center justify-between hover:bg-[#161616] transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <Icon icon="lucide:sparkles" className="w-4 h-4 text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium text-white">AI Analysis</p>
                                <p className="text-xs text-gray-500">
                                    {analysis
                                        ? `Updated ${new Date(analysis.analyzedAt).toLocaleTimeString()}`
                                        : "Tap to analyze this token"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isLoading ? (
                                <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin text-primary" />
                            ) : analysis ? (
                                <>
                                    <Badge className={getRiskBadge(analysis.riskScore).className}>
                                        {getRiskBadge(analysis.riskScore).label}
                                    </Badge>
                                    {isExpanded ? (
                                        <Icon icon="lucide:chevron-up" className="w-4 h-4 text-gray-500" />
                                    ) : (
                                        <Icon icon="lucide:chevron-down" className="w-4 h-4 text-gray-500" />
                                    )}
                                </>
                            ) : null}
                        </div>
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                        {isExpanded && analysis && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="px-4 pb-4 space-y-4 border-t border-[#222]">
                                    {/* Risk & Sentiment */}
                                    <div className="flex items-center justify-between pt-4">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500">Risk Score</p>
                                                <p className={`text-lg font-bold ${getRiskColor(analysis.riskScore)}`}>
                                                    {analysis.riskScore}/10
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Sentiment</p>
                                                <div className="flex items-center gap-1">
                                                    {getSentimentIcon(analysis.sentiment)}
                                                    <span className="text-sm font-medium text-white">
                                                        {analysis.sentiment}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                analyzeToken();
                                            }}
                                            className="h-8"
                                        >
                                            <Icon icon="lucide:refresh-cw" className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                                        </Button>
                                    </div>

                                    {/* Summary */}
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Summary</p>
                                        <p className="text-sm text-gray-300">{analysis.summary}</p>
                                    </div>

                                    {/* Warnings */}
                                    {analysis.warnings && analysis.warnings.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-gray-500">Warnings</p>
                                            {analysis.warnings.map((warning, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-500/10 rounded-lg p-2"
                                                >
                                                    <Icon icon="lucide:alert-triangle" className="w-4 h-4 shrink-0 mt-0.5" />
                                                    <span>{warning}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Recommendation */}
                                    {analysis.recommendation && (
                                        <div className="bg-primary/10 rounded-lg p-3">
                                            <p className="text-xs text-primary mb-1">Recommendation</p>
                                            <p className="text-sm text-white">{analysis.recommendation}</p>
                                        </div>
                                    )}

                                    {/* Disclaimer */}
                                    <p className="text-[10px] text-gray-600 italic">
                                        This analysis is AI-generated and not financial advice. DYOR.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </AIGlowBorder>
    );
}
