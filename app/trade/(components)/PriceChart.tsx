"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { dbfs } from "@/app/(firebase)/client";
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useWallet } from "@/app/wallet/WalletContext";

interface PriceDataPoint {
    timestamp: Date;
    price: number;
    priceUsd: number;
}

interface PriceChartProps {
    tokenId: string;
    currentPrice: string;
}

type TimeRange = "1H" | "24H" | "7D" | "30D";

export default function PriceChart({ tokenId, currentPrice }: PriceChartProps) {
    const [priceHistory, setPriceHistory] = useState<PriceDataPoint[]>([]);
    const [timeRange, setTimeRange] = useState<TimeRange>("24H");
    const [isLoading, setIsLoading] = useState(true);
    const { tonPrice } = useWallet();

    useEffect(() => {
        if (!tokenId) return;

        // Listen to trades to build price history
        const tradesRef = collection(dbfs, `tokens/${tokenId}/trades`);
        const q = query(tradesRef, orderBy("timestamp", "desc"), limit(200));

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

                // If there's only one point (current price), add a starting point for new tokens
                // This ensures the chart is always visible
                if (prices.length === 1) {
                    // Add a starting point 1 hour ago with the same initial price
                    prices.unshift({
                        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
                        price: currentPriceNum,
                        priceUsd: currentPriceNum * (tonPrice || 5),
                    });
                }
            }

            setPriceHistory(prices);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching price history:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [tokenId, currentPrice, tonPrice]);

    // Filter data based on time range
    const filteredData = useMemo(() => {
        const now = Date.now();
        const ranges: Record<TimeRange, number> = {
            "1H": 60 * 60 * 1000,
            "24H": 24 * 60 * 60 * 1000,
            "7D": 7 * 24 * 60 * 60 * 1000,
            "30D": 30 * 24 * 60 * 60 * 1000,
        };

        const cutoff = now - ranges[timeRange];
        return priceHistory.filter(p => p.timestamp.getTime() >= cutoff);
    }, [priceHistory, timeRange]);

    // Calculate price change
    const priceChange = useMemo(() => {
        if (filteredData.length < 2) return 0;
        const first = filteredData[0].price;
        const last = filteredData[filteredData.length - 1].price;
        return ((last - first) / first) * 100;
    }, [filteredData]);

    const isPositive = priceChange >= 0;

    // Format for chart
    const chartData = useMemo(() => {
        return filteredData.map(p => ({
            time: p.timestamp.getTime(),
            price: p.price,
            displayTime: formatTime(p.timestamp, timeRange),
        }));
    }, [filteredData, timeRange]);

    function formatTime(date: Date, range: TimeRange): string {
        if (range === "1H" || range === "24H") {
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

    if (isLoading) {
        return (
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Icon icon="solar:chart-2-bold" className="w-5 h-5 text-primary animate-pulse" />
                        <span className="text-sm text-muted-foreground">Loading chart...</span>
                    </div>
                    <div className="h-[180px] bg-white/[0.02] rounded-xl animate-pulse" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/5 border-white/10 overflow-hidden">
            <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon icon="solar:chart-2-bold" className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-sm">Price Chart</h3>
                            {chartData.length > 0 && (
                                <div className={`flex items-center gap-1 text-xs ${isPositive ? "text-green-400" : "text-red-400"}`}>
                                    <Icon icon={isPositive ? "solar:graph-up-bold" : "solar:graph-down-bold"} className="w-3 h-3" />
                                    {isPositive ? "+" : "-"}{Math.abs(priceChange).toFixed(2)}%
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex gap-1">
                        {(["1H", "24H", "7D", "30D"] as TimeRange[]).map((range) => (
                            <Button
                                key={range}
                                variant="ghost"
                                size="sm"
                                onClick={() => setTimeRange(range)}
                                className={`h-7 px-2 text-xs ${timeRange === range
                                    ? "bg-white/10 text-white"
                                    : "text-muted-foreground hover:text-white"
                                    }`}
                            >
                                {range}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Chart */}
                {chartData.length > 1 ? (
                    <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="displayTime"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: "#666" }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    hide
                                    domain={["dataMin", "dataMax"]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "#1a1a1a",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                        padding: "8px 12px",
                                    }}
                                    labelStyle={{ color: "#999", marginBottom: "4px" }}
                                    formatter={(value: number | undefined) => [`${formatPrice(value || 0)} TON`, "Price"]}
                                    labelFormatter={(label) => `Time: ${label}`}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 shadow-xl">
                                                    <p className="text-xs text-muted-foreground mb-1">{data.displayTime}</p>
                                                    <p className="text-sm font-semibold text-white">
                                                        {formatPrice(data.price)} TON
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        ≈ ${(data.priceUsd || data.price * 5).toFixed(6)}
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
                                    strokeWidth={2}
                                    fill="url(#priceGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[180px] flex flex-col items-center justify-center text-center">
                        <Icon icon="solar:chart-bold" className="w-10 h-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No price data yet</p>
                        <p className="text-xs text-muted-foreground/60">Chart will appear after trades</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
