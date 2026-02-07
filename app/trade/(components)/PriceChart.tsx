"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useWallet } from "@/app/wallet/WalletContext";
import { useTradeEvents } from "@/app/(hooks)/queries/use-trades";

interface PriceChartProps {
    currentPrice: string;
    jettonAddress?: string;
}

const TIME_RANGES = [
    { label: "1m", seconds: 60 },
    { label: "5m", seconds: 300 },
    { label: "10m", seconds: 600 },
    { label: "30m", seconds: 1800 },
    { label: "1H", seconds: 3600 },
    { label: "4H", seconds: 14400 },
    { label: "24H", seconds: 86400 },
] as const;

/**
 * On-Chain Price Chart
 * Reads trade data directly from blockchain transactions via TONAPI
 * No Firebase dependency - truly on-chain!
 */
export default function PriceChart({ currentPrice, jettonAddress }: PriceChartProps) {
    const [timeRangeIndex, setTimeRangeIndex] = useState(2);
    const { tonPrice } = useWallet();
    const { data: trades = [], isFetching: isLoading } = useTradeEvents(jettonAddress, 30000);

    const timeRange = TIME_RANGES[timeRangeIndex];

    // Filter data based on time range
    const filteredTrades = useMemo(() => {
        const now = Date.now();
        const cutoff = now - (timeRange.seconds * 1000);
        return trades.filter(t => t.timestamp >= cutoff);
    }, [trades, timeRange.seconds]);

    // Calculate price change
    const priceChange = useMemo(() => {
        if (filteredTrades.length < 2) return 0;
        const first = filteredTrades[0].price;
        const last = filteredTrades[filteredTrades.length - 1].price;
        return ((last - first) / first) * 100;
    }, [filteredTrades]);

    const isPositive = priceChange >= 0;

    // Format for line chart
    const chartData = useMemo(() => {
        const data = filteredTrades.map(t => ({
            time: t.timestamp,
            price: t.price,
            displayTime: formatTime(new Date(t.timestamp), timeRange.seconds),
            type: t.type,
        }));

        // Add current price as last point if we have on-chain data
        const currentPriceNum = Number(currentPrice) / 1e9;
        if (currentPriceNum > 0) {
            data.push({
                time: Date.now(),
                price: currentPriceNum,
                displayTime: formatTime(new Date(), timeRange.seconds),
                type: "buy" as const,
            });
        }

        return data;
    }, [filteredTrades, currentPrice, timeRange.seconds]);

    function formatTime(date: Date, seconds: number): string {
        // Show seconds for short intervals, otherwise just time
        if (seconds <= 600) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        }
        if (seconds <= 86400) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    function formatPrice(price: number): string {
        if (price < 0.00001) return price.toFixed(8);
        if (price < 0.01) return price.toFixed(6);
        if (price < 1) return price.toFixed(4);
        return price.toFixed(2);
    }

    const handleSlide = (direction: "left" | "right") => {
        if (direction === "left" && timeRangeIndex > 0) {
            setTimeRangeIndex(timeRangeIndex - 1);
        } else if (direction === "right" && timeRangeIndex < TIME_RANGES.length - 1) {
            setTimeRangeIndex(timeRangeIndex + 1);
        }
    };

    if (isLoading) {
        return (
            <Card className="bg-[#111] border-[#222]">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded bg-white/5 animate-pulse" />
                        <div className="w-20 h-4 rounded bg-white/5 animate-pulse" />
                    </div>
                    <div className="h-[160px] bg-white/[0.02] rounded-lg animate-pulse" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-[#111] border-[#222] overflow-hidden">
            <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2 z-20 relative">
                    {/* On-Chain Badge */}
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">On-Chain</span>
                    </div>
                    
                    {/* Time Range Controls */}
                    <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-full px-1.5 py-0.5 border border-white/5">
                        <button
                            onClick={() => handleSlide("left")}
                            disabled={timeRangeIndex === 0}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <Icon icon="solar:alt-arrow-left-linear" className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-bold text-white min-w-[28px] text-center">
                            {timeRange.label}
                        </span>
                        <button
                            onClick={() => handleSlide("right")}
                            disabled={timeRangeIndex === TIME_RANGES.length - 1}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <Icon icon="solar:alt-arrow-right-linear" className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Chart */}
                {chartData.length > 1 ? (
                    <div className="h-[160px] px-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.2} />
                                        <stop offset="100%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="displayTime"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 9, fill: "#555" }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis hide domain={["dataMin", "dataMax"]} />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
                                                    <p className="text-[10px] text-gray-500 mb-0.5">{data.displayTime}</p>
                                                    <p className="text-sm font-semibold text-white">
                                                        {formatPrice(data.price)} TON
                                                    </p>
                                                    <p className="text-[10px] text-gray-500">
                                                        ≈ ${((data.price * (tonPrice || 5))).toFixed(6)}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="price"
                                    stroke={isPositive ? "#22c55e" : "#ef4444"}
                                    strokeWidth={1.5}
                                    fill="url(#priceGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[160px] flex flex-col items-center justify-center text-center px-4">
                        <Icon icon="solar:chart-2-linear" className="w-8 h-8 text-gray-700 mb-2" />
                        <p className="text-xs text-gray-500">
                            {jettonAddress ? "No on-chain trades yet" : "Contract not deployed"}
                        </p>
                        <p className="text-[10px] text-gray-600">
                            {jettonAddress ? "Chart updates from blockchain" : "Deploy token to see chart"}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
