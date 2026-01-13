"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    TrendingUp,
    RefreshCw,
    Info,
    Sparkles,
    Shield,
    Coins,
    Droplets,
} from "lucide-react";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../WalletContext";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import Image from "next/image";

// Yield protocol data
interface YieldProtocol {
    id: string;
    name: string;
    icon: string;
    type: "staking" | "lending" | "lp" | "farming";
    apy: number;
    tvl: string;
    asset: string;
    assetIcon: string;
    description: string;
    url: string;
    minAmount?: string;
    riskLevel: "low" | "medium" | "high";
    isNative?: boolean;
}

// TON DeFi protocols with yield opportunities
const YIELD_PROTOCOLS: YieldProtocol[] = [
    {
        id: "tonstakers",
        name: "TON Stakers",
        icon: "/png/tonstakers-logo.jpg",
        type: "staking",
        apy: 4.8,
        tvl: "$127M",
        asset: "TON",
        assetIcon: "/svg/ton-logo.svg",
        description: "Liquid staking - get tsTON while earning",
        url: "https://tonstakers.com",
        minAmount: "1 TON",
        riskLevel: "low",
        isNative: true,
    },
    {
        id: "bemo",
        name: "Bemo",
        icon: "/svg/ton-logo.svg",
        type: "staking",
        apy: 5.1,
        tvl: "$89M",
        asset: "TON",
        assetIcon: "/svg/ton-logo.svg",
        description: "Liquid staking with stTON token",
        url: "https://bemo.finance",
        minAmount: "0.5 TON",
        riskLevel: "low",
        isNative: true,
    },
    {
        id: "evaa-ton",
        name: "EVAA Protocol",
        icon: "/png/evaa-logo.png",
        type: "lending",
        apy: 3.2,
        tvl: "$45M",
        asset: "TON",
        assetIcon: "/svg/ton-logo.svg",
        description: "Lend TON and earn interest",
        url: "https://evaa.finance",
        riskLevel: "medium",
    },
    {
        id: "evaa-usdt",
        name: "EVAA Protocol",
        icon: "/png/evaa-logo.png",
        type: "lending",
        apy: 8.5,
        tvl: "$23M",
        asset: "USDT",
        assetIcon: "/svg/ton-logo.svg",
        description: "Lend USDT and earn stable yields",
        url: "https://evaa.finance",
        riskLevel: "medium",
    },
    {
        id: "stonfi-ton-usdt",
        name: "STON.fi LP",
        icon: "/png/stonfi-logo.png",
        type: "lp",
        apy: 12.4,
        tvl: "$18M",
        asset: "TON/USDT",
        assetIcon: "/svg/ton-logo.svg",
        description: "Provide liquidity, earn trading fees",
        url: "https://app.ston.fi/pools",
        riskLevel: "medium",
    },
    {
        id: "dedust-ton-usdt",
        name: "DeDust LP",
        icon: "/png/dedust-logo.png",
        type: "lp",
        apy: 11.8,
        tvl: "$15M",
        asset: "TON/USDT",
        assetIcon: "/svg/ton-logo.svg",
        description: "Concentrated liquidity pools",
        url: "https://dedust.io/pools",
        riskLevel: "medium",
    },
    {
        id: "ston-farm",
        name: "STON.fi Farming",
        icon: "/png/stonfi-logo.png",
        type: "farming",
        apy: 28.5,
        tvl: "$8M",
        asset: "STON",
        assetIcon: "/svg/ton-logo.svg",
        description: "Stake LP tokens for STON rewards",
        url: "https://app.ston.fi/farms",
        riskLevel: "high",
    },
];

// Risk level colors and labels
const RISK_COLORS = {
    low: { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/20" },
    medium: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/20" },
    high: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/20" },
};

// Type icons
const TYPE_ICONS = {
    staking: Shield,
    lending: Coins,
    lp: Droplets,
    farming: Sparkles,
};

// Type colors
const TYPE_COLORS = {
    staking: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    lending: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    lp: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    farming: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function EarnPage() {
    useTelegramBackButton("/wallet");
    const { tonBalance, tonPrice } = useWallet();
    
    const [isLoading, setIsLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<string>("all");
    const [protocols, setProtocols] = useState<YieldProtocol[]>([]);

    // Simulate fetching live APY data
    const fetchYieldData = useCallback(async () => {
        setIsLoading(true);
        try {
            // In production, fetch live APY from APIs
            // For now, use static data with small random variations
            const updatedProtocols = YIELD_PROTOCOLS.map(p => ({
                ...p,
                apy: p.apy + (Math.random() - 0.5) * 0.5, // ±0.25% variation
            }));
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

    // Filter protocols by type
    const filteredProtocols = selectedType === "all" 
        ? protocols 
        : protocols.filter(p => p.type === selectedType);

    // Sort by APY (highest first)
    const sortedProtocols = [...filteredProtocols].sort((a, b) => b.apy - a.apy);

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

    const openProtocol = (url: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tgWebApp = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;
        if (tgWebApp?.openLink) {
            tgWebApp.openLink(url);
        } else {
            window.open(url, "_blank");
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-black pb-28">
            <div className="px-4 pt-2 pb-4 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold text-white">Earn</h1>
                        <p className="text-sm text-gray-500">
                            Find the best yields on TON
                        </p>
                    </div>
                    <button
                        onClick={fetchYieldData}
                        disabled={isLoading}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:bg-white/10"
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-400 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-gray-400">Best APY</span>
                        </div>
                        <p className="text-2xl font-bold text-green-500">
                            {bestApy.toFixed(1)}%
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Coins className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-400">Your Balance</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {tonBalanceNum.toFixed(2)} TON
                        </p>
                        <p className="text-xs text-gray-500">${tonValueUsd.toFixed(2)}</p>
                    </div>
                </div>

                {/* Potential Earnings Calculator */}
                {tonBalanceNum > 0 && bestApy > 0 && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
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
                            <div className="text-gray-600">|</div>
                            <div>
                                <p className="text-lg font-semibold text-white">
                                    ~{(tonBalanceNum * bestApy / 100).toFixed(3)} TON
                                </p>
                                <p className="text-xs text-gray-500">per year</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Type Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {[
                        { id: "all", name: "All", icon: TrendingUp },
                        { id: "staking", name: "Staking", icon: Shield },
                        { id: "lending", name: "Lending", icon: Coins },
                        { id: "lp", name: "LP", icon: Droplets },
                        { id: "farming", name: "Farming", icon: Sparkles },
                    ].map((type) => {
                        const Icon = type.icon;
                        const isActive = selectedType === type.id;
                        return (
                            <motion.button
                                key={type.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedType(type.id)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                                    isActive
                                        ? "bg-white text-black"
                                        : "bg-white/5 text-gray-400 active:bg-white/10 border border-white/10"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {type.name}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Protocols List */}
                <div className="space-y-3">
                    <h2 className="text-base font-semibold text-white">
                        {selectedType === "all" ? "All Opportunities" : selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
                        <span className="text-gray-500 font-normal ml-2">({sortedProtocols.length})</span>
                    </h2>

                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <ButtonLoader size="lg" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sortedProtocols.map((protocol) => {
                                const TypeIcon = TYPE_ICONS[protocol.type];
                                const riskColors = RISK_COLORS[protocol.riskLevel];
                                const typeColors = TYPE_COLORS[protocol.type];
                                
                                return (
                                    <motion.button
                                        key={protocol.id}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => openProtocol(protocol.url)}
                                        className="w-full p-4 rounded-xl bg-white/5 border border-white/10 active:bg-white/10 transition-colors text-left"
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
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${typeColors}`}>
                                                        <TypeIcon className="w-3 h-3 inline mr-0.5" />
                                                        {protocol.type}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 mb-2">{protocol.description}</p>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <span className={`px-2 py-0.5 rounded-full ${riskColors.bg} ${riskColors.text} border ${riskColors.border}`}>
                                                        {protocol.riskLevel} risk
                                                    </span>
                                                    <span className="text-gray-500">TVL: {protocol.tvl}</span>
                                                    {protocol.minAmount && (
                                                        <span className="text-gray-500">Min: {protocol.minAmount}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-xl font-bold text-green-500">{protocol.apy.toFixed(1)}%</p>
                                                <p className="text-xs text-gray-500">APY</p>
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="flex gap-3">
                        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-blue-400">
                                Understanding DeFi Yields
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                APY (Annual Percentage Yield) is the estimated yearly return. Actual returns may vary based on market conditions. Always DYOR before investing.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
