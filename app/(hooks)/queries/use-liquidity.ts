import { useQuery } from "@tanstack/react-query";
import { fetchSwappableAssets, type SwapAsset } from "@/lib/stonfi";
import { StonApiClient } from "@ston-fi/api";

interface PoolInfo {
    address: string;
    reserve0: string;
    reserve1: string;
    token0Address: string;
    token1Address: string;
    lpTotalSupply: string;
    lpFee: string;
    protocolFee: string;
    apy?: number;
    tvl?: string;
}

export interface LPPosition {
    poolAddress: string;
    lpBalance: string;
    token0: SwapAsset | null;
    token1: SwapAsset | null;
    token0Amount: string;
    token1Amount: string;
    sharePercent: string;
    poolInfo: PoolInfo | null;
}

export function useSwapAssetsQuery() {
    return useQuery<SwapAsset[]>({
        queryKey: ["swappable-assets"],
        queryFn: () => fetchSwappableAssets(),
        staleTime: 5 * 60_000,
    });
}

async function fetchLPPositions(walletAddress: string, swapAssets: SwapAsset[]): Promise<LPPosition[]> {
    const client = new StonApiClient();
    const walletPools = await client.getWalletPools({ walletAddress, dexV2: true });

    const poolsWithBalance = walletPools.filter(
        (pool) => pool.lpBalance && BigInt(pool.lpBalance) > 0,
    );

    // Collect unique token addresses
    const tokenAddresses = new Set<string>();
    poolsWithBalance.forEach((pool) => {
        tokenAddresses.add(pool.token0Address);
        tokenAddresses.add(pool.token1Address);
    });

    // Build asset map from local assets
    const assetMap = new Map<string, SwapAsset>();
    swapAssets.forEach((asset) => assetMap.set(asset.contractAddress, asset));

    // Fetch missing assets from API
    for (const addr of tokenAddresses) {
        if (!assetMap.has(addr)) {
            try {
                const assetInfo = await client.getAsset(addr);
                if (assetInfo) {
                    assetMap.set(addr, {
                        contractAddress: assetInfo.contractAddress,
                        kind: assetInfo.kind === "Ton" ? "Ton" : "Jetton",
                        symbol: assetInfo.symbol || "???",
                        displayName: assetInfo.displayName || assetInfo.symbol || "Unknown",
                        imageUrl: assetInfo.imageUrl,
                        decimals: assetInfo.decimals ?? 9,
                    });
                }
            } catch (e) {
                console.warn(`Failed to fetch asset ${addr}:`, e);
            }
        }
    }

    return poolsWithBalance.map((pool) => {
        const token0Asset = assetMap.get(pool.token0Address);
        const token1Asset = assetMap.get(pool.token1Address);

        const lpBalance = BigInt(pool.lpBalance || "0");
        const lpSupply = BigInt(pool.lpTotalSupply || "1");
        const sharePercent = lpSupply > 0
            ? ((Number(lpBalance) / Number(lpSupply)) * 100).toFixed(4)
            : "0";

        const reserve0 = BigInt(pool.reserve0 || "0");
        const reserve1 = BigInt(pool.reserve1 || "0");
        const token0Decimals = token0Asset?.decimals || 9;
        const token1Decimals = token1Asset?.decimals || 9;
        const token0Amount = lpSupply > 0
            ? ((Number(reserve0) * Number(lpBalance)) / Number(lpSupply) / Math.pow(10, token0Decimals)).toFixed(4)
            : "0";
        const token1Amount = lpSupply > 0
            ? ((Number(reserve1) * Number(lpBalance)) / Number(lpSupply) / Math.pow(10, token1Decimals)).toFixed(4)
            : "0";

        const token0Symbol = token0Asset?.symbol || "Token A";
        const token1Symbol = token1Asset?.symbol || "Token B";

        return {
            poolAddress: pool.address,
            lpBalance: pool.lpBalance || "0",
            token0: token0Asset || {
                contractAddress: pool.token0Address,
                kind: "Jetton" as const,
                symbol: token0Symbol,
                displayName: token0Symbol,
                decimals: 9,
            },
            token1: token1Asset || {
                contractAddress: pool.token1Address,
                kind: "Jetton" as const,
                symbol: token1Symbol,
                displayName: token1Symbol,
                decimals: 9,
            },
            token0Amount,
            token1Amount,
            sharePercent,
            poolInfo: {
                address: pool.address,
                reserve0: pool.reserve0,
                reserve1: pool.reserve1,
                token0Address: pool.token0Address,
                token1Address: pool.token1Address,
                lpTotalSupply: pool.lpTotalSupply,
                lpFee: pool.lpFee || "0.3",
                protocolFee: pool.protocolFee || "0",
                apy: parseFloat(pool.apy7D || pool.apy1D || "0"),
                tvl: pool.lpTotalSupplyUsd,
            },
        };
    });
}

export function useLPPositionsQuery(walletAddress: string | null | undefined, swapAssets: SwapAsset[] | undefined) {
    return useQuery<LPPosition[]>({
        queryKey: ["lp-positions", walletAddress],
        queryFn: () => fetchLPPositions(walletAddress!, swapAssets || []),
        enabled: !!walletAddress && !!swapAssets && swapAssets.length > 0,
        staleTime: 60_000,
    });
}
