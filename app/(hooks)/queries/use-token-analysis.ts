import { useQuery } from "@tanstack/react-query";

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

async function fetchTokenAnalysis(tokenAddress: string, tokenData?: TokenData) {
    const { analyzeToken: analyzeTokenAction } = await import(
        "@/components/ai/actions"
    );
    const result = await analyzeTokenAction({ tokenAddress, tokenData });
    if (result?.serverError) throw new Error(result.serverError);
    if (!result?.data?.success || !result.data.analysis)
        throw new Error("Analysis failed");
    return result.data.analysis;
}

export function useTokenAnalysisQuery(
    tokenAddress: string,
    tokenData?: TokenData,
    enabled = false,
) {
    return useQuery({
        queryKey: ["token-analysis", tokenAddress],
        queryFn: () => fetchTokenAnalysis(tokenAddress, tokenData),
        enabled,
        staleTime: 5 * 60_000,
    });
}
