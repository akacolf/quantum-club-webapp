import { useQuery } from "@tanstack/react-query";
import { fetchMarketPulse, type MarketPulseData } from "@/app/home/actions";

export function useMarketPulse() {
  return useQuery<MarketPulseData>({
    queryKey: ["market-pulse"],
    queryFn: async () => {
      const result = await fetchMarketPulse();
      if (result?.serverError) throw new Error(result.serverError);
      if (!result?.data) throw new Error("Failed to fetch market pulse");
      return result.data;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
