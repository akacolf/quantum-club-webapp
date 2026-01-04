"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { dbfs } from "@/app/(firebase)/client";
import { collection, query, orderBy, limit, onSnapshot, Timestamp, where } from "firebase/firestore";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar, Cell, ComposedChart } from "recharts";
import { useWallet } from "@/app/wallet/WalletContext";

interface PriceDataPoint {
    timestamp: Date;
    price: number;
    priceUsd: number;
}

interface CandleData {
    time: number;
    displayTime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    isPositive: boolean;
}

interface PriceChartProps {
    tokenId: string;
    currentPrice: string;
}

type ChartType = "line" | "candle";

// Time range options with sliding support
const TIME_RANGES = [
    { label: "1H", hours: 1 },
    { label: "4H", hours: 4 },
    { label: "24H", hours: 24 },
    { label: "7D", hours: 168 },
    { label: "30D", hours: 720 },
] as const;

export default function PriceChart({ tokenId, currentPrice }: PriceChartProps) {
    const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([]);
    const [timeRangeIndex, setTimeRangeIndex] = useState(2); // Default to 24H
    const [chartType, setChartType] = useState<ChartType>("line");
    const [isLoading, setIsLoading] = useState(true);
    const { tonPrice } = useWallet();

    const timeRange = TIME_RANGES[timeRangeIndex];

    useEffect(() => {
        if (!tokenId) return;

        // Listen to COMPLETED trades only to build price history
        const tradesRef = collection(dbfs, `tokens/${tokenId}/trades`);
        // Only show completed trades - pending trades should not affect chart
        const q = query(
            tradesRef, 
            where("status", "==", "completed"),
            orderBy("timestamp", "desc"), 
            limit(200)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const prices: PriceDataPoint[] = [];

            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                const timestamp = data.timestamp instanceof Timestamp
                    ? data.timestamp.toDate()
                    : new Date();
                const price = parseFloat(data.price || "0");

                if (price > 0) {
                    prices.push({
                        timestamp,
                        price,
                        priceUsd: price * (tonPrice || 5),
                    });
                }
            });

            // Sort by timestamp ascending for chart
            prices.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            // Add current price as latest point if no recent trades
            const currentPriceNum = Number(currentPrice) / 1e9;
            if (currentPriceNum > 0) {
                const lastPrice = prices[prices.length - 1];
                if (!lastPrice || (Date.now() - lastPrice.timestamp.getTime()) > 60000) {
                    prices.push({
                        timestamp: new Date(),
                        price: currentPriceNum,
                        priceUsd: currentPriceNum * (tonPrice || 5),
                    });
                }

                // Add starting point for new tokens
                if (prices.length === 1) {
                    prices.unshift({
                        timestamp: new Date(Date.now() - 60 * 60 * 1000),
                        price: currentPriceNum,
                        priceUsd: currentPriceNum * (tonPrice || 5),
                    });
                }
            }

            setPriceHistory(prices);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching trades:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [tokenId, currentPrice, tonPrice]);

    // Filter data based on time range
    const filteredData = useMemo(() => {
        const now = Date.now();
        const cutoff = now - (timeRange.hours * 60 * 60 * 1000);
        return priceHistory.filter(p => p.timestamp.getTime() >= cutoff);
    }, [priceHistory, timeRange.hours]);

    // Calculate price change
    const priceChange = useMemo(() => {
        if (filteredData.length < 2) return 0;
        const first = filteredData[0].price;
        const last = filteredData[filteredData.length - 1].price;
        return ((last - first) / first) * 100;
    }, [filteredData]);

    const isPositive = priceChange >= 0;

    // Format for line chart
    const chartData = useMemo(() => {
        return filteredData.map(p => ({
            time: p.timestamp.getTime(),
            price: p.price,
            displayTime: formatTime(p.timestamp, timeRange.hours),
        }));
    }, [filteredData, timeRange.hours]);

    // Format for candlestick chart
    const candleData = useMemo((): CandleData[] => {
        if (filteredData.length < 2) return [];

        // Candle intervals based on time range
        const intervals: Record<number, number> = {
            1: 5 * 60 * 1000,     // 5 min for 1H
            4: 15 * 60 * 1000,    // 15 min for 4H
            24: 60 * 60 * 1000,   // 1 hr for 24H
            168: 4 * 60 * 60 * 1000,  // 4 hr for 7D
            720: 24 * 60 * 60 * 1000, // 1 day for 30D
        };

        const interval = intervals[timeRange.hours] || 60 * 60 * 1000;
        const candles: CandleData[] = [];
        type CandleAccumulator = { prices: number[]; startTime: number };
        let currentCandle: CandleAccumulator | null = null;

        filteredData.forEach(point => {
            const candleStart = Math.floor(point.timestamp.getTime() / interval) * interval;

            if (!currentCandle || currentCandle.startTime !== candleStart) {
                if (currentCandle && currentCandle.prices.length > 0) {
                    const prices = currentCandle.prices;
                    const open = prices[0];
                    const close = prices[prices.length - 1];
                    candles.push({
                        time: currentCandle.startTime,
                        displayTime: formatTime(new Date(currentCandle.startTime), timeRange.hours),
                        open,
                        high: Math.max(...prices),
                        low: Math.min(...prices),
                        close,
                        isPositive: close >= open,
                    });
                }
                currentCandle = { prices: [point.price], startTime: candleStart };
            } else {
                currentCandle.prices.push(point.price);
            }
        });

        if (currentCandle !== null) {
            const lc = currentCandle as CandleAccumulator;
            if (lc.prices.length > 0) {
                const prices = lc.prices;
                const open = prices[0];
                const close = prices[prices.length - 1];
                candles.push({
                    time: lc.startTime,
                    displayTime: formatTime(new Date(lc.startTime), timeRange.hours),
                    open,
                    high: Math.max(...prices),
                    low: Math.min(...prices),
                    close,
                    isPositive: close >= open,
                });
            }
        }

        return candles;
    }, [filteredData, timeRange.hours]);

    function formatTime(date: Date, hours: number): string {
        if (hours <= 24) {
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

    // Handle sliding time range
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
                {/* Compact Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">Price</span>
                        {chartData.length > 0 && (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                            }`}>
                                {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
                            </span>
                        )}
                    </div>
                    
                    {/* Chart Type & Time Controls */}
                    <div className="flex items-center gap-2">
                        {/* Chart Type Toggle */}
                        <div className="flex bg-white/5 rounded-md p-0.5">
                            <button
                                onClick={() => setChartType("line")}
                                className={`p-1.5 rounded transition-colors ${
                                    chartType === "line" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                                }`}
                            >
                                <Icon icon="solar:chart-2-linear" className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setChartType("candle")}
                                className={`p-1.5 rounded transition-colors ${
                                    chartType === "candle" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                                }`}
                            >
                                <Icon icon="solar:tuning-2-bold" className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Slidable Time Range */}
                        <div className="flex items-center gap-1 bg-white/5 rounded-md px-1 py-0.5">
                            <button
                                onClick={() => handleSlide("left")}
                                disabled={timeRangeIndex === 0}
                                className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Icon icon="solar:alt-arrow-left-linear" className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-medium text-white min-w-[28px] text-center">
                                {timeRange.label}
                            </span>
                            <button
                                onClick={() => handleSlide("right")}
                                disabled={timeRangeIndex === TIME_RANGES.length - 1}
                                className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Icon icon="solar:alt-arrow-right-linear" className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                {chartData.length > 1 ? (
                    <div className="h-[160px] px-2">
                        {chartType === "line" ? (
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
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={candleData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
                                                const data = payload[0].payload as CandleData;
                                                return (
                                                    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
                                                        <p className="text-[10px] text-gray-500 mb-1">{data.displayTime}</p>
                                                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                                                            <span className="text-gray-500">O:</span>
                                                            <span className="text-white">{formatPrice(data.open)}</span>
                                                            <span className="text-gray-500">H:</span>
                                                            <span className="text-green-400">{formatPrice(data.high)}</span>
                                                            <span className="text-gray-500">L:</span>
                                                            <span className="text-red-400">{formatPrice(data.low)}</span>
                                                            <span className="text-gray-500">C:</span>
                                                            <span className={data.isPositive ? "text-green-400" : "text-red-400"}>
                                                                {formatPrice(data.close)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="high" fill="transparent" />
                                    <Bar dataKey="close" barSize={6}>
                                        {candleData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.isPositive ? "#22c55e" : "#ef4444"}
                                            />
                                        ))}
                                    </Bar>
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                ) : (
                    <div className="h-[160px] flex flex-col items-center justify-center text-center px-4">
                        <Icon icon="solar:chart-2-linear" className="w-8 h-8 text-gray-700 mb-2" />
                        <p className="text-xs text-gray-500">No confirmed trades yet</p>
                        <p className="text-[10px] text-gray-600">Chart updates after on-chain confirmation</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
