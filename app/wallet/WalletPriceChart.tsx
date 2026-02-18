"use client";

import { useEffect, useRef, useState } from "react";
import {
    createChart,
    AreaSeries,
    type IChartApi,
    type ISeriesApi,
    type UTCTimestamp,
    ColorType,
    CrosshairMode,
    type AreaData,
    type Time,
} from "lightweight-charts";

interface PricePoint {
    time: string;
    price: number;
}

interface WalletPriceChartProps {
    data: PricePoint[];
    color: string;
}

export function WalletPriceChart({ data, color }: WalletPriceChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
    const [tooltip, setTooltip] = useState<{ price: number; visible: boolean; x: number; y: number } | null>(null);

    // Parse time strings to timestamps for TradingView
    const chartData: AreaData<UTCTimestamp>[] = data.map((point, index) => ({
        time: (Math.floor(Date.now() / 1000) - (data.length - index) * 60) as UTCTimestamp,
        value: point.price,
    }));

    useEffect(() => {
        if (!containerRef.current || chartData.length === 0) return;

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
                visible: false,
            },
            rightPriceScale: {
                borderColor: "#1a1a1a",
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            handleScroll: { vertTouchDrag: false },
            handleScale: { axisPressedMouseMove: false },
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
        });

        chartRef.current = chart;

        const series = chart.addSeries(AreaSeries, {
            lineColor: color,
            topColor: color + "33",
            bottomColor: color + "00",
            lineWidth: 2,
            priceFormat: { type: "price", precision: 2, minMove: 0.01 },
        });

        series.setData(chartData);
        seriesRef.current = series;
        chart.timeScale().fitContent();

        // Tooltip on crosshair
        chart.subscribeCrosshairMove((param) => {
            if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
                setTooltip(null);
                return;
            }
            const areaData = param.seriesData.get(series) as AreaData<Time> | undefined;
            if (areaData?.value !== undefined) {
                setTooltip({
                    price: areaData.value,
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
                chart.applyOptions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, color]);

    return (
        <div className="relative w-full h-full">
            <div ref={containerRef} className="w-full h-full" />
            {tooltip?.visible && (
                <div
                    className="absolute bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 shadow-xl pointer-events-none z-10"
                    style={{
                        left: Math.min(tooltip.x, (containerRef.current?.clientWidth ?? 200) - 100),
                        top: Math.max(0, tooltip.y - 40),
                    }}
                >
                    <p className="text-white font-bold text-sm">${tooltip.price.toFixed(2)}</p>
                </div>
            )}
        </div>
    );
}
