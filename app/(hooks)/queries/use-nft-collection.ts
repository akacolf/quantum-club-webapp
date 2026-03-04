import { useQuery } from "@tanstack/react-query";
import {
    getCollectionDetails,
    getCollectionItems,
    type NftCollection,
    type NftItem,
} from "@/lib/nft-marketplace";

export function useNftCollectionQuery(address: string, isTestnet: boolean) {
    return useQuery<NftCollection | null>({
        queryKey: ["nft-collection", address, isTestnet],
        queryFn: () => getCollectionDetails(address, isTestnet),
        enabled: !!address,
        staleTime: 60_000,
    });
}

export function useNftCollectionItemsQuery(address: string, isTestnet: boolean) {
    return useQuery<NftItem[]>({
        queryKey: ["nft-collection-items", address, isTestnet],
        queryFn: async () => {
            const data = await getCollectionItems(address, 100, 0, isTestnet);
            // Only show items that are for sale
            return data.filter(item => item.sale !== null);
        },
        enabled: !!address,
        staleTime: 60_000,
    });
}
