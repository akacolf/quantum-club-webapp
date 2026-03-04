import { useQuery } from "@tanstack/react-query";

interface Asset {
    symbol: string;
    value: number;
    percentage: number;
}

async function fetchPortfolioHealth(
    assets: Asset[],
    totalValue: number,
    stakedAmount: number,
) {
    const { analyzePortfolioHealth } = await import(
        "@/components/ai/actions"
    );
    const result = await analyzePortfolioHealth({
        assets: assets.map((a) => ({
            symbol: a.symbol,
            balance: String(a.value),
            value: a.value,
        })),
        totalValue,
        stakedAmount,
    });
    if (result?.serverError) throw new Error(result.serverError);
    if (!result?.data?.success || !result.data.analysis)
        throw new Error("Analysis failed");
    return result.data.analysis;
}

export function usePortfolioHealthQuery(
    assets: Asset[],
    totalValue: number,
    stakedAmount: number,
    enabled = false,
) {
    return useQuery({
        queryKey: ["portfolio-health", assets.length, totalValue, stakedAmount],
        queryFn: () => fetchPortfolioHealth(assets, totalValue, stakedAmount),
        enabled: enabled && assets.length > 0,
        staleTime: 5 * 60_000,
    });
}
