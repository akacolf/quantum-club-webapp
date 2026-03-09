import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { fetchLiveApyData } from "@/lib/staking-service";

interface YieldProtocol {
    id: string;
    name: string;
    icon: string;
    type: "staking" | "lp";
    apy: number;
    tvl: string;
    asset: string;
    description: string;
    route: Route;
    minAmount?: string;
    riskLevel: "low" | "medium" | "high";
}

const YIELD_PROTOCOLS: YieldProtocol[] = [
    {
        id: "ton-staking",
        name: "TON Staking",
        icon: "/svg/ton-logo.svg",
        type: "staking",
        apy: 5.0,
        tvl: "$500M+",
        asset: "TON",
        description:
            "Stake TON and receive liquid staking tokens (tsTON, stTON, hTON)",
        route: "/wallet/staking",
        minAmount: "0.5 TON",
        riskLevel: "low",
    },
    {
        id: "liquidity-provision",
        name: "Liquidity Pools",
        icon: "/png/stonfi-logo.png",
        type: "lp",
        apy: 12.0,
        tvl: "$50M+",
        asset: "TON/USDT",
        description:
            "Provide liquidity to DEX pools and earn trading fees",
        route: "/wallet/liquidity",
        minAmount: "1 TON",
        riskLevel: "medium",
    },
    {
        id: "lp-farming",
        name: "LP Farming",
        icon: "/png/stonfi-logo.png",
        type: "lp",
        apy: 25.0,
        tvl: "$20M+",
        asset: "LP Tokens",
        description:
            "Stake LP tokens in farms to earn additional STON rewards",
        route: "/wallet/farming",
        minAmount: "Any LP",
        riskLevel: "medium",
    },
];

/**
 * TanStack Query hook that fetches live APY data and enriches yield protocols.
 *
 * Returns protocols with live staking APY (falls back to static defaults on
 * failure). APY data refreshes every 5 minutes since it changes infrequently.
 */
export function useYieldProtocolsQuery() {
    return useQuery<YieldProtocol[]>({
        queryKey: ["yield-protocols"],
        queryFn: async () => {
            const liveApyData = await fetchLiveApyData();

            // Calculate average staking APY from live data
            let stakingApy = 5.0; // Default
            if (liveApyData.size > 0) {
                const apyValues = Array.from(liveApyData.values());
                stakingApy =
                    apyValues.reduce((a, b) => a + b, 0) / apyValues.length;
            }

            return YIELD_PROTOCOLS.map((p) => {
                if (p.id === "ton-staking") {
                    return { ...p, apy: parseFloat(stakingApy.toFixed(2)) };
                }
                return p;
            });
        },
        staleTime: 5 * 60_000, // 5 minutes - APY data doesn't change often
    });
}

export { YIELD_PROTOCOLS, type YieldProtocol };
