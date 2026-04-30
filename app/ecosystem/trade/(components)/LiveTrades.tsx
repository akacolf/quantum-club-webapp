"use client";

/**
 * On-Chain Live Trades Component
 * Fetches trade data directly from blockchain transactions via TONAPI
 * No Firebase dependency - truly on-chain!
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icon } from "@iconify/react";
import { useWallet } from "@/app/wallet/WalletContext";
import { formatCompactNumber } from "@/lib/jetton-operations";
import { useLiveTrades } from "@/app/(hooks)/queries/use-trades";
import { Address } from "@ton/core";

interface LiveTradesProps {
    tokenId: string;
    tokenSymbol: string;
    jettonAddress?: string;
}

export default function LiveTrades({ tokenSymbol, jettonAddress }: LiveTradesProps) {
    const { tonPrice, isTestnet } = useWallet();
    const { data: trades = [], isFetching: isLoading } = useLiveTrades(jettonAddress, isTestnet);

    const formatTimeAgo = (date: Date) => {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return "just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    // Convert raw address (0:...) to friendly format (UQ.../EQ...)
    const toFriendlyAddress = (address: string): string => {
        if (!address) return "Unknown";
        try {
            // If already friendly format, return as is
            if (address.startsWith("UQ") || address.startsWith("EQ") || address.startsWith("kQ")) {
                return address;
            }
            // Convert raw address to friendly
            const parsedAddress = Address.parse(address);
            return parsedAddress.toString({ bounceable: false });
        } catch {
            return address;
        }
    };

    const truncateAddress = (address: string) => {
        const friendly = toFriendlyAddress(address);
        if (friendly.length > 20) {
            return `${friendly.slice(0, 4)}...${friendly.slice(-4)}`;
        }
        return friendly;
    };

    const openTonviewer = (hash: string) => {
        const baseUrl = isTestnet 
            ? "https://testnet.tonviewer.com" 
            : "https://tonviewer.com";
        window.open(`${baseUrl}/transaction/${hash}`, "_blank");
    };

    if (isLoading) {
        return (
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Icon icon="solar:transfer-horizontal-bold" className="w-5 h-5 text-primary animate-pulse" />
                        <h3 className="font-semibold text-white">Live Trades</h3>
                        <Badge variant="secondary" className="bg-transparent text-green-400 border-0 px-0 text-[9px] ml-auto">
                            On-chain
                        </Badge>
                    </div>
                    <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                        <ButtonLoader size="sm" />
                        <span className="ml-2">Loading from blockchain...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!jettonAddress) {
        return (
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Icon icon="solar:transfer-horizontal-bold" className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-white">Live Trades</h3>
                    </div>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Icon icon="solar:danger-triangle-bold" className="w-8 h-8 text-orange-400/50 mb-2" />
                        <p className="text-muted-foreground text-sm">Contract not deployed</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (trades.length === 0) {
        return (
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Icon icon="solar:transfer-horizontal-bold" className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-white">Live Trades</h3>
                        <Badge variant="secondary" className="bg-transparent text-green-400 border-0 px-0 text-[9px] ml-auto">
                            On-chain
                        </Badge>
                    </div>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Icon icon="solar:inbox-bold" className="w-8 h-8 text-muted-foreground/50 mb-2" />
                        <p className="text-muted-foreground text-sm">No trades yet</p>
                        <p className="text-muted-foreground/60 text-xs">Be the first to trade!</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Icon icon="solar:transfer-horizontal-bold" className="w-5 h-5 text-primary" />
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        </div>
                        <h3 className="font-semibold text-white">Live Trades</h3>
                        <Badge variant="secondary" className="bg-transparent text-green-400 border-0 px-0 text-[9px]">
                            On-chain
                        </Badge>
                    </div>
                    <Badge variant="secondary" className="bg-white/5 text-xs">
                        {trades.length} trades
                    </Badge>
                </div>

                <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                        {trades.map((trade, index) => {
                            const isBuy = trade.type === "buy";
                            const tokenAmountFormatted = formatCompactNumber(trade.tokenAmount, 2);
                            const tonValue = trade.tonAmount;
                            const usdValue = tonValue * (tonPrice || 5);
                            const tonAmountFormatted = formatCompactNumber(tonValue, 2);
                            const usdAmountFormatted = formatCompactNumber(usdValue, 0);

                            return (
                                <button
                                    key={trade.id}
                                    onClick={() => openTonviewer(trade.hash)}
                                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] transition-colors text-left"
                                    style={{
                                        animation: index === 0 ? "fadeIn 0.3s ease-out" : undefined,
                                    }}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBuy
                                                ? "bg-transparent text-green-400"
                                                : "bg-red-500/20 text-red-400"
                                                }`}
                                        >
                                            <Icon
                                                icon={isBuy ? "solar:graph-up-bold" : "solar:graph-down-bold"}
                                                className="w-4 h-4"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-xs font-medium ${isBuy ? "text-green-400" : "text-red-400"}`}>
                                                    {isBuy ? "Buy" : "Sell"}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {truncateAddress(trade.walletAddress)}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                {formatTimeAgo(trade.timestamp)}
                                                <Icon icon="solar:link-bold" className="w-2.5 h-2.5 opacity-50" />
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xs font-medium text-white">
                                            {tokenAmountFormatted} {tokenSymbol}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {tonAmountFormatted} TON • ${usdAmountFormatted}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
