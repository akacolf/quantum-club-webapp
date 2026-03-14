import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fromNano } from "@ton/core";

interface TonApiTokenRate {
    prices?: Record<string, number>;
    diff_24h?: Record<string, string>;
    diff24h?: Record<string, string>;
}

interface TonApiRatesResponse {
    rates: Record<string, TonApiTokenRate>;
}

/** Parse TonAPI diff percentage strings like "-1.28%" or "+5.67%" to a number */
function parseDiffPercent(diff: string | undefined | null): number | null {
    if (!diff) return null;
    const num = parseFloat(diff.replace('%', ''));
    return isNaN(num) ? null : num;
}

function getDiff24h(rate: TonApiTokenRate | undefined): number | null {
    if (!rate) return null;
    return parseDiffPercent(rate.diff_24h?.USD ?? rate.diff24h?.USD);
}

interface WalletAssetsData {
    tonBalance: string;
    tonPrice: number;
    tonUsdValue: string;
    totalUsdBalance: string;
    walletStatus: string;
    change24h: number | null;
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
    // Fetch TON price from TonAPI
    let tonPrice = 0;
    let tonDiff24h: number | null = null;
    if (isTestnet) {
        tonPrice = 5.0;
    } else {
        try {
            const { tonApiGet } = await import("@/lib/tonapi-client");
            const ratesData = await tonApiGet<TonApiRatesResponse>(
                `/v2/rates?tokens=ton&currencies=usd`
            );
            // TonAPI returns the key as uppercase "TON"
            const tonRate = ratesData.rates?.TON ?? ratesData.rates?.ton;
            tonPrice = tonRate?.prices?.USD ?? 0;
            tonDiff24h = getDiff24h(tonRate);
        } catch {
            // Fallback to DeFiLlama
            const { fetchTonPrice } = await import("@/lib/price-api");
            tonPrice = await fetchTonPrice();
        }
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
            const priceUsd = prices
                ? (prices.USD ?? prices.usd ?? prices.Usd ?? Object.entries(prices).find(([k]) => k.toLowerCase() === "usd")?.[1] ?? 0)
                : 0;
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

    // Compute weighted portfolio 24h change using TonAPI diff data
    let change24h: number | null = null;
    if (!isTestnet) {
        const totalValue = tonUsd + jettonsUsdTotal;
        if (totalValue > 0) {
            try {
                // Fetch diff_24h for jettons that have meaningful USD value
                const valuedJettons = jettons.filter(j => j.jettonAddress && (j.usdValue ?? 0) > 0.01);
                const jettonDiffs: Record<string, number | null> = {};

                if (valuedJettons.length > 0) {
                    const { tonApiGet } = await import("@/lib/tonapi-client");
                    const jettonAddrs = valuedJettons.map(j => j.jettonAddress!);
                    const ratesData = await tonApiGet<TonApiRatesResponse>(
                        `/v2/rates?tokens=${jettonAddrs.join(',')}&currencies=usd`
                    );
                    for (const jetton of valuedJettons) {
                        const addr = jetton.jettonAddress!;
                        jettonDiffs[addr] = getDiff24h(ratesData.rates?.[addr]);
                    }
                }

                // Reconstruct yesterday's portfolio value from per-asset 24h diffs
                let totalValueYesterday = 0;

                // TON contribution
                if (tonUsd > 0 && tonDiff24h !== null) {
                    const divisor = 1 + tonDiff24h / 100;
                    totalValueYesterday += divisor > 0 ? tonUsd / divisor : tonUsd;
                } else {
                    totalValueYesterday += tonUsd;
                }

                // Jetton contributions
                for (const jetton of jettons) {
                    const usdVal = jetton.usdValue ?? 0;
                    if (usdVal <= 0) continue;
                    const diff = jetton.jettonAddress ? (jettonDiffs[jetton.jettonAddress] ?? null) : null;
                    if (diff !== null) {
                        const divisor = 1 + diff / 100;
                        totalValueYesterday += divisor > 0 ? usdVal / divisor : usdVal;
                    } else {
                        totalValueYesterday += usdVal;
                    }
                }

                if (totalValueYesterday > 0) {
                    change24h = ((totalValue / totalValueYesterday) - 1) * 100;
                }
            } catch {
                // Failed to fetch diffs, change24h stays null
            }
        }
    }

    return {
        tonBalance,
        tonPrice,
        tonUsdValue: tonUsd.toFixed(2),
        totalUsdBalance: (tonUsd + jettonsUsdTotal).toFixed(2),
        walletStatus,
        change24h,
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
        queryClient.invalidateQueries({ queryKey: ["wallet-history"] });
        queryClient.invalidateQueries({ queryKey: ["qntm-history"] });
    };
}
