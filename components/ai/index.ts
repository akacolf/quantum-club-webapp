// QC AI Components for Wallet Integration
// Export all AI-powered components for easy importing

export { TokenAnalysisCard } from "./TokenAnalysisCard";
export { PortfolioHealthCard } from "./PortfolioHealthCard";
export { TransactionExplainer } from "./TransactionExplainer";

// Types
export interface TokenAnalysis {
    riskScore: number;
    sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
    summary: string;
    warnings: string[];
    recommendation?: string;
    analyzedAt: string;
}

export interface PortfolioAnalysis {
    healthScore: number;
    diversification: "GOOD" | "MODERATE" | "POOR";
    risks: string[];
    opportunities: string[];
    summary: string;
    recommendation?: string;
    analyzedAt: string;
}

export interface TransactionExplanation {
    type: string;
    summary: string;
    participants?: { from: string; to: string };
    amount?: string;
    fee?: string;
    explainedAt: string;
}
