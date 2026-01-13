"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Clock,
    ExternalLink,
    RefreshCw,
    Info,
    CheckCircle,
    Coins,
} from "lucide-react";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../WalletContext";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import Image from "next/image";

// Staking provider data
interface StakingProvider {
    id: string;
    name: string;
    icon: string;
    apy: number;
    minStake: number;
    totalStaked: string;
    stakerCount: string;
    liquidToken?: string;
    liquidTokenIcon?: string;
    features: string[];
    url: string;
    unstakeTime: string;
    isRecommended?: boolean;
}

// TON Liquid Staking providers
const STAKING_PROVIDERS: StakingProvider[] = [
    {
        id: "tonstakers",
        name: "TON Stakers",
        icon: "/png/tonstakers-logo.jpg",
        apy: 4.8,
        minStake: 1,
        totalStaked: "28.4M TON",
        stakerCount: "42,000+",
        liquidToken: "tsTON",
        liquidTokenIcon: "/svg/ton-logo.svg",
        features: ["Liquid staking", "Instant unstake", "DeFi compatible", "Auto-compound"],
        url: "https://tonstakers.com",
        unstakeTime: "Instant",
        isRecommended: true,
    },
    {
        id: "bemo",
        name: "Bemo Finance",
        icon: "/svg/ton-logo.svg",
        apy: 5.1,
        minStake: 0.5,
        totalStaked: "18.2M TON",
        stakerCount: "28,000+",
        liquidToken: "stTON",
        liquidTokenIcon: "/svg/ton-logo.svg",
        features: ["Liquid staking", "No minimum", "Governance", "Auto-compound"],
        url: "https://bemo.finance",
        unstakeTime: "Instant",
    },
    {
        id: "hipo",
        name: "Hipo",
        icon: "/svg/ton-logo.svg",
        apy: 4.6,
        minStake: 10,
        totalStaked: "12.8M TON",
        stakerCount: "15,000+",
        liquidToken: "hTON",
        liquidTokenIcon: "/svg/ton-logo.svg",
        features: ["Decentralized", "Community governed", "Open source"],
        url: "https://hipo.finance",
        unstakeTime: "~36 hours",
    },
];

export default function StakingPage() {
    useTelegramBackButton("/wallet");
    const { tonBalance, tonPrice } = useWallet();
    
    const [isLoading, setIsLoading] = useState(true);
    const [providers, setProviders] = useState<StakingProvider[]>([]);

    // Fetch staking data
    const fetchStakingData = useCallback(async () => {
        setIsLoading(true);
        try {
            // In production, fetch live APY data from APIs
            // For now, use static data with small variations
            const updatedProviders = STAKING_PROVIDERS.map(p => ({
                ...p,
                apy: p.apy + (Math.random() - 0.5) * 0.3,
            }));
            setProviders(updatedProviders);
        } catch (error) {
            console.error("Failed to fetch staking data:", error);
            setProviders(STAKING_PROVIDERS);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStakingData();
    }, [fetchStakingData]);

    const tonBalanceNum = parseFloat(tonBalance) || 0;
    const tonValueUsd = tonBalanceNum * tonPrice;

    // Average APY
    const avgApy = providers.length > 0 
        ? providers.reduce((sum, p) => sum + p.apy, 0) / providers.length 
        : 0;

    // Total staked across all providers (mock calculation)
    const totalStakedTon = providers.reduce((sum, p) => {
        const match = p.totalStaked.match(/([\d.]+)/);
        return sum + (match ? parseFloat(match[1]) : 0);
    }, 0);

    // Open provider in external browser
    const openProvider = (url: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tgWebApp = typeof window !== "undefined" ? (window as any).Telegram?.WebApp : null;
        if (tgWebApp?.openLink) {
            tgWebApp.openLink(url);
        } else {
            window.open(url, "_blank");
        }
    };

    // Calculate rewards
    const calculateRewards = (amount: number, apy: number) => {
        const daily = (amount * apy / 100) / 365;
        const monthly = (amount * apy / 100) / 12;
        const yearly = amount * apy / 100;
        return { daily, monthly, yearly };
    };

    return (
        <div className="flex flex-col min-h-screen bg-black pb-28">
            <div className="px-4 pt-2 pb-4 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold text-white">TON Staking</h1>
                        <p className="text-sm text-gray-500">
                            Stake TON and earn passive rewards
                        </p>
                    </div>
                    <button
                        onClick={fetchStakingData}
                        disabled={isLoading}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:bg-white/10"
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-400 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-[#111] border border-[#222] text-center">
                        <p className="text-xs text-gray-500 mb-1">Avg APY</p>
                        <p className="text-lg font-bold text-white">{avgApy.toFixed(1)}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#111] border border-[#222] text-center">
                        <p className="text-xs text-gray-500 mb-1">Total Staked</p>
                        <p className="text-lg font-bold text-white">{totalStakedTon.toFixed(0)}M</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#111] border border-[#222] text-center">
                        <p className="text-xs text-gray-500 mb-1">Providers</p>
                        <p className="text-lg font-bold text-white">{providers.length}</p>
                    </div>
                </div>

                {/* Your Balance */}
                <div className="p-4 rounded-xl bg-[#111] border border-[#222]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Image
                                src="/svg/ton-logo.svg"
                                alt="TON"
                                width={32}
                                height={32}
                                className="w-8 h-8"
                            />
                            <div>
                                <p className="text-sm text-gray-500">Available to Stake</p>
                                <p className="text-xl font-bold text-white">{tonBalanceNum.toFixed(4)} TON</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">${tonValueUsd.toFixed(2)}</p>
                        </div>
                    </div>
                    {tonBalanceNum > 1 && avgApy > 0 && (
                        <div className="pt-3 border-t border-[#222]">
                            <p className="text-xs text-gray-500">
                                If you stake all: <span className="text-white font-medium">
                                    +{(tonBalanceNum * avgApy / 100).toFixed(2)} TON/year
                                </span> (~${((tonBalanceNum * avgApy / 100) * tonPrice).toFixed(2)})
                            </p>
                        </div>
                    )}
                </div>

                {/* Staking Providers */}
                <div className="space-y-3">
                    <h2 className="text-base font-semibold text-white">Choose a Provider</h2>

                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <ButtonLoader size="lg" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {providers.map((provider) => {
                                const rewards = calculateRewards(tonBalanceNum, provider.apy);
                                
                                return (
                                    <motion.div
                                        key={provider.id}
                                        whileTap={{ scale: 0.98 }}
                                        className="rounded-xl bg-[#111] border border-[#222] overflow-hidden"
                                    >
                                        <button
                                            onClick={() => openProvider(provider.url)}
                                            className="w-full p-4 text-left active:bg-[#161616]"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-[#222] overflow-hidden flex-shrink-0">
                                                    <Image
                                                        src={provider.icon}
                                                        alt={provider.name}
                                                        width={48}
                                                        height={48}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h3 className="font-semibold text-white">{provider.name}</h3>
                                                        {provider.isRecommended && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-gray-400">
                                                                Recommended
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Features */}
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        {provider.features.slice(0, 3).map((feature, i) => (
                                                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-500">
                                                                {feature}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    {/* Stats Row */}
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Coins className="w-3 h-3" />
                                                            Min: {provider.minStake} TON
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {provider.unstakeTime}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-xl font-bold text-green-500">{provider.apy.toFixed(1)}%</p>
                                                    <p className="text-xs text-gray-500">APY</p>
                                                    {provider.liquidToken && (
                                                        <p className="text-[10px] text-blue-400 mt-1">
                                                            → {provider.liquidToken}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Potential Rewards */}
                                            {tonBalanceNum >= provider.minStake && (
                                                <div className="mt-3 pt-3 border-t border-[#222] grid grid-cols-3 gap-2 text-center">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Daily</p>
                                                        <p className="text-sm font-medium text-white">
                                                            +{rewards.daily.toFixed(4)} TON
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Monthly</p>
                                                        <p className="text-sm font-medium text-white">
                                                            +{rewards.monthly.toFixed(3)} TON
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Yearly</p>
                                                        <p className="text-sm font-medium text-white">
                                                            +{rewards.yearly.toFixed(2)} TON
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-400">
                                                <span>Stake on {provider.name}</span>
                                                <ExternalLink className="w-4 h-4" />
                                            </div>
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* What is Liquid Staking */}
                <div className="p-4 rounded-xl bg-[#111] border border-[#222]">
                    <div className="flex gap-3">
                        <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-gray-400">
                                What is Liquid Staking?
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Liquid staking lets you stake TON while receiving a liquid token (like tsTON or stTON) that you can use in DeFi while still earning staking rewards. Your staked TON automatically compounds.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <CheckCircle className="w-3 h-3 text-gray-400" />
                                    Earn ~5% APY
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <CheckCircle className="w-3 h-3 text-gray-400" />
                                    Stay liquid
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <CheckCircle className="w-3 h-3 text-gray-400" />
                                    Auto-compound
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
