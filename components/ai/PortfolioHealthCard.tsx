"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    Heart,
    AlertTriangle,
    TrendingUp,
    Loader2,
    RefreshCw,
    ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface PortfolioAnalysis {
    healthScore: number;
    diversification: "GOOD" | "MODERATE" | "POOR";
    risks: string[];
    opportunities: string[];
    summary: string;
    recommendation?: string;
    analyzedAt: string;
}

interface Asset {
    symbol: string;
    value: number;
    percentage: number;
}

interface PortfolioHealthCardProps {
    assets: Asset[];
    totalValue: number;
    stakedAmount?: number;
    autoAnalyze?: boolean;
    compact?: boolean;
}

export function PortfolioHealthCard({
    assets,
    totalValue,
    stakedAmount = 0,
    autoAnalyze = false,
    compact = false,
}: PortfolioHealthCardProps) {
    const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyzePortfolio = useCallback(async () => {
        if (!assets || assets.length === 0) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/ai/portfolio-health", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assets, totalValue, stakedAmount }),
            });

            if (!response.ok) {
                throw new Error("Failed to analyze portfolio");
            }

            const data = await response.json();
            if (data.success && data.analysis) {
                setAnalysis(data.analysis);
            } else {
                throw new Error(data.error || "Analysis failed");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Analysis failed");
        } finally {
            setIsLoading(false);
        }
    }, [assets, totalValue, stakedAmount]);

    useEffect(() => {
        if (autoAnalyze && assets.length > 0) {
            analyzePortfolio();
        }
    }, [autoAnalyze, assets.length, analyzePortfolio]);

    const getHealthColor = (score: number) => {
        if (score >= 70) return "text-green-400";
        if (score >= 40) return "text-yellow-400";
        return "text-red-400";
    };

    const getHealthBg = (score: number) => {
        if (score >= 70) return "bg-green-500";
        if (score >= 40) return "bg-yellow-500";
        return "bg-red-500";
    };

    const getDiversificationBadge = (level: string) => {
        switch (level) {
            case "GOOD":
                return { color: "text-green-400", bg: "bg-green-500/20" };
            case "MODERATE":
                return { color: "text-yellow-400", bg: "bg-yellow-500/20" };
            default:
                return { color: "text-red-400", bg: "bg-red-500/20" };
        }
    };

    // Compact mode - just a button to trigger analysis
    if (compact && !analysis) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={analyzePortfolio}
                disabled={isLoading || assets.length === 0}
                className="gap-2"
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Sparkles className="w-4 h-4" />
                )}
                AI Health Check
            </Button>
        );
    }

    if (error) {
        return (
            <Card className="bg-red-500/10 border-red-500/20">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span>{error}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={analyzePortfolio}>
                            <RefreshCw className="w-3 h-3" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!analysis) {
        return (
            <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
                <CardContent className="p-4">
                    <button
                        onClick={analyzePortfolio}
                        disabled={isLoading || assets.length === 0}
                        className="w-full flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Heart className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-white">Portfolio Health</p>
                                <p className="text-xs text-gray-400">
                                    {assets.length === 0
                                        ? "Add assets to analyze"
                                        : "Tap for AI analysis"}
                                </p>
                            </div>
                        </div>
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                    </button>
                </CardContent>
            </Card>
        );
    }

    const divBadge = getDiversificationBadge(analysis.diversification);

    return (
        <Card className="bg-[#111] border-[#222] overflow-hidden">
            <CardContent className="p-4 space-y-4">
                {/* Header with Score */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                                <span className={`text-xl font-bold ${getHealthColor(analysis.healthScore)}`}>
                                    {analysis.healthScore}
                                </span>
                            </div>
                            <Progress
                                value={analysis.healthScore}
                                className="absolute inset-0 rounded-full"
                                // @ts-expect-error - custom indicator class
                                indicatorClassName={getHealthBg(analysis.healthScore)}
                            />
                        </div>
                        <div>
                            <p className="font-medium text-white">Portfolio Health</p>
                            <div className={`text-xs px-2 py-0.5 rounded-full ${divBadge.bg} ${divBadge.color} inline-block`}>
                                {analysis.diversification} Diversification
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={analyzePortfolio}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                </div>

                {/* Summary */}
                <p className="text-sm text-gray-300">{analysis.summary}</p>

                {/* Toggle Details */}
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-xs text-primary flex items-center gap-1"
                >
                    {showDetails ? "Hide details" : "Show details"}
                    <ChevronRight className={`w-3 h-3 transition-transform ${showDetails ? "rotate-90" : ""}`} />
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                    {showDetails && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-3 overflow-hidden"
                        >
                            {/* Risks */}
                            {analysis.risks.length > 0 && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">⚠️ Risks</p>
                                    <ul className="space-y-1">
                                        {analysis.risks.map((risk, i) => (
                                            <li key={i} className="text-xs text-yellow-400 flex items-start gap-2">
                                                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                                {risk}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Opportunities */}
                            {analysis.opportunities.length > 0 && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">💡 Opportunities</p>
                                    <ul className="space-y-1">
                                        {analysis.opportunities.map((opp, i) => (
                                            <li key={i} className="text-xs text-green-400 flex items-start gap-2">
                                                <TrendingUp className="w-3 h-3 shrink-0 mt-0.5" />
                                                {opp}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Recommendation */}
                            {analysis.recommendation && (
                                <div className="bg-primary/10 rounded-lg p-3">
                                    <p className="text-xs text-primary mb-1">Recommendation</p>
                                    <p className="text-sm text-white">{analysis.recommendation}</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Disclaimer */}
                <p className="text-[10px] text-gray-600 italic">
                    AI-generated analysis. Not financial advice.
                </p>
            </CardContent>
        </Card>
    );
}
