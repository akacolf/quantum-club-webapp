"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIGlowBorder } from "./AIGlow";
import { useTokenAnalysisQuery } from "@/app/(hooks)/queries/use-token-analysis";

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
    const [manualEnabled, setManualEnabled] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const { data: rawAnalysis, isLoading, error: queryError, refetch } = useTokenAnalysisQuery(
        tokenAddress,
        tokenData,
        autoAnalyze || manualEnabled,
    );
    const analysis = rawAnalysis as TokenAnalysis | undefined;
    const error = queryError?.message ?? null;

    // Auto-expand when analysis arrives; user can toggle collapse
    const isExpanded = !!analysis && !isCollapsed;

    function runAnalysis() {
        if (!tokenAddress) return;
        if (analysis) { refetch(); } else { setManualEnabled(true); }
    }

    const toggleAnalysis = () => {
        if (analysis) setIsCollapsed(!isCollapsed);
        else runAnalysis();
    };

    const getRiskColor = (score: number) => {
        if (score <= 3) return "text-green-400";
        if (score <= 6) return "text-yellow-400";
        return "text-red-400";
    };

    const getRiskLabel = (score: number) => {
        if (score <= 3) return "Low risk";
        if (score <= 6) return "Medium risk";
        return "High risk";
    };

    const formatSentiment = (sentiment: string) => {
        const lower = sentiment.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    };

    const getSentimentIcon = (sentiment: string) => {
        switch (sentiment) {
            case "BULLISH":
                return <Icon icon="lucide:trending-up" className="w-4 h-4 text-green-400" />;
            case "BEARISH":
                return <Icon icon="lucide:trending-down" className="w-4 h-4 text-red-400" />;
            default:
                return <Icon icon="lucide:shield" className="w-4 h-4 text-neutral-400" />;
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
                            onClick={runAnalysis}
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
            <Card className="bg-[#111] border-0 overflow-hidden relative z-10">
                <CardContent className="p-0">
                    {/* Header - Always visible */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={toggleAnalysis}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleAnalysis();
                            }
                        }}
                        className="w-full p-4 flex items-center justify-between hover:bg-[#161616] transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <Icon icon="iconoir:spark" className="w-5 h-5 text-primary" />
                            <div className="text-left">
                                <p className="text-sm font-medium text-white">AI analysis</p>
                                <p className="text-xs text-neutral-500">
                                    {analysis
                                        ? `Updated at ${new Date(analysis.analyzedAt).toLocaleTimeString()}`
                                        : "Tap to analyze this token"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isLoading ? (
                                <span className="flex h-6 w-16 items-center justify-end text-primary">
                                    <ButtonLoader size="sm" />
                                </span>
                            ) : analysis ? (
                                <>
                                    <span className={`text-xs font-semibold ${getRiskColor(analysis.riskScore)}`}>
                                        {getRiskLabel(analysis.riskScore)}
                                    </span>
                                    {isExpanded ? (
                                        <Icon icon="lucide:chevron-up" className="w-4 h-4 text-neutral-500" />
                                    ) : (
                                        <Icon icon="lucide:chevron-down" className="w-4 h-4 text-neutral-500" />
                                    )}
                                </>
                            ) : null}
                        </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                        {isExpanded && analysis && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="px-4 pb-4 space-y-4 border-t border-white/5">
                                    {/* Risk & Sentiment */}
                                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 pt-4">
                                        <div className="grid grid-cols-2 items-end gap-4">
                                            <div className="min-w-0">
                                                <p className="text-xs text-neutral-500">Risk score</p>
                                                <p className={`text-lg font-bold ${getRiskColor(analysis.riskScore)}`}>
                                                    {analysis.riskScore}/10
                                                </p>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-neutral-500">Sentiment</p>
                                                <div className="flex h-7 items-center gap-1">
                                                    {getSentimentIcon(analysis.sentiment)}
                                                    <span className="text-sm font-medium text-white">
                                                        {formatSentiment(analysis.sentiment)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                runAnalysis();
                                            }}
                                            className="h-8"
                                        >
                                            <Icon icon="lucide:refresh-cw" className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                                        </Button>
                                    </div>

                                    {/* Summary */}
                                    <div>
                                        <p className="text-xs text-neutral-500 mb-1">Summary</p>
                                        <p className="text-sm text-neutral-300">{analysis.summary}</p>
                                    </div>

                                    {/* Warnings */}
                                    {analysis.warnings && analysis.warnings.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-neutral-500">Warnings</p>
                                            {analysis.warnings.map((warning, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-start gap-2 text-sm text-yellow-400"
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
                                    <p className="text-[10px] text-neutral-600 italic">
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
