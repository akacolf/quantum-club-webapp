"use client";

import { Icon } from "@iconify/react";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../WalletContext";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useYieldProtocolsQuery } from "@/app/(hooks)/queries/use-yield-protocols";
import { formatTruncatedAmount } from "@/lib/format";

// Risk level colors
const RISK_COLORS = {
    low: { text: "text-green-500" },
    medium: { text: "text-yellow-500" },
    high: { text: "text-red-500" },
};

const TYPE_ICONS: Record<string, string> = {
    staking: "lucide:shield",
    lp: "lucide:droplets",
};

export default function EarnPage() {
    useTelegramBackButton("/wallet");
    const router = useRouter();
    const { tonBalance, tonPrice } = useWallet();

    const { data: protocols = [], isLoading, refetch } = useYieldProtocolsQuery();

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
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:bg-white/10"
                    >
                        <Icon icon="lucide:refresh-cw" className={`w-5 h-5 text-gray-400 ${isLoading ? "animate-spin" : ""}`}/>
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-[#111] border-0">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon icon="lucide:trending-up" className="w-4 h-4 text-green-500"/>
                            <span className="text-xs text-gray-500">Best APY</span>
                        </div>
                        <p className="text-2xl font-bold text-green-500">
                            {bestApy.toFixed(1)}%
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#111] border-0">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon icon="lucide:coins" className="w-4 h-4 text-gray-400"/>
                            <span className="text-xs text-gray-500">Your balance</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {formatTruncatedAmount(tonBalanceNum, 2)} TON
                        </p>
                        <p className="text-xs text-gray-500">${tonValueUsd.toFixed(2)}</p>
                    </div>
                </div>

                {/* Potential Earnings Calculator */}
                {tonBalanceNum > 0 && bestApy > 0 && (
                    <div className="p-4 rounded-xl bg-[#111] border-0">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon icon="lucide:sparkles" className="w-4 h-4 text-gray-400"/>
                            <span className="text-sm font-medium text-white">Potential earnings</span>
                        </div>
                        <p className="text-sm text-gray-400">
                            At {bestApy.toFixed(1)}% APY, your {formatTruncatedAmount(tonBalanceNum, 2)} TON could earn:
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
                    <h2 className="text-base font-semibold text-white">Earning options</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Link
                            href="/wallet/staking"
                            className="p-4 rounded-xl bg-[#111] border-0 text-left active:scale-[0.98] transition-transform"
                        >
                            <Icon icon="lucide:circle-dollar-sign" className="mb-3 w-5 h-5 text-gray-400"/>
                            <h3 className="font-semibold text-white mb-1">Stake TON</h3>
                            <p className="text-xs text-gray-500">~{bestApy.toFixed(1)}% APY · <span className="text-green-500">Low risk</span></p>
                            <div className="flex items-center gap-1 text-xs text-gray-300 mt-2">
                                <span>Stake now</span>
                                <Icon icon="lucide:arrow-right" className="w-3 h-3"/>
                            </div>
                        </Link>

                        <Link
                            href="/wallet/liquidity"
                            className="p-4 rounded-xl bg-[#111] border-0 text-left active:scale-[0.98] transition-transform"
                        >
                            <Icon icon="lucide:droplets" className="mb-3 w-5 h-5 text-gray-400"/>
                            <h3 className="font-semibold text-white mb-1">Add liquidity</h3>
                            <p className="text-xs text-gray-500">~12% APY · <span className="text-yellow-500">Medium risk</span></p>
                            <div className="flex items-center gap-1 text-xs text-gray-300 mt-2">
                                <span>Start</span>
                                <Icon icon="lucide:arrow-right" className="w-3 h-3"/>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Protocols List */}
                <div className="space-y-3">
                    <h2 className="text-base font-semibold text-white">
                        Available protocols
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
                                    <button key={protocol.id}
                                        onClick={() => router.push(protocol.route)}
                                        className="w-full p-4 rounded-xl bg-[#111] border-0 active:bg-[#161616] transition-colors text-left"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
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
                                                    <span className="inline-flex items-center text-[10px] text-gray-500 whitespace-nowrap">
                                                        <Icon icon={typeIcon} className="w-3 h-3 mr-0.5" />
                                                        {protocol.type}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 mb-2 line-clamp-1">{protocol.description}</p>
                                                <div className="flex items-center gap-3 text-xs flex-wrap">
                                                    <span className={`${riskColors.text} whitespace-nowrap`}>
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
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div className="p-4 rounded-xl bg-[#111] border-0">
                    <div className="flex gap-3">
                        <Icon icon="lucide:info" className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5"/>
                        <div>
                            <p className="text-sm font-medium text-gray-400">
                                Understanding DeFi yields
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
