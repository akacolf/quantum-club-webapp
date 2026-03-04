import { useQuery } from "@tanstack/react-query";
import {
    STAKING_POOLS,
    fetchLiveApyData,
    type StakingPool,
} from "@/lib/staking-service";

export interface StakingPoolWithApy extends StakingPool {
    liveApy: number;
}

/**
 * TanStack Query hook that fetches live APY data for all staking pools.
 *
 * Returns pools enriched with `liveApy` values (falls back to static APY on
 * failure) and the single best APY across all pools.
 *
 * Used by:
 *  - wallet/page.tsx  (best APY card)
 *  - wallet/staking/page.tsx  (pool list + APY)
 */
export function useStakingApyQuery(enabled = true) {
    return useQuery<{ pools: StakingPoolWithApy[]; bestApy: number }>({
        queryKey: ["staking-apy"],
        queryFn: async () => {
            const apyData = await fetchLiveApyData();
            const pools: StakingPoolWithApy[] = STAKING_POOLS.map((p) => ({
                ...p,
                liveApy: apyData.get(p.id) || p.apy,
            }));
            const apyValues = pools.map((p) => p.liveApy);
            const bestApy =
                apyValues.length > 0 ? Math.max(...apyValues) : 5.0;
            return { pools, bestApy };
        },
        enabled,
        staleTime: 60_000, // 1 minute
    });
}
