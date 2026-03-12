"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    createChart,
    CandlestickSeries,
    AreaSeries,
    type IChartApi,
    type ISeriesApi,
    type UTCTimestamp,
    ColorType,
    CrosshairMode,
} from "lightweight-charts";
import { useSpotTokenTonApiChart, useSpotTokenChart, type ChartTimeframe } from "@/app/(hooks)/queries/use-spot-trading";

interface SpotPriceChartProps {
    poolAddress?: string;
    tokenAddress?: string;
    tokenSymbol: string;
}

type ChartMode = "candle" | "area";

const TIMEFRAMES: { label: string; value: ChartTimeframe }[] = [
    { label: "15m", value: "15m" },
    { label: "1H", value: "1h" },
    { label: "4H", value: "4h" },
    { label: "1D", value: "1d" },
];

function formatChartPrice(price: number): string {
    if (price >= 1) return price.toFixed(price >= 100 ? 2 : 4);
    if (price >= 0.01) return price.toFixed(4);
    if (price >= 0.0001) return price.toFixed(6);
    if (price >= 0.00000001) return price.toFixed(8);
    return price.toFixed(10);
}

export default function SpotPriceChart({ poolAddress, tokenAddress, tokenSymbol }: SpotPriceChartProps) {
    const [timeframe, setTimeframe] = useQueryState("tf", parseAsStringLiteral(["15m", "1h", "4h", "1d"] as const).withDefault("1h").withOptions({ history: "replace" }));
    const [chartMode, setChartMode] = useQueryState("scm", parseAsStringLiteral(["candle", "area"] as const).withDefault("area").withOptions({ history: "replace" }));

    // Primary: TonAPI chart (area chart — works for any token, no pool needed)
    const { data: tonApiCandles, isLoading: tonApiLoading } = useSpotTokenTonApiChart(tokenAddress, timeframe);

    // Fallback: GeckoTerminal OHLCV (requires pool address, provides candlestick data)
    const useGeckoFallback = chartMode === "candle" && !!poolAddress;
    const { data: geckoCandles, isLoading: geckoLoading } = useSpotTokenChart(
        useGeckoFallback ? poolAddress : undefined,
        timeframe
    );

    // Use TonAPI data by default (area), Gecko for candlestick mode when pool exists
    const isCandleMode = chartMode === "candle" && geckoCandles && geckoCandles.length > 0;
    const candles = isCandleMode ? geckoCandles : (tonApiCandles && tonApiCandles.length > 0 ? tonApiCandles : geckoCandles);
    const isLoading = tonApiLoading || (useGeckoFallback && geckoLoading);

    // Force area mode when only TonAPI data (no OHLCV)
    const effectiveMode = isCandleMode ? "candle" : "area";
    const canToggleMode = !!poolAddress && geckoCandles && geckoCandles.length > 0;

    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Area"> | ISeriesApi<"Candlestick"> | null>(null);

    const [tooltip, setTooltip] = useState<{
        price: number;
        time: string;
        change: string;
        x: number;
        y: number;
    } | null>(null);

    // Price change for header
    const priceChange = (() => {
        if (!candles || candles.length < 2) return null;
        const first = candles[0].open;
        const last = candles[candles.length - 1].close;
        if (first === 0) return null;
        return ((last - first) / first) * 100;
    })();

    const lastPrice = candles?.[candles.length - 1]?.close;
    const isPositive = (priceChange ?? 0) >= 0;

    // Create and update chart
    useEffect(() => {
        if (!containerRef.current || !candles || candles.length === 0) return;

        // Cleanup
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
            seriesRef.current = null;
        }

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#555",
                fontFamily: "'Onest', sans-serif",
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
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: "#1a1a1a",
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            handleScroll: { vertTouchDrag: false },
            handleScale: { axisPressedMouseMove: false },
            width: containerRef.current.clientWidth,
            height: 220,
        });

        chartRef.current = chart;

        if (effectiveMode === "candle") {
            const series = chart.addSeries(CandlestickSeries, {
                upColor: "#22c55e",
                downColor: "#ef4444",
                borderUpColor: "#22c55e",
                borderDownColor: "#ef4444",
                wickUpColor: "#22c55e80",
                wickDownColor: "#ef444480",
            });
            series.setData(
                candles.map((c) => ({
                    time: c.time as UTCTimestamp,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                }))
            );
            seriesRef.current = series;
        } else {
            const lineColor = isPositive ? "#22c55e" : "#ef4444";
            const series = chart.addSeries(AreaSeries, {
                lineColor,
                topColor: isPositive ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                bottomColor: isPositive ? "rgba(34,197,94,0)" : "rgba(239,68,68,0)",
                lineWidth: 2,
            });
            series.setData(
                candles.map((c) => ({
                    time: c.time as UTCTimestamp,
                    value: c.close,
                }))
            );
            seriesRef.current = series;
        }

        chart.timeScale().fitContent();

        // Tooltip
        chart.subscribeCrosshairMove((param) => {
            if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
                setTooltip(null);
                return;
            }
            const s = seriesRef.current;
            if (!s) return;

            const d = param.seriesData.get(s) as any;
            const price = d?.close ?? d?.value;
            if (price === undefined) { setTooltip(null); return; }

            const firstOpen = candles[0].open;
            const chg = firstOpen > 0 ? ((price - firstOpen) / firstOpen * 100).toFixed(2) : "0";
            const date = new Date((param.time as number) * 1000);
            setTooltip({
                price,
                time: date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
                change: chg,
                x: param.point.x,
                y: param.point.y,
            });
        });

        // Resize
        const obs = new ResizeObserver((entries) => {
            for (const e of entries) chart.applyOptions({ width: e.contentRect.width });
        });
        obs.observe(containerRef.current);

        return () => {
            obs.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [candles, effectiveMode]);

    return (
        <Card className="bg-[#111] border-[#222] overflow-hidden">
            <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <div className="flex items-center gap-3">
                        {lastPrice !== undefined && (
                            <span className="text-sm font-semibold text-white">
                                ${formatChartPrice(lastPrice)}
                            </span>
                        )}
                        {priceChange !== null && (
                            <span className={`text-xs font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                                {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
                            </span>
                        )}
                    </div>
                    {canToggleMode && (
                        <button
                            onClick={() => setChartMode(chartMode === "candle" ? "area" : "candle")}
                            className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <Icon
                                icon={chartMode === "candle" ? "solar:chart-2-linear" : "solar:chart-bold"}
                                className="w-4 h-4"
                            />
                        </button>
                    )}
                </div>

                {/* Timeframe selector */}
                <div className="flex items-center gap-1 px-4 pb-2">
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf.value}
                            onClick={() => setTimeframe(tf.value)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                timeframe === tf.value
                                    ? "bg-white/10 text-white"
                                    : "text-gray-500 hover:text-white"
                            }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                {/* Chart */}
                {isLoading ? (
                    <div className="h-[220px] px-4 pb-2">
                        <Skeleton className="w-full h-full rounded-lg" />
                    </div>
                ) : candles && candles.length > 0 ? (
                    <div className="relative h-[220px] px-2 pb-1">
                        <div ref={containerRef} className="w-full h-full [&_a[href*='tradingview']]:!hidden" />
                        {tooltip && (
                            <div
                                className="absolute bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 shadow-xl pointer-events-none z-10"
                                style={{
                                    left: Math.min(tooltip.x, (containerRef.current?.clientWidth ?? 200) - 150),
                                    top: Math.max(0, tooltip.y - 65),
                                }}
                            >
                                <p className="text-[10px] text-gray-500 mb-0.5">{tooltip.time}</p>
                                <p className="text-sm font-semibold text-white">
                                    ${formatChartPrice(tooltip.price)}
                                </p>
                                <p className={`text-[10px] font-semibold ${parseFloat(tooltip.change) >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    Chg: {parseFloat(tooltip.change) >= 0 ? "+" : ""}{tooltip.change}%
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-[220px] flex flex-col items-center justify-center text-center px-4">
                        <Icon icon="solar:chart-2-linear" className="w-8 h-8 text-gray-700 mb-2" />
                        <p className="text-xs text-gray-500">No chart data for {tokenSymbol}</p>
                        <p className="text-[10px] text-gray-600">This token may not have enough trading history</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
