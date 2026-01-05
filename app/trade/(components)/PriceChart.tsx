"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar, Cell, ComposedChart } from "recharts";
import { useWallet } from "@/app/wallet/WalletContext";

interface TradeEvent {
    timestamp: number;
    type: "buy" | "sell";
    tonAmount: number;
    tokenAmount: number;
    price: number;
    hash: string;
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
    currentPrice: string;
    jettonAddress?: string;
}

type ChartType = "line" | "candle";

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
    const [trades, setTrades] = useState<TradeEvent[]>([]);
    const [timeRangeIndex, setTimeRangeIndex] = useState(2);
    const [chartType, setChartType] = useState<ChartType>("line");
    const [isLoading, setIsLoading] = useState(true);
    const { tonPrice } = useWallet();

    const timeRange = TIME_RANGES[timeRangeIndex];

    // Fetch on-chain transactions for the jetton
    useEffect(() => {
        if (!jettonAddress) {
            setIsLoading(false);
            return;
        }

        const fetchOnChainTrades = async () => {
            try {
                // Fetch recent transactions from TONAPI
                const response = await fetch(
                    `https://tonapi.io/v2/blockchain/accounts/${jettonAddress}/transactions?limit=100`
                );

                if (!response.ok) {
                    console.log("Failed to fetch on-chain transactions");
                    setIsLoading(false);
                    return;
                }

                const data = await response.json();
                const tradeEvents: TradeEvent[] = [];

                // Parse transactions for buy/sell events
                // Buy: op 0xaf750d34
                // Sell notification: op 0xb7e76bfd
                for (const tx of data.transactions || []) {
                    if (!tx.success) continue;

                    const inMsg = tx.in_msg;
                    if (!inMsg?.op_code) continue;

                    const timestamp = tx.utime * 1000;
                    const hash = tx.hash;

                    // BUY transaction
                    if (inMsg.op_code === "0xaf750d34") {
                        const tonValue = (tx.in_msg?.value || 0) / 1e9;
                        
                        // Look for internal_transfer in out_msgs to get token amount
                        const transferMsg = tx.out_msgs?.find(
                            (m: { op_code?: string }) => m.op_code === "0x178d4519"
                        );
                        
                        let tokenAmount = 0;
                        if (transferMsg?.decoded_body?.amount) {
                            tokenAmount = parseInt(transferMsg.decoded_body.amount) / 1e9;
                        }

                        if (tonValue > 0 && tokenAmount > 0) {
                            tradeEvents.push({
                                timestamp,
                                type: "buy",
                                tonAmount: tonValue,
                                tokenAmount,
                                price: tonValue / tokenAmount,
                                hash,
                            });
                        }
                    }

                    // SELL transaction (burn notification)
                    if (inMsg.op_code === "0xb7e76bfd") {
                        // Sell returns TON to user
                        const returnMsg = tx.out_msgs?.find(
                            (m: { op_code?: string }) => m.op_code === "0xaf5ececd" || m.op_code === "0xd53276db"
                        );
                        
                        const tonValue = returnMsg ? (returnMsg.value || 0) / 1e9 : 0;
                        
                        // Token amount is in the incoming burn notification
                        let tokenAmount = 0;
                        if (inMsg.raw_body) {
                            // Parse from decoded body if available
                            const decoded = inMsg.decoded_body;
                            if (decoded?.amount) {
                                tokenAmount = parseInt(decoded.amount) / 1e9;
                            }
                        }

                        if (tonValue > 0 && tokenAmount > 0) {
                            tradeEvents.push({
                                timestamp,
                                type: "sell",
                                tonAmount: tonValue,
                                tokenAmount,
                                price: tonValue / tokenAmount,
                                hash,
                            });
                        }
                    }
                }

                // Sort by timestamp ascending
                tradeEvents.sort((a, b) => a.timestamp - b.timestamp);
                setTrades(tradeEvents);
                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching on-chain trades:", error);
                setIsLoading(false);
            }
        };

        fetchOnChainTrades();
        
        // Refresh every 30 seconds
        const interval = setInterval(fetchOnChainTrades, 30000);
        return () => clearInterval(interval);
    }, [jettonAddress]);

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

    // Format for candlestick chart  
    const candleData = useMemo((): CandleData[] => {
        if (filteredTrades.length < 2) return [];

        // Candle interval in ms based on time range (in seconds)
        const intervals: Record<number, number> = {
            60: 5 * 1000,         // 5 second candles for 1m
            300: 15 * 1000,       // 15 second candles for 5m
            600: 30 * 1000,       // 30 second candles for 10m
            1800: 60 * 1000,      // 1 minute candles for 30m
            3600: 5 * 60 * 1000,  // 5 minute candles for 1H
            14400: 15 * 60 * 1000, // 15 minute candles for 4H
            86400: 60 * 60 * 1000, // 1 hour candles for 24H
        };

        const interval = intervals[timeRange.seconds] || 60 * 1000;
        const candles: CandleData[] = [];
        type CandleAccumulator = { prices: number[]; startTime: number };
        let currentCandle: CandleAccumulator | null = null;

        filteredTrades.forEach(trade => {
            const candleStart = Math.floor(trade.timestamp / interval) * interval;

            if (!currentCandle || currentCandle.startTime !== candleStart) {
                if (currentCandle && currentCandle.prices.length > 0) {
                    const prices = currentCandle.prices;
                    const open = prices[0];
                    const close = prices[prices.length - 1];
                    candles.push({
                        time: currentCandle.startTime,
                        displayTime: formatTime(new Date(currentCandle.startTime), timeRange.seconds),
                        open,
                        high: Math.max(...prices),
                        low: Math.min(...prices),
                        close,
                        isPositive: close >= open,
                    });
                }
                currentCandle = { prices: [trade.price], startTime: candleStart };
            } else {
                currentCandle.prices.push(trade.price);
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
                    displayTime: formatTime(new Date(lc.startTime), timeRange.seconds),
                    open,
                    high: Math.max(...prices),
                    low: Math.min(...prices),
                    close,
                    isPositive: close >= open,
                });
            }
        }

        return candles;
    }, [filteredTrades, timeRange.seconds]);

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
                    {/* Empty left side or could be used for something else later */}
                    <div />
                    
                    {/* Chart Type & Time Controls - Floating/Pill Style */}
                    <div className="flex items-center gap-2">
                        <div className="flex bg-[#1a1a1a] rounded-full p-0.5 border border-white/5">
                            <button
                                onClick={() => setChartType("line")}
                                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                    chartType === "line" ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                                }`}
                            >
                                <Icon icon="solar:chart-2-linear" className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setChartType("candle")}
                                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                    chartType === "candle" ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                                }`}
                            >
                                <Icon icon="solar:tuning-2-bold" className="w-3.5 h-3.5" />
                            </button>
                        </div>

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
