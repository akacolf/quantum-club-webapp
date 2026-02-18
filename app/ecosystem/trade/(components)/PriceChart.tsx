"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useWallet } from "@/app/wallet/WalletContext";
import { useTradeEvents } from "@/app/(hooks)/queries/use-trades";
import {
    createChart,
    AreaSeries,
    CandlestickSeries,
    type IChartApi,
    type ISeriesApi,
    type UTCTimestamp,
    ColorType,
    CrosshairMode,
    type CandlestickData,
    type AreaData,
    type Time,
} from "lightweight-charts";

interface PriceChartProps {
    currentPrice: string;
    jettonAddress?: string;
}

const TIME_RANGES = [
    { label: "1m", seconds: 60, bucket: 5 },
    { label: "5m", seconds: 300, bucket: 15 },
    { label: "10m", seconds: 600, bucket: 60 },
    { label: "30m", seconds: 1800, bucket: 60 },
    { label: "1H", seconds: 3600, bucket: 120 },
    { label: "4H", seconds: 14400, bucket: 300 },
    { label: "24H", seconds: 86400, bucket: 1800 },
] as const;

type ChartMode = "area" | "candlestick";

interface OHLCCandle {
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
}

function aggregateToCandles(
    trades: { timestamp: number; price: number }[],
    bucketSec: number
): OHLCCandle[] {
    if (trades.length === 0) return [];

    const buckets = new Map<number, { open: number; high: number; low: number; close: number }>();

    for (const trade of trades) {
        const bucketTime = Math.floor(trade.timestamp / 1000 / bucketSec) * bucketSec;
        const existing = buckets.get(bucketTime);
        if (existing) {
            existing.high = Math.max(existing.high, trade.price);
            existing.low = Math.min(existing.low, trade.price);
            existing.close = trade.price;
        } else {
            buckets.set(bucketTime, {
                open: trade.price,
                high: trade.price,
                low: trade.price,
                close: trade.price,
            });
        }
    }

    return Array.from(buckets.entries())
        .sort(([a], [b]) => a - b)
        .map(([time, ohlc]) => ({
            time: time as UTCTimestamp,
            ...ohlc,
        }));
}

export default function PriceChart({ currentPrice, jettonAddress }: PriceChartProps) {
    const [timeRangeIndex, setTimeRangeIndex] = useState(2);
    const [chartMode, setChartMode] = useState<ChartMode>("area");
    const { tonPrice } = useWallet();
    const { data: trades = [], isFetching: isLoading } = useTradeEvents(jettonAddress, 30000);

    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    // Tooltip state
    const [tooltip, setTooltip] = useState<{
        price: number;
        time: string;
        visible: boolean;
        x: number;
        y: number;
    } | null>(null);

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
    const lineColor = isPositive ? "#22c55e" : "#ef4444";

    // Prepare chart data
    const areaData = useMemo((): AreaData<UTCTimestamp>[] => {
        const data = filteredTrades.map(t => ({
            time: Math.floor(t.timestamp / 1000) as UTCTimestamp,
            value: t.price,
        }));

        const currentPriceNum = Number(currentPrice) / 1e9;
        if (currentPriceNum > 0) {
            data.push({
                time: Math.floor(Date.now() / 1000) as UTCTimestamp,
                value: currentPriceNum,
            });
        }

        return data;
    }, [filteredTrades, currentPrice]);

    const candleData = useMemo((): CandlestickData<UTCTimestamp>[] => {
        return aggregateToCandles(filteredTrades, timeRange.bucket);
    }, [filteredTrades, timeRange.bucket]);

    function formatPrice(price: number): string {
        if (price < 0.00001) return price.toFixed(8);
        if (price < 0.01) return price.toFixed(6);
        if (price < 1) return price.toFixed(4);
        return price.toFixed(2);
    }

    function formatTime(ts: number): string {
        const date = new Date(ts * 1000);
        if (timeRange.seconds <= 600) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        }
        if (timeRange.seconds <= 86400) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    // Create and manage chart
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#555",
                fontFamily: "inherit",
            },
            grid: {
                vertLines: { color: "#1a1a1a" },
                horzLines: { color: "#1a1a1a" },
            },
            crosshair: {
                mode: CrosshairMode.Magnet,
                vertLine: { color: "#ffffff20", width: 1, style: 2 },
                horzLine: { color: "#ffffff20", width: 1, style: 2 },
            },
            timeScale: {
                borderColor: "#1a1a1a",
                timeVisible: true,
                secondsVisible: timeRange.seconds <= 600,
            },
            rightPriceScale: {
                borderColor: "#1a1a1a",
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            handleScroll: { vertTouchDrag: false },
            handleScale: { axisPressedMouseMove: false },
            width: containerRef.current.clientWidth,
            height: 160,
        });

        chartRef.current = chart;

        // Crosshair tooltip
        chart.subscribeCrosshairMove((param) => {
            if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
                setTooltip(null);
                return;
            }

            let price: number | undefined;

            if (chartMode === "area" && areaSeriesRef.current) {
                const data = param.seriesData.get(areaSeriesRef.current) as AreaData<Time> | undefined;
                price = data?.value;
            } else if (chartMode === "candlestick" && candleSeriesRef.current) {
                const data = param.seriesData.get(candleSeriesRef.current) as CandlestickData<Time> | undefined;
                price = data?.close;
            }

            if (price !== undefined) {
                setTooltip({
                    price,
                    time: formatTime(param.time as number),
                    visible: true,
                    x: param.point.x,
                    y: param.point.y,
                });
            } else {
                setTooltip(null);
            }
        });

        // ResizeObserver
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                chart.applyOptions({ width: entry.contentRect.width });
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
            areaSeriesRef.current = null;
            candleSeriesRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeRange.seconds, chartMode]);

    // Update series data
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        // Remove existing series
        if (areaSeriesRef.current) {
            try { chart.removeSeries(areaSeriesRef.current); } catch {}
            areaSeriesRef.current = null;
        }
        if (candleSeriesRef.current) {
            try { chart.removeSeries(candleSeriesRef.current); } catch {}
            candleSeriesRef.current = null;
        }

        if (chartMode === "area" && areaData.length > 1) {
            const series = chart.addSeries(AreaSeries, {
                lineColor,
                topColor: isPositive ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                bottomColor: isPositive ? "rgba(34,197,94,0)" : "rgba(239,68,68,0)",
                lineWidth: 2,
                priceFormat: { type: "price", precision: 8, minMove: 0.00000001 },
            });
            series.setData(areaData);
            areaSeriesRef.current = series;
            chart.timeScale().fitContent();
        } else if (chartMode === "candlestick" && candleData.length > 0) {
            const series = chart.addSeries(CandlestickSeries, {
                upColor: "#22c55e",
                downColor: "#ef4444",
                borderUpColor: "#22c55e",
                borderDownColor: "#ef4444",
                wickUpColor: "#22c55e80",
                wickDownColor: "#ef444480",
                priceFormat: { type: "price", precision: 8, minMove: 0.00000001 },
            });
            series.setData(candleData);
            candleSeriesRef.current = series;
            chart.timeScale().fitContent();
        }
    }, [chartMode, areaData, candleData, lineColor, isPositive]);

    const handleSlide = useCallback((direction: "left" | "right") => {
        if (direction === "left" && timeRangeIndex > 0) {
            setTimeRangeIndex(timeRangeIndex - 1);
        } else if (direction === "right" && timeRangeIndex < TIME_RANGES.length - 1) {
            setTimeRangeIndex(timeRangeIndex + 1);
        }
    }, [timeRangeIndex]);

    const hasData = chartMode === "area" ? areaData.length > 1 : candleData.length > 0;

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
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">On-Chain</span>
                        </div>
                        {/* Chart mode toggle */}
                        <button
                            onClick={() => setChartMode(chartMode === "area" ? "candlestick" : "area")}
                            className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                            title={chartMode === "area" ? "Switch to candlestick" : "Switch to area"}
                        >
                            <Icon
                                icon={chartMode === "area" ? "solar:chart-bold" : "solar:chart-2-linear"}
                                className="w-3.5 h-3.5"
                            />
                        </button>
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
                {hasData ? (
                    <div className="relative h-[160px] px-2">
                        <div ref={containerRef} className="w-full h-full" />
                        {/* Custom tooltip */}
                        {tooltip?.visible && (
                            <div
                                className="absolute bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 shadow-xl pointer-events-none z-10"
                                style={{
                                    left: Math.min(tooltip.x, (containerRef.current?.clientWidth ?? 200) - 140),
                                    top: Math.max(0, tooltip.y - 60),
                                }}
                            >
                                <p className="text-[10px] text-gray-500 mb-0.5">{tooltip.time}</p>
                                <p className="text-sm font-semibold text-white">
                                    {formatPrice(tooltip.price)} TON
                                </p>
                                <p className="text-[10px] text-gray-500">
                                    ≈ ${((tooltip.price * (tonPrice || 5))).toFixed(6)}
                                </p>
                            </div>
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
