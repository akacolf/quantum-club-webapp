"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../WalletContext";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Native yield protocols (all accessible in-app)
interface YieldProtocol {
    id: string;
    name: string;
    icon: string;
    type: "staking" | "lp";
    apy: number;
    tvl: string;
    asset: string;
    description: string;
    route: string;
    minAmount?: string;
    riskLevel: "low" | "medium" | "high";
}

// Only native protocols that work within our app
const YIELD_PROTOCOLS: YieldProtocol[] = [
    {
        id: "ton-staking",
        name: "TON Staking",
        icon: "/svg/ton-logo.svg",
        type: "staking",
        apy: 5.0,
        tvl: "$500M+",
        asset: "TON",
        description: "Stake TON and receive liquid staking tokens (tsTON, stTON, hTON)",
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
        description: "Provide liquidity to DEX pools and earn trading fees",
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
        description: "Stake LP tokens in farms to earn additional STON rewards",
        route: "/wallet/farming",
        minAmount: "Any LP",
        riskLevel: "medium",
    },
];

// Risk level colors
const RISK_COLORS = {
    low: { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/20" },
    medium: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/20" },
    high: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/20" },
};

const TYPE_ICONS: Record<string, string> = {
    staking: "lucide:shield",
    lp: "lucide:droplets",
};

export default function EarnPage() {
    useTelegramBackButton("/wallet");
    const router = useRouter();
    const { tonBalance, tonPrice } = useWallet();
    
    const [isLoading, setIsLoading] = useState(true);
    const [protocols, setProtocols] = useState<YieldProtocol[]>([]);

    // Fetch live APY data
    const fetchYieldData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch live staking APY for the staking protocol
            const { fetchLiveApyData } = await import("@/lib/staking-service");
            const liveApyData = await fetchLiveApyData();
            
            // Calculate average staking APY from live data
            let stakingApy = 5.0; // Default
            if (liveApyData.size > 0) {
                const apyValues = Array.from(liveApyData.values());
                stakingApy = apyValues.reduce((a, b) => a + b, 0) / apyValues.length;
            }
            
            // Update protocols with live data
            const updatedProtocols = YIELD_PROTOCOLS.map(p => {
                if (p.id === "ton-staking") {
                    return { ...p, apy: parseFloat(stakingApy.toFixed(2)) };
                }
                return p;
            });
            setProtocols(updatedProtocols);
        } catch (error) {
            console.error("Failed to fetch yield data:", error);
            setProtocols(YIELD_PROTOCOLS);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchYieldData();
    }, [fetchYieldData]);

    // Calculate potential earnings
    const calculateMonthlyEarnings = (apy: number, amount: number) => {
        const monthlyRate = apy / 100 / 12;
        return amount * monthlyRate;
    };

    const tonBalanceNum = parseFloat(tonBalance) || 0;
    const tonValueUsd = tonBalanceNum * tonPrice;

    // Best APY right now
    const bestApy = protocols.length > 0 
        ? Math.max(...protocols.map(p => p.apy)) 
        : 0;

    return (
        <div className="flex flex-col min-h-screen bg-black pb-28">
            <div className="px-4 pt-2 pb-4 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold text-white">Earn</h1>
                        <p className="text-sm text-gray-500">
                            Grow your TON with DeFi
                        </p>
                    </div>
                    <button
                        onClick={fetchYieldData}
                        disabled={isLoading}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:bg-white/10"
                    >
                        <Icon icon="lucide:refresh-cw" className={`w-5 h-5 text-gray-400 ${isLoading ? "animate-spin" : ""}`}/>
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-[#111] border border-[#222]">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon icon="lucide:trending-up" className="w-4 h-4 text-green-500"/>
                            <span className="text-xs text-gray-500">Best APY</span>
                        </div>
                        <p className="text-2xl font-bold text-green-500">
                            {bestApy.toFixed(1)}%
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#111] border border-[#222]">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon icon="lucide:coins" className="w-4 h-4 text-gray-400"/>
                            <span className="text-xs text-gray-500">Your Balance</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {tonBalanceNum.toFixed(2)} TON
                        </p>
                        <p className="text-xs text-gray-500">${tonValueUsd.toFixed(2)}</p>
                    </div>
                </div>

                {/* Potential Earnings Calculator */}
                {tonBalanceNum > 0 && bestApy > 0 && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-green-500/10 border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon icon="lucide:sparkles" className="w-4 h-4 text-primary"/>
                            <span className="text-sm font-medium text-white">Potential Earnings</span>
                        </div>
                        <p className="text-sm text-gray-400">
                            At {bestApy.toFixed(1)}% APY, your {tonBalanceNum.toFixed(2)} TON could earn:
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                            <div>
                                <p className="text-lg font-semibold text-white">
                                    ~{calculateMonthlyEarnings(bestApy, tonBalanceNum).toFixed(3)} TON
                                </p>
                                <p className="text-xs text-gray-500">per month</p>
                            </div>
                            <div className="text-gray-700">|</div>
                            <div>
                                <p className="text-lg font-semibold text-white">
                                    ~{(tonBalanceNum * bestApy / 100).toFixed(3)} TON
                                </p>
                                <p className="text-xs text-gray-500">per year</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Access Cards */}
                <div className="space-y-3">
                    <h2 className="text-base font-semibold text-white">Earning Options</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push("/wallet/staking")}
                            className="p-4 rounded-xl bg-gradient-to-br from-[#111] to-primary/10 border border-primary/20 text-left"
                        >
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                                <Icon icon="lucide:circle-dollar-sign" className="w-5 h-5 text-primary"/>
                            </div>
                            <h3 className="font-semibold text-white mb-1">Stake TON</h3>
                            <p className="text-xs text-gray-500">~5% APY · Low Risk</p>
                            <div className="flex items-center gap-1 text-xs text-primary mt-2">
                                <span>Stake Now</span>
                                <Icon icon="lucide:arrow-right" className="w-3 h-3"/>
                            </div>
                        </motion.button>

                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push("/wallet/liquidity")}
                            className="p-4 rounded-xl bg-gradient-to-br from-[#111] to-blue-500/10 border border-blue-500/20 text-left"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                                <Icon icon="lucide:droplets" className="w-5 h-5 text-blue-500"/>
                            </div>
                            <h3 className="font-semibold text-white mb-1">Add Liquidity</h3>
                            <p className="text-xs text-gray-500">~12% APY · Med Risk</p>
                            <div className="flex items-center gap-1 text-xs text-blue-500 mt-2">
                                <span>Start</span>
                                <Icon icon="lucide:arrow-right" className="w-3 h-3"/>
                            </div>
                        </motion.button>
                    </div>
                </div>

                {/* Protocols List */}
                <div className="space-y-3">
                    <h2 className="text-base font-semibold text-white">
                        Available Protocols
                        <span className="text-gray-500 font-normal ml-2">({protocols.length})</span>
                    </h2>

                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <ButtonLoader size="lg" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {protocols.map((protocol) => {
                                const riskColors = RISK_COLORS[protocol.riskLevel];
                                const typeIcon = TYPE_ICONS[protocol.type];
                                
                                return (
                                    <motion.button
                                        key={protocol.id}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push(protocol.route)}
                                        className="w-full p-4 rounded-xl bg-[#111] border border-[#222] active:bg-[#161616] transition-colors text-left"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-white/10 overflow-hidden flex-shrink-0">
                                                <Image
                                                    src={protocol.icon}
                                                    alt={protocol.name}
                                                    width={48}
                                                    height={48}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-medium text-white">{protocol.name}</h3>
                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 whitespace-nowrap">
                                                        <Icon icon={typeIcon} className="w-3 h-3 mr-0.5" />
                                                        {protocol.type}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-500 mb-2 line-clamp-1">{protocol.description}</p>
                                                <div className="flex items-center gap-2 text-xs flex-wrap">
                                                    <span className={`px-2 py-0.5 rounded-full ${riskColors.bg} ${riskColors.text} border ${riskColors.border} whitespace-nowrap`}>
                                                        {protocol.riskLevel} risk
                                                    </span>
                                                    <span className="text-gray-500 whitespace-nowrap">TVL: {protocol.tvl}</span>
                                                    {protocol.minAmount && (
                                                        <span className="text-gray-500 whitespace-nowrap">Min: {protocol.minAmount}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-xl font-bold text-green-500">{protocol.apy.toFixed(1)}%</p>
                                                <p className="text-xs text-gray-500">APY</p>
                                                <Icon icon="lucide:arrow-right" className="w-4 h-4 text-primary mt-2 ml-auto"/>
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div className="p-4 rounded-xl bg-[#111] border border-[#222]">
                    <div className="flex gap-3">
                        <Icon icon="lucide:info" className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5"/>
                        <div>
                            <p className="text-sm font-medium text-gray-400">
                                Understanding DeFi Yields
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                APY (Annual Percentage Yield) is the estimated yearly return. Actual returns may vary based on market conditions and protocol performance.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <div className="flex items-center gap-1 text-[10px] text-gray-500 whitespace-nowrap">
                                    <Icon icon="lucide:check-circle" className="w-3 h-3 text-green-500"/>
                                    Low Risk = Staking
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-gray-500 whitespace-nowrap">
                                    <Icon icon="lucide:check-circle" className="w-3 h-3 text-yellow-500"/>
                                    Med Risk = Liquidity
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
