"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import {
    createChart,
    AreaSeries,
    type IChartApi,
    type ISeriesApi,
    type UTCTimestamp,
    ColorType,
    CrosshairMode,
    type AreaData,
} from "lightweight-charts";

interface SpotPriceChartProps {
    priceTon?: number;
    tokenSymbol: string;
    tonPrice: number;
}

interface PricePoint {
    time: number;
    value: number;
}

export default function SpotPriceChart({ priceTon, tokenSymbol, tonPrice }: SpotPriceChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
    const priceHistory = useRef<PricePoint[]>([]);
    const lastPriceRef = useRef<number | undefined>(undefined);
    const [hasData, setHasData] = useState(false);
    const [tooltip, setTooltip] = useState<{ price: number; time: string; x: number; y: number } | null>(null);

    // Append new price point when price changes
    useEffect(() => {
        if (priceTon === undefined || priceTon <= 0) return;
        if (priceTon === lastPriceRef.current) return;
        lastPriceRef.current = priceTon;

        const now = Math.floor(Date.now() / 1000);
        // Avoid duplicate timestamps
        const last = priceHistory.current[priceHistory.current.length - 1];
        if (last && last.time === now) return;

        priceHistory.current.push({ time: now, value: priceTon });

        if (priceHistory.current.length > 500) {
            priceHistory.current = priceHistory.current.slice(-500);
        }

        const hasMultiple = priceHistory.current.length > 1;
        setHasData(hasMultiple);

        // Update chart series
        if (seriesRef.current && hasMultiple) {
            try {
                seriesRef.current.update({
                    time: now as UTCTimestamp,
                    value: priceTon,
                });
            } catch {
                // If update fails, set full data
                const data: AreaData<UTCTimestamp>[] = priceHistory.current.map((p) => ({
                    time: p.time as UTCTimestamp,
                    value: p.value,
                }));
                seriesRef.current.setData(data);
            }
        }
    }, [priceTon]);

    // Create chart once container is available and we have data
    useEffect(() => {
        if (!containerRef.current || !hasData) return;

        // Cleanup existing
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
            seriesRef.current = null;
        }

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
                secondsVisible: true,
            },
            rightPriceScale: {
                borderColor: "#1a1a1a",
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            handleScroll: { vertTouchDrag: false },
            handleScale: { axisPressedMouseMove: false },
            width: containerRef.current.clientWidth,
            height: 200,
        });

        chartRef.current = chart;

        const series = chart.addSeries(AreaSeries, {
            lineColor: "#22c55e",
            topColor: "rgba(34,197,94,0.2)",
            bottomColor: "rgba(34,197,94,0)",
            lineWidth: 2,
            priceFormat: { type: "price", precision: 8, minMove: 0.00000001 },
        });

        seriesRef.current = series;

        // Set existing data
        if (priceHistory.current.length > 1) {
            const data: AreaData<UTCTimestamp>[] = priceHistory.current.map((p) => ({
                time: p.time as UTCTimestamp,
                value: p.value,
            }));
            series.setData(data);
            chart.timeScale().fitContent();
        }

        // Tooltip
        chart.subscribeCrosshairMove((param) => {
            if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
                setTooltip(null);
                return;
            }
            const d = param.seriesData.get(series) as AreaData<UTCTimestamp> | undefined;
            if (d?.value !== undefined) {
                const date = new Date((param.time as number) * 1000);
                setTooltip({
                    price: d.value,
                    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
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
            seriesRef.current = null;
        };
    }, [hasData]);

    return (
        <Card className="bg-[#111] border-[#222] overflow-hidden">
            <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">Live</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                        {tokenSymbol}/TON
                    </span>
                </div>

                {hasData ? (
                    <div className="relative h-[200px] px-2">
                        <div ref={containerRef} className="w-full h-full" />
                        {tooltip && (
                            <div
                                className="absolute bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 shadow-xl pointer-events-none z-10"
                                style={{
                                    left: Math.min(tooltip.x, (containerRef.current?.clientWidth ?? 200) - 140),
                                    top: Math.max(0, tooltip.y - 60),
                                }}
                            >
                                <p className="text-[10px] text-gray-500 mb-0.5">{tooltip.time}</p>
                                <p className="text-sm font-semibold text-white">
                                    {tooltip.price < 0.001 ? tooltip.price.toFixed(8) : tooltip.price.toFixed(4)} TON
                                </p>
                                {tonPrice > 0 && (
                                    <p className="text-[10px] text-gray-500">
                                        ≈ ${(tooltip.price * tonPrice).toFixed(6)}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-[200px] flex flex-col items-center justify-center text-center px-4">
                        <Icon icon="solar:chart-2-linear" className="w-8 h-8 text-gray-700 mb-2" />
                        <p className="text-xs text-gray-500">Collecting price data...</p>
                        <p className="text-[10px] text-gray-600">Chart builds as prices update (~15s)</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
