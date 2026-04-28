"use client";

import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketPulse } from "@/app/(hooks)/queries/use-market-pulse";
import { Icon } from "@iconify/react";
import Image from "next/image";

const TOKEN_ICONS: Record<string, string> = {
  TON: "/svg/ton-logo.svg",
};

function formatPrice(price: number) {
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
  }

  if (price >= 1) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return price.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function formatChange(change24h: string) {
  const normalized = change24h.replace(/\u2212/g, "-");
  const isPositive =
    normalized.startsWith("+") ||
    (!normalized.startsWith("-") && parseFloat(normalized) >= 0);

  return {
    isPositive,
    value: normalized.replace(/[+\-%]/g, ""),
  };
}

function formatCompactUsd(value: number) {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function FearGreedGauge({ value }: { value: number }) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <svg
      viewBox="0 0 28 28"
      className="w-7 h-7 shrink-0"
      aria-label={`Fear and Greed Index ${clampedValue}`}
    >
      <path
        d="M4 20a10 10 0 0 1 20 0"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M4 20a10 10 0 0 1 20 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={`${clampedValue} 100`}
        className={
          clampedValue >= 60
            ? "text-green-500"
            : clampedValue >= 40
              ? "text-amber-500"
              : "text-red-500"
        }
      />
    </svg>
  );
}

export default function MarketPulse() {
  const { data, isLoading } = useMarketPulse();
  const ton = data?.ton;
  const totalMarketCapUsd = data?.totalMarketCapUsd ?? null;
  const totalMarketCapChange24h = data?.totalMarketCapChange24h ?? null;
  const fearGreed = data?.fearGreed ?? null;

  if (isLoading) {
    return (
      <div className="w-full overflow-x-auto scrollbar-hide">
        <div className="flex w-max max-w-none gap-2.5 px-[5vw] pb-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-36 shrink-0 rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  const pillsRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // GSAP stagger entrance for the pill chips
  useEffect(() => {
    if (isLoading || hasAnimated.current || !pillsRef.current) return;
    const pills = pillsRef.current.children;
    if (!pills.length) return;
    hasAnimated.current = true;

    import("@/lib/gsap")
      .then((m) => m.loadGsap())
      .then(({ gsap }) => {
        gsap.fromTo(
          pills,
          { x: 30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: "power3.out" },
        );
      });
  }, [isLoading, ton, totalMarketCapUsd, fearGreed]);

  if (!ton && !totalMarketCapUsd && !fearGreed) return null;

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div ref={pillsRef} className="flex w-max max-w-none gap-2.5 px-[5vw] pb-2">
        {ton ? (() => {
          const change = formatChange(ton.change24h);

          return (
            <div
              key={ton.symbol}
              className="w-36 flex-shrink-0 flex items-center gap-3 bg-secondary rounded-xl px-3 py-2 shadow-sm"
            >
              {TOKEN_ICONS[ton.symbol] ? (
                <Image
                  src={TOKEN_ICONS[ton.symbol]}
                  alt={ton.symbol}
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full flex-shrink-0"
                  unoptimized
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-neutral-700 flex-shrink-0" />
              )}

              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-neutral-400 tracking-wider">
                  {ton.symbol}
                </span>
                <span className="text-sm font-bold text-white tracking-tight">
                  ${formatPrice(ton.price)}
                </span>
              </div>

              <div
                className={`flex items-center gap-0.5 text-xs font-bold ${
                  change.isPositive ? "text-green-500" : "text-red-500"
                }`}
              >
                {change.isPositive ? "+" : "-"}
                {change.value}%
              </div>
            </div>
          );
        })() : null}

        {totalMarketCapUsd ? (
          <div className="w-40 flex-shrink-0 flex items-center gap-2.5 bg-secondary rounded-xl px-3 py-2 shadow-sm">
            <Icon icon="fluent-mdl2:market" width="20" height="20" className="text-white flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-neutral-400 tracking-wider whitespace-nowrap">
                Crypto MC
              </span>
              <span className="text-sm font-bold text-white tracking-tight">
                {formatCompactUsd(totalMarketCapUsd)}
              </span>
            </div>
            {totalMarketCapChange24h !== null ? (
              <div
                className={`text-xs font-bold whitespace-nowrap ${
                  totalMarketCapChange24h >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {totalMarketCapChange24h >= 0 ? "+" : ""}
                {totalMarketCapChange24h.toFixed(2)}%
              </div>
            ) : null}
          </div>
        ) : null}

        {fearGreed ? (
          <div className="w-[11.5rem] flex-shrink-0 flex items-center gap-3 bg-secondary rounded-xl px-3 py-2 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <FearGreedGauge value={fearGreed.value} />
              <span className="flex min-w-0 flex-col">
                <span className="whitespace-nowrap text-[10px] font-bold text-neutral-400">
                  Fear & Greed
                </span>
                <span className="text-sm font-bold text-white tracking-tight">
                  {fearGreed.value}
                </span>
              </span>
            </div>
            <div
              className={`ml-0.5 flex h-full items-center text-xs font-bold whitespace-nowrap ${
                fearGreed.value >= 60
                  ? "text-green-500"
                  : fearGreed.value >= 40
                    ? "text-amber-500"
                    : "text-red-500"
              }`}
            >
              {fearGreed.classification}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
