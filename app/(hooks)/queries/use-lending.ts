import { useQuery } from "@tanstack/react-query";
import {
    fetchLendingMarkets,
    fetchUserPositions,
    type LendingAsset,
    type UserLendingData,
} from "@/lib/evaa-service";

/**
 * TanStack Query hook that fetches lending market data and user positions.
 *
 * Fetches markets unconditionally and user positions when a wallet address is
 * provided. Both requests run in parallel via Promise.all.
 *
 * Used by:
 *  - wallet/lending/page.tsx
 */
export function useLendingDataQuery(walletAddress: string | null | undefined) {
    return useQuery<{ markets: LendingAsset[]; userPositions: UserLendingData | null }>({
        queryKey: ["lending", walletAddress],
        queryFn: async () => {
            const [markets, userPositions] = await Promise.all([
                fetchLendingMarkets(),
                walletAddress
                    ? fetchUserPositions(walletAddress).catch(() => null)
                    : Promise.resolve(null),
            ]);
            return { markets, userPositions };
        },
        staleTime: 60_000,
    });
}
