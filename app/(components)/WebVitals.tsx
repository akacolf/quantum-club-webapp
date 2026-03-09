"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Reports Core Web Vitals (FCP, LCP, CLS, INP, TTFB) for real-user monitoring.
 * Especially important for Telegram Mini App where perceived perf matters.
 *
 * Sends metrics to Vercel Analytics (if enabled) and logs in dev.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // Log in development for debugging
    if (process.env.NODE_ENV === "development") {
      console.log(`[WebVitals] ${metric.name}:`, Math.round(metric.value), "ms");
    }

    // Send to analytics endpoint (navigator.sendBeacon for reliable delivery)
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
      });
      navigator.sendBeacon("/api/vitals", body);
    }
  });

  return null;
}
