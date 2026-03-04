import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fromNano } from "@ton/core";

interface WalletAssetsData {
    tonBalance: string;
    tonPrice: number;
    tonUsdValue: string;
    totalUsdBalance: string;
    walletStatus: string;
    jettons: {
        symbol: string;
        name: string;
        balance: string;
        decimals: number;
        image?: string;
        usdValue?: number;
        priceUsd?: number;
        jettonAddress?: string;
        walletAddress?: string;
    }[];
}

async function fetchWalletAssetsData(
    walletAddress: string,
    isTestnet: boolean
): Promise<WalletAssetsData> {
    // Fetch price
    let tonPrice = 0;
    if (isTestnet) {
        tonPrice = 5.0;
    } else {
        const { fetchTonPrice } = await import("@/lib/price-api");
        tonPrice = await fetchTonPrice();
    }

    // Fetch balance
    let tonBalance = "0";
    let walletStatus = "nonexist";
    let tonUsd = 0;
    try {
        const { getAccount } = await import("@/lib/tonapi-client");
        const balanceData = await getAccount(walletAddress, { testnet: isTestnet }) as { balance?: string; status?: string };
        tonBalance = parseFloat(fromNano(balanceData.balance || "0")).toFixed(4);
        walletStatus = balanceData.status || "nonexist";
        tonUsd = parseFloat(tonBalance) * tonPrice;
    } catch (err) {
        console.error("Failed to fetch balance via TonAPI:", err);
    }

    // Fetch jettons
    let jettonsUsdTotal = 0;
    let jettons: WalletAssetsData["jettons"] = [];
    try {
        const { getAccountJettons } = await import("@/lib/tonapi-client");
        const jettonsData = await getAccountJettons(walletAddress, { testnet: isTestnet }) as { balances?: Record<string, unknown>[] };
        jettons = (jettonsData.balances || []).map((jetton: Record<string, unknown>) => {
            const j = jetton.jetton as Record<string, unknown> | undefined;
            const price = jetton.price as Record<string, unknown> | undefined;
            const prices = price?.prices as Record<string, number> | undefined;
            const decimals = (j?.decimals as number) || 9;
            const rawBalance = parseFloat((jetton.balance as string) || "0");
            const actualBalance = rawBalance / Math.pow(10, decimals);
            const priceUsd = prices?.USD || 0;
            const usdValue = actualBalance * priceUsd;
            jettonsUsdTotal += usdValue;
            return {
                symbol: (j?.symbol as string) || "Unknown",
                name: (j?.name as string) || "Unknown Token",
                balance: (jetton.balance as string) || "0",
                decimals,
                image: j?.image as string | undefined,
                usdValue,
                priceUsd,
                jettonAddress: (j?.address as string) || undefined,
                walletAddress: (jetton.wallet_address as { address?: string })?.address,
            };
        });
    } catch (err) {
        console.error("Failed to fetch jettons:", err);
    }

    return {
        tonBalance,
        tonPrice,
        tonUsdValue: tonUsd.toFixed(2),
        totalUsdBalance: (tonUsd + jettonsUsdTotal).toFixed(2),
        walletStatus,
        jettons,
    };
}

/**
 * Query hook for wallet assets (TON balance + jettons).
 * Auto-refetches based on the provided interval.
 */
export function useWalletAssetsQuery(
    walletAddress: string,
    isTestnet: boolean,
    refetchIntervalMs: number | false = 60_000
) {
    return useQuery<WalletAssetsData>({
        queryKey: ["walletAssets", walletAddress, isTestnet],
        queryFn: () => fetchWalletAssetsData(walletAddress, isTestnet),
        enabled: !!walletAddress,
        staleTime: 30_000,
        refetchInterval: refetchIntervalMs,
        refetchIntervalInBackground: false,
    });
}

/**
 * Query hook for NFTs.
 */
export function useNftsQuery(walletAddress: string, isTestnet: boolean) {
    return useQuery({
        queryKey: ["nfts", walletAddress, isTestnet],
        queryFn: async () => {
            const { getAccountNfts } = await import("@/lib/tonapi-client");
            const data = await getAccountNfts(walletAddress, { testnet: isTestnet }) as { nft_items?: Record<string, unknown>[] };
            return (data.nft_items || []).map((nft: Record<string, unknown>) => {
                const metadata = nft.metadata as Record<string, string> | undefined;
                const coll = nft.collection as Record<string, string> | undefined;
                const previews = nft.previews as { resolution: string; url: string }[] | undefined;
                const preview =
                    previews?.find((p) => p.resolution === "500x500") ||
                    previews?.find((p) => p.resolution === "100x100") ||
                    previews?.[0];
                return {
                    address: nft.address as string,
                    name: metadata?.name || "Unnamed NFT",
                    description: metadata?.description,
                    image: preview?.url || metadata?.image,
                    collectionName: coll?.name,
                    collectionAddress: coll?.address,
                };
            });
        },
        enabled: !!walletAddress,
        staleTime: 60_000,
    });
}

/**
 * Query hook for multi-chain balances.
 */
export function useMultiChainBalancesQuery(
    addresses: { eth: string; btc: string; sol: string; trx: string },
    enabled: boolean
) {
    return useQuery({
        queryKey: ["multiChainBalances", addresses.eth, addresses.btc, addresses.sol, addresses.trx],
        queryFn: async () => {
            const { fetchAllMultiChainBalances } = await import("@/app/wallet/utils/multichain");
            return fetchAllMultiChainBalances(
                addresses.eth,
                addresses.btc,
                addresses.sol,
                addresses.trx,
                false
            );
        },
        enabled: enabled && !!addresses.eth && !!addresses.btc && !!addresses.sol && !!addresses.trx,
        staleTime: 60_000,
        refetchInterval: 60_000,
        refetchIntervalInBackground: false,
    });
}

/**
 * Returns a function to invalidate wallet queries, useful after transactions.
 */
export function useInvalidateWalletQueries() {
    const queryClient = useQueryClient();
    return (walletAddress: string) => {
        queryClient.invalidateQueries({ queryKey: ["walletAssets", walletAddress] });
        queryClient.invalidateQueries({ queryKey: ["nfts", walletAddress] });
        queryClient.invalidateQueries({ queryKey: ["multiChainBalances"] });
    };
}
