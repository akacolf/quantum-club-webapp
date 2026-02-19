"use client";

import React, { useEffect, useRef, useCallback } from "react";
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
    time: number; // Unix seconds
    value: number;
}

export default function SpotPriceChart({ priceTon, tokenSymbol, tonPrice }: SpotPriceChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
    const priceHistory = useRef<PricePoint[]>([]);
    const lastPriceRef = useRef<number | undefined>(undefined);

    // Append new price point when price changes
    useEffect(() => {
        if (priceTon === undefined || priceTon <= 0) return;
        if (priceTon === lastPriceRef.current) return;
        lastPriceRef.current = priceTon;

        const now = Math.floor(Date.now() / 1000);
        priceHistory.current.push({ time: now, value: priceTon });

        // Keep max 500 points
        if (priceHistory.current.length > 500) {
            priceHistory.current = priceHistory.current.slice(-500);
        }

        // Update the series if it exists
        if (seriesRef.current && priceHistory.current.length > 1) {
            const data: AreaData<UTCTimestamp>[] = priceHistory.current.map((p) => ({
                time: p.time as UTCTimestamp,
                value: p.value,
            }));
            seriesRef.current.setData(data);
            chartRef.current?.timeScale().fitContent();
        }
    }, [priceTon]);

    // Create chart
    const createChartInstance = useCallback(() => {
        if (!containerRef.current) return;

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
            height: 160,
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
    }, []);

    useEffect(() => {
        const cleanup = createChartInstance();
        return cleanup;
    }, [createChartInstance]);

    const hasData = priceHistory.current.length > 1;

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
                    <div className="relative h-[160px] px-2">
                        <div ref={containerRef} className="w-full h-full" />
                    </div>
                ) : (
                    <div className="h-[160px] flex flex-col items-center justify-center text-center px-4">
                        <div ref={containerRef} className="hidden" />
                        <Icon icon="solar:chart-2-linear" className="w-8 h-8 text-gray-700 mb-2" />
                        <p className="text-xs text-gray-500">Collecting price data...</p>
                        <p className="text-[10px] text-gray-600">Chart builds as prices update</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
