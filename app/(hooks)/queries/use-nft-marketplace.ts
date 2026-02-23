import { useQuery } from "@tanstack/react-query";
import { getPopularCollections, type NftCollection } from "@/lib/nft-marketplace";

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

export function useQCListingsQuery() {
    return useQuery<QCListing[]>({
        queryKey: ["nft-qc-listings"],
        queryFn: async () => {
            const response = await fetch("/api/nft-marketplace", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "get-listings" }),
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.listings ?? [];
        },
        staleTime: 30_000, // 30 seconds
    });
}
