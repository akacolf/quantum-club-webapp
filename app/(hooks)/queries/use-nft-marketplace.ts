import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { getPopularCollections, type NftCollection } from "@/lib/nft-marketplace";
import { getNftListings } from "@/app/wallet/nft/actions";

export function usePopularCollectionsQuery(isTestnet: boolean) {
    return useQuery<NftCollection[]>({
        queryKey: ["nft-popular-collections", isTestnet],
        queryFn: () => getPopularCollections(20, isTestnet),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

interface QCListing {
    id: string;
    nftAddress: string;
    nftName: string;
    nftImage?: string;
    collectionName?: string;
    collectionAddress?: string;
    sellerAddress: string;
    price: string;
    status: string;
    createdAt: string;
}

interface QCListingsPage {
    listings: QCListing[];
    nextCursor?: string;
}

export function useQCListingsQuery() {
    return useInfiniteQuery({
        queryKey: ["nft-qc-listings"],
        queryFn: async ({ pageParam }): Promise<QCListingsPage> => {
            const result = await getNftListings({
                lastDocId: pageParam,
            });
            if (!result?.data) return { listings: [], nextCursor: undefined };
            return {
                listings: (result.data.listings ?? []) as QCListing[],
                nextCursor: result.data.nextCursor,
            };
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 30_000, // 30 seconds
    });
}
