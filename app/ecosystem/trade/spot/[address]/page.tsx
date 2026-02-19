"use client";

import React, { useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpotTokens, useSpotTokenDetail, useSpotTokenPrice } from "@/app/(hooks)/queries/use-spot-trading";
import { useWallet } from "@/app/wallet/WalletContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import SpotTokenDetail from "../(components)/SpotTokenDetail";
import SpotPriceChart from "../(components)/SpotPriceChart";
import SpotTradingPanel from "../(components)/SpotTradingPanel";

export default function SpotTokenDetailPage({ params }: { params: Promise<{ address: string }> }) {
    const { address } = use(params);
    const decodedAddress = decodeURIComponent(address);
    useTelegramBackButton("/ecosystem/trade/spot");

    const { tonPrice } = useWallet();
    const { data: tokens, isLoading: isLoadingTokens } = useSpotTokens();
    const { data: detail, isLoading: isLoadingDetail } = useSpotTokenDetail(decodedAddress);
    const { data: priceData } = useSpotTokenPrice(decodedAddress, undefined);

    const [tradingOpen, setTradingOpen] = useState(false);
    const [tradingTab, setTradingTab] = useState<"buy" | "sell">("buy");

    // Find the token from STON.fi asset list
    const token = tokens?.find((t) => t.contractAddress === decodedAddress);

    if (isLoadingTokens) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 p-4 space-y-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-lg font-bold text-white mb-2">Token not found</p>
                    <p className="text-sm text-muted-foreground">This token may not be available on STON.fi</p>
                </div>
            </div>
        );
    }

    const openTrade = (tab: "buy" | "sell") => {
        setTradingTab(tab);
        setTradingOpen(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-32">
            <div className="px-4 pt-4 space-y-4">
                <SpotTokenDetail
                    token={token}
                    detail={detail}
                    priceTon={priceData?.priceTon}
                    tonPrice={tonPrice}
                    isLoadingDetail={isLoadingDetail}
                />

                <SpotPriceChart
                    priceTon={priceData?.priceTon}
                    tokenSymbol={token.symbol}
                    tonPrice={tonPrice}
                />
            </div>

            {/* Floating Buy/Sell Buttons */}
            <div className="fixed bottom-24 left-0 right-0 px-4 z-40">
                <div className="flex gap-2 max-w-md mx-auto">
                    <Button
                        onClick={() => openTrade("buy")}
                        className="flex-1 h-12 bg-green-500 hover:bg-green-600 text-white font-bold text-base rounded-xl shadow-lg shadow-green-500/20"
                    >
                        Buy
                    </Button>
                    <Button
                        onClick={() => openTrade("sell")}
                        className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white font-bold text-base rounded-xl shadow-lg shadow-red-500/20"
                    >
                        Sell
                    </Button>
                </div>
            </div>

            <SpotTradingPanel
                token={token}
                open={tradingOpen}
                onOpenChange={setTradingOpen}
                defaultTab={tradingTab}
            />
        </div>
    );
}
