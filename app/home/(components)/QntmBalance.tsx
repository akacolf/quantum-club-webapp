"use client";

import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { QntmBalanceProps } from "@/lib/interfaces";
import { Icon } from "@iconify/react";

export default function QntmBalance({
  MainQuantAmount,
  rank,
  getRankIcon,
  isLoading,
  walletUsdBalance = "0.00",
  isWalletLoading = false,
  hasWallet = false,
}: QntmBalanceProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [balanceMode, setBalanceMode] = useState<"qntm" | "wallet">("qntm");
  const showingWallet = balanceMode === "wallet";
  const loadingValue = showingWallet ? isWalletLoading : isLoading;

  const displayValue = showingWallet
    ? `$${Number(walletUsdBalance || "0").toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : MainQuantAmount;

  // Animated balance ref
  const balanceRef = useRef<HTMLDivElement>(null);
  const prevValue = useRef<string | null>(null);

  // GSAP-powered balance reveal + number change animation
  useEffect(() => {
    if (loadingValue || !balanceRef.current) return;
    const el = balanceRef.current;

    // First render: slide up from below
    if (prevValue.current === null) {
      prevValue.current = displayValue;
      import("@/lib/gsap")
        .then((m) => m.loadGsap())
        .then(({ gsap }) => {
          gsap.fromTo(
            el,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
          );
        });
      return;
    }

    // Subsequent changes: subtle flip effect
    if (prevValue.current !== displayValue) {
      prevValue.current = displayValue;
      import("@/lib/gsap")
        .then((m) => m.loadGsap())
        .then(({ gsap }) => {
          gsap
            .timeline()
            .to(el, {
              y: -8,
              opacity: 0,
              duration: 0.18,
              ease: "power2.in",
            })
            .set(el, { y: 12 })
            .to(el, {
              y: 0,
              opacity: 1,
              duration: 0.35,
              ease: "power3.out",
            });
        });
    }
  }, [displayValue, loadingValue]);

  // Rank badge reveal animation
  const rankRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isLoading || !rankRef.current || !rank) return;
    import("@/lib/gsap")
      .then((m) => m.loadGsap())
      .then(({ gsap }) => {
        gsap.fromTo(
          rankRef.current,
          { x: -12, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, delay: 0.3, ease: "power3.out" },
        );
      });
  }, [isLoading, rank]);

  return (
    <div className="flex flex-col py-2 relative">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-neutral-400">
          Total balance
        </span>
        <div onClick={() => setIsVisible(!isVisible)} className="cursor-pointer text-neutral-400 hover:text-white transition-colors">
          <Icon icon={isVisible ? "lucide:eye" : "lucide:eye-off"} width="16" height="16" />
        </div>
        <button
          type="button"
          onClick={() => setBalanceMode((mode) => (mode === "qntm" ? "wallet" : "qntm"))}
          className="text-neutral-400 hover:text-white transition-colors"
          aria-label="Switch balance"
        >
          <Icon icon="lucide:repeat-2" width="16" height="16" />
        </button>
      </div>

      <div className="flex items-end gap-2">
        {loadingValue ? (
          <Skeleton className="h-12 w-40 rounded-lg bg-[#1a1a1a]" />
        ) : (
          <div
            ref={balanceRef}
            className="text-5xl font-bold text-white tracking-tight"
            style={{ opacity: 0 }}
          >
            {isVisible ? displayValue : "********"}
          </div>
        )}
        {!showingWallet ? (
          <div className="pb-1.5 text-xl font-medium text-white flex items-center gap-1">
            QNTM
          </div>
        ) : null}
      </div>

      {showingWallet && !hasWallet ? (
        <div className="mt-2 text-xs text-neutral-500">No imported wallet</div>
      ) : null}

      <div ref={rankRef} className="mt-3 flex items-center gap-1.5 text-sm" style={{ opacity: 0 }}>
        <span className="text-neutral-400">Rank</span>
        <div className="font-bold text-white flex items-center gap-1">
          {isLoading ? (
            <Skeleton className="h-4 w-12 bg-[#222]" />
          ) : (
            <>
              {getRankIcon(rank)}
              <span>{rank}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
