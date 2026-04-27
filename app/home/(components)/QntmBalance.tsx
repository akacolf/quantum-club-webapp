"use client";

import { useState } from "react";
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
          <div className="text-5xl font-bold text-white tracking-tight">
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

      <div className="mt-3 flex items-center gap-1.5 text-sm">
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
