"use client";

import { useState, useSyncExternalStore, use } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpotTokens, useSpotTokenDetail, useSpotTokenPrice, useSpotTokenMarket, useSpotTokenDyor, useXStocksTokens } from "@/app/(hooks)/queries/use-spot-trading";
import { useWallet } from "@/app/wallet/WalletContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { isXStockSymbol, XSTOCKS_ACK_LOCAL_KEY } from "@/lib/xstocks";
import { StocksComplianceGate } from "../../stocks/(components)/StocksComplianceGate";
import SpotTokenDetail from "../(components)/SpotTokenDetail";
const SpotPriceChart = dynamic(() => import("../(components)/SpotPriceChart"), {
    loading: () => <Skeleton className="h-[260px] w-full rounded-xl" />,
    ssr: false,
});
import SpotTradingPanel from "../(components)/SpotTradingPanel";

const subscribeAck = (cb: () => void) => {
    window.addEventListener("storage", cb);
    return () => window.removeEventListener("storage", cb);
};
const getAckSnapshot = (): boolean => {
    try {
        return localStorage.getItem(XSTOCKS_ACK_LOCAL_KEY) !== null;
    } catch {
        return false;
    }
};
const getAckServerSnapshot = (): null => null;

export default function SpotTokenDetailPage({ params }: { params: Promise<{ address: string }> }) {
    const { address } = use(params);
    const decodedAddress = decodeURIComponent(address);
    const searchParams = useSearchParams();
    const backTo = searchParams.get("from") ?? "/ecosystem/trade/spot";
    useTelegramBackButton(backTo);

    const { tonPrice } = useWallet();
    const { data: tokens, isLoading: isLoadingSwappable } = useSpotTokens();
    const swappableMatch = tokens?.find((t) => t.contractAddress === decodedAddress);
    // xStocks aren't in the swappable list — always check the xStocks list as fallback
    const { data: stockTokens, isLoading: isLoadingStocks } = useXStocksTokens(!swappableMatch);
    const stockMatch = stockTokens?.find((t) => t.contractAddress === decodedAddress);
    const token = swappableMatch ?? stockMatch;
    const isLoadingTokens = isLoadingSwappable || (!swappableMatch && isLoadingStocks);

    const [localAck, setLocalAck] = useState(false);
    const persistedAck = useSyncExternalStore(subscribeAck, getAckSnapshot, getAckServerSnapshot);
    const acknowledged = persistedAck === null ? null : persistedAck || localAck;
    const isStock = token ? isXStockSymbol(token.symbol) : false;
    const { data: detail, isLoading: isLoadingDetail } = useSpotTokenDetail(decodedAddress);
    const { data: priceData } = useSpotTokenPrice(decodedAddress, token?.decimals);
    const { data: market, isLoading: isLoadingMarket } = useSpotTokenMarket(decodedAddress);
    const { data: dyor } = useSpotTokenDyor(decodedAddress);

    const [tradingOpen, setTradingOpen] = useState(false);
    const [initialTab, setInitialTab] = useState<"buy" | "sell">("buy");

    if (isLoadingTokens) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 p-4 space-y-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-14 h-14 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-[260px] w-full rounded-xl" />
            </div>
        );
    }

    if (!token) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-lg font-bold text-white mb-2">Token not found</p>
                    <p className="text-sm text-muted-foreground">This token may not be available on STON.fi</p>
                </div>
            </div>
        );
    }

    if (isStock && acknowledged === null) {
        return null;
    }
    if (isStock && !acknowledged) {
        return <StocksComplianceGate onAcknowledge={() => setLocalAck(true)} />;
    }

    const openTrade = (tab: "buy" | "sell") => {
        setInitialTab(tab);
        setTradingOpen(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-40">
            <div className="px-4 pt-4 space-y-4">
                <SpotTokenDetail
                    token={token}
                    detail={detail}
                    market={market}
                    dyor={dyor}
                    priceTon={priceData?.priceTon}
                    tonPrice={tonPrice}
                    isLoadingDetail={isLoadingDetail}
                    isLoadingMarket={isLoadingMarket}
                />

                <SpotPriceChart
                    poolAddress={market?.poolAddress}
                    tokenAddress={token.contractAddress}
                    tokenSymbol={token.symbol}
                />
            </div>

            {/* Floating Buy/Sell Buttons */}
            <div className="fixed bottom-36 left-0 right-0 px-4 z-40">
                <div className="flex gap-3 max-w-md mx-auto">
                    <Button
                        onClick={() => openTrade("buy")}
                        className="flex-1 h-12 bg-green-500 hover:bg-green-600 text-white font-bold text-base rounded-xl shadow-none"
                    >
                        Buy
                    </Button>
                    <Button
                        onClick={() => openTrade("sell")}
                        className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white font-bold text-base rounded-xl shadow-none"
                    >
                        Sell
                    </Button>
                </div>
            </div>

            <SpotTradingPanel
                token={token}
                open={tradingOpen}
                onOpenChange={setTradingOpen}
                initialTab={initialTab}
            />
        </div>
    );
}
