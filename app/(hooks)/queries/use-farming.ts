import { useQuery } from "@tanstack/react-query";
import {
    fetchFarmingPools,
    fetchUserFarmPositions,
} from "@/lib/farming-integration";

/**
 * TanStack Query hook that fetches farming pools and user positions in parallel.
 *
 * Used by:
 *  - wallet/farming/page.tsx
 */
export function useFarmingDataQuery(
    walletAddress: string | null | undefined,
) {
    return useQuery({
        queryKey: ["farming", walletAddress],
        queryFn: async () => {
            const [farms, positions] = await Promise.all([
                fetchFarmingPools(),
                walletAddress
                    ? fetchUserFarmPositions(walletAddress)
                    : Promise.resolve([]),
            ]);
            return { farms, positions };
        },
        staleTime: 60_000,
    });
}
