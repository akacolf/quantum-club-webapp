import { useQuery } from "@tanstack/react-query";
import { getNftDetails, type NftItem } from "@/lib/nft-marketplace";

/**
 * TanStack Query hook for fetching NFT details from the TON API.
 *
 * Used by:
 *  - wallet/send-nft/[address]/page.tsx
 *  - wallet/marketplace/buy/[address]/page.tsx
 */
export function useNftDetailsQuery(
    nftAddress: string | undefined,
    isTestnet: boolean | undefined,
) {
    return useQuery<NftItem | null>({
        queryKey: ["nft-details", nftAddress, isTestnet],
        queryFn: () => getNftDetails(nftAddress!, isTestnet ?? false),
        enabled: !!nftAddress && typeof isTestnet === "boolean",
        staleTime: 30_000, // 30 seconds
    });
}
