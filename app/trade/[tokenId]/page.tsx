"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrading } from "@/app/(contexts)/TradingContext";
import { useWallet } from "@/app/wallet/WalletContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { formatPrice, formatMarketCap, formatCompactNumber } from "@/lib/bonding-curve";
import { toast } from "sonner";
import TokenChat from "@/app/trade/(components)/TokenChat";
import LiveTrades from "@/app/trade/(components)/LiveTrades";
import PriceChart from "@/app/trade/(components)/PriceChart";
import GraduatedTrading from "@/app/trade/(components)/GraduatedTrading";
import GraduationProgress from "@/app/trade/(components)/GraduationProgress";

export default function TokenDetailPage() {
    const params = useParams();
    const router = useRouter();
    const tokenId = params.tokenId as string;

    const {
        selectedToken,
        selectToken,
        clearSelectedToken,
        getPosition,
        previewBuy,
        previewSell,
        buyTokens,
        sellTokens,
        getAvailableToSell,
    } = useTrading();
    const { walletAddress, tonBalance, tonPrice } = useWallet();

    // Telegram back button
    useTelegramBackButton("/trade");

    const [activeTab, setActiveTab] = useState("buy");
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [preview, setPreview] = useState<{
        tokensReceived?: string;
        tonReceived?: string;
        averagePrice: string;
        fee: string;
        newPrice: string;
    } | null>(null);

    // Load token
    useEffect(() => {
        if (tokenId) {
            selectToken(tokenId);
        }
        return () => clearSelectedToken();
    }, [tokenId, selectToken, clearSelectedToken]);

    // Get user position
    const position = getPosition(tokenId);
    const availableToSell = getAvailableToSell(tokenId);

    // Preview calculation
    useEffect(() => {
        if (!amount || parseFloat(amount) <= 0 || !selectedToken) {
            setPreview(null);
            return;
        }

        if (activeTab === "buy") {
            const result = previewBuy(tokenId, amount);
            setPreview(result);
        } else {
            // For selling, amount is in tokens
            const result = previewSell(tokenId, amount);
            setPreview(result);
        }
    }, [amount, activeTab, tokenId, selectedToken, previewBuy, previewSell]);

    // Handle trade
    const handleTrade = async () => {
        if (!walletAddress) {
            toast.error("Please connect your wallet first");
            router.push("/wallet");
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setIsLoading(true);

        try {
            if (activeTab === "buy") {
                const result = await buyTokens(tokenId, amount);
                if (result.success) {
                    toast.success("Purchase successful! 🎉");
                    setAmount("");
                } else {
                    toast.error(result.error || "Transaction failed");
                }
            } else {
                const result = await sellTokens(tokenId, amount);
                if (result.success) {
                    toast.success("Sell successful! 💰");
                    setAmount("");
                } else {
                    toast.error(result.error || "Transaction failed");
                }
            }
        } catch {
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Quick amount buttons
    const quickAmounts = activeTab === "buy"
        ? ["0.1", "0.5", "1", "5"]
        : ["25%", "50%", "75%", "MAX"];

    const handleQuickAmount = (value: string) => {
        if (activeTab === "buy") {
            setAmount(value);
        } else {
            if (!position) return;
            const available = BigInt(availableToSell.amount);
            let percentage = 1;
            if (value === "25%") percentage = 0.25;
            else if (value === "50%") percentage = 0.5;
            else if (value === "75%") percentage = 0.75;

            const tokenAmount = (available * BigInt(Math.floor(percentage * 100))) / BigInt(100);
            setAmount(tokenAmount.toString());
        }
    };

    if (!selectedToken) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-32 px-4 pt-16">
                <TokenDetailSkeleton />
            </div>
        );
    }

    const priceChange = selectedToken.priceChange24h || 0;
    const isPositive = priceChange >= 0;

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-32">
            {/* Header - Using Telegram's native back button */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5">
                <div className="px-4 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 relative">
                        {selectedToken.image ? (
                            <Image src={selectedToken.image} alt={selectedToken.name} fill className="object-cover" unoptimized />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                                {selectedToken.symbol.slice(0, 2)}
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-white">{selectedToken.name}</h1>
                        <p className="text-sm text-muted-foreground">${selectedToken.symbol}</p>
                    </div>
                    <Badge
                        variant={selectedToken.status === "bonding" ? "default" : "secondary"}
                        className={selectedToken.status === "bonding" ? "bg-green-500/20 text-green-400" : ""}
                    >
                        {selectedToken.status === "bonding" ? "Active" : "Graduated"}
                    </Badge>
                </div>
            </div>

            <div className="px-4 py-4 space-y-4">
                {/* Price Card */}
                <Card className="bg-white/5 border-white/10 overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Icon icon="solar:tag-price-bold" className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Current Price</p>
                                    <p className="text-xl font-bold text-white">
                                        {formatPrice(BigInt(selectedToken.currentPrice || "0"))} TON
                                    </p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium ${isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                }`}>
                                <Icon icon={isPositive ? "solar:graph-up-bold" : "solar:graph-down-bold"} className="w-4 h-4" />
                                {isPositive ? "+" : "-"}{Math.abs(priceChange).toFixed(2)}%
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Icon icon="solar:chart-2-bold" className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">MCap</p>
                                    <p className="text-xs font-semibold text-white">
                                        {formatMarketCap(BigInt(selectedToken.marketCap || "0"), tonPrice || 5)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <Icon icon="solar:users-group-two-rounded-bold" className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Holders</p>
                                    <p className="text-xs font-semibold text-white">{selectedToken.holders}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                    <Icon icon="solar:graph-new-bold" className="w-4 h-4 text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">24h Vol</p>
                                    <p className="text-xs font-semibold text-white">
                                        {parseFloat(selectedToken.volume24h || "0").toFixed(1)} TON
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Additional Stats Row */}
                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <Icon icon="solar:wallet-money-bold" className="w-4 h-4 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Collected</p>
                                    <p className="text-xs font-semibold text-white">
                                        {(Number(selectedToken.reserveBalance || "0") / 1e9).toFixed(1)} TON
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                    <Icon icon="solar:transfer-horizontal-bold" className="w-4 h-4 text-cyan-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Trades</p>
                                    <p className="text-xs font-semibold text-white">{selectedToken.trades24h || 0}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                                    <Icon icon="solar:rocket-2-bold" className="w-4 h-4 text-pink-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">To Grad</p>
                                    <p className="text-xs font-semibold text-white">
                                        ${formatCompactNumber(Math.max(0, 69000 - (Number(selectedToken.marketCap || "0") / 1e9 * (tonPrice || 5))), 0)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Price Chart */}
                <PriceChart tokenId={tokenId} currentPrice={selectedToken.currentPrice} />

                {/* Live Trades */}
                <LiveTrades tokenId={tokenId} tokenSymbol={selectedToken.symbol} />

                {/* User Position (if exists) */}
                {position && BigInt(position.balance) > BigInt(0) && (
                    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                    <Icon icon="solar:wallet-money-bold" className="w-4 h-4 text-primary" />
                                </div>
                                <h3 className="font-semibold text-white">Your Position</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-white/5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon icon="solar:coins-bold" className="w-4 h-4 text-yellow-400" />
                                        <p className="text-xs text-muted-foreground">Balance</p>
                                    </div>
                                    <p className="text-lg font-bold text-white">
                                        {(Number(position.balance) / 1e9).toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">{selectedToken.symbol}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon icon="solar:dollar-minimalistic-bold" className="w-4 h-4 text-green-400" />
                                        <p className="text-xs text-muted-foreground">Value</p>
                                    </div>
                                    <p className="text-lg font-bold text-white">
                                        {((Number(position.balance) / 1e9) * (Number(selectedToken.currentPrice) / 1e9)).toFixed(4)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">TON</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Graduation Progress - Only for bonding tokens */}
                {selectedToken.status === "bonding" && (
                    <GraduationProgress token={selectedToken} tonPriceUsd={tonPrice || 5} />
                )}

                {/* Trading Panel - Show different UI based on graduation status */}
                {selectedToken.status === "graduated" ? (
                    <GraduatedTrading token={selectedToken} />
                ) : (
                    <Card className="bg-white/5 border-white/10 overflow-hidden">
                        <CardContent className="p-4">
                            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setAmount(""); }}>
                                <TabsList className="w-full bg-white/5 p-1 mb-4 h-11 rounded-xl">
                                    <TabsTrigger
                                        value="buy"
                                        className="flex-1 h-full gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg"
                                    >
                                        <Icon icon="solar:bag-smile-bold" className="w-4 h-4" />
                                        Buy
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="sell"
                                        className="flex-1 h-full gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white rounded-lg"
                                        disabled={!position || BigInt(position.balance) <= BigInt(0)}
                                    >
                                        <Icon icon="solar:hand-money-bold" className="w-4 h-4" />
                                        Sell
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="buy" className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm text-muted-foreground">Amount (TON)</label>
                                            <span className="text-sm text-muted-foreground">
                                                Balance: {parseFloat(tonBalance || "0").toFixed(2)} TON
                                            </span>
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="0.0"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="bg-white/5 border-white/10 text-white text-lg h-12"
                                        />
                                        <div className="flex gap-2 mt-2">
                                            {quickAmounts.map((value) => (
                                                <Button
                                                    key={value}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleQuickAmount(value)}
                                                    className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                                                >
                                                    {value}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {preview && (
                                        <div className="p-3 rounded-lg bg-white/5 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">You receive</span>
                                                <span className="text-white font-medium">
                                                    ~{(Number(preview.tokensReceived) / 1e9).toLocaleString()} {selectedToken.symbol}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Price per token</span>
                                                <span className="text-white">{preview.averagePrice} TON</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Fee (1%)</span>
                                                <span className="text-white">{preview.fee} TON</span>
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold"
                                        onClick={handleTrade}
                                        disabled={isLoading || !amount || parseFloat(amount) <= 0}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Icon icon="solar:spinner-bold" className="w-5 h-5 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Icon icon="solar:arrow-up-bold" className="w-5 h-5 mr-2" />
                                                Buy {selectedToken.symbol}
                                            </>
                                        )}
                                    </Button>
                                </TabsContent>

                                <TabsContent value="sell" className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm text-muted-foreground">Amount (Tokens)</label>
                                            <span className="text-sm text-muted-foreground">
                                                Available: {(Number(availableToSell.amount) / 1e9).toLocaleString()}
                                            </span>
                                        </div>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="bg-white/5 border-white/10 text-white text-lg h-12"
                                        />
                                        <div className="flex gap-2 mt-2">
                                            {quickAmounts.map((value) => (
                                                <Button
                                                    key={value}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleQuickAmount(value)}
                                                    className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                                                >
                                                    {value}
                                                </Button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">{availableToSell.reason}</p>
                                    </div>

                                    {preview && (
                                        <div className="p-3 rounded-lg bg-white/5 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">You receive</span>
                                                <span className="text-white font-medium">{preview.tonReceived} TON</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Price per token</span>
                                                <span className="text-white">{preview.averagePrice} TON</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Fee (1%)</span>
                                                <span className="text-white">{preview.fee} TON</span>
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold"
                                        onClick={handleTrade}
                                        disabled={isLoading || !amount || parseFloat(amount) <= 0}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Icon icon="solar:spinner-bold" className="w-5 h-5 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Icon icon="solar:arrow-down-bold" className="w-5 h-5 mr-2" />
                                                Sell {selectedToken.symbol}
                                            </>
                                        )}
                                    </Button>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                )}

                {/* Token Description */}
                {selectedToken.description && (
                    <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                    <Icon icon="solar:document-text-bold" className="w-4 h-4 text-cyan-400" />
                                </div>
                                <h3 className="font-semibold text-white">About</h3>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{selectedToken.description}</p>
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                                <Icon icon="solar:user-circle-bold" className="w-4 h-4 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">
                                    Created by {selectedToken.creatorAddress ? `${selectedToken.creatorAddress.slice(0, 6)}...${selectedToken.creatorAddress.slice(-4)}` : "unknown"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Trade Info */}
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Icon icon="solar:bolt-circle-bold" className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="font-semibold text-white">How It Works</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                                <Icon icon="solar:flash-circle-bold" className="w-5 h-5 text-green-400" />
                                <div>
                                    <p className="text-xs font-medium text-white">Instant Unlock</p>
                                    <p className="text-[11px] text-muted-foreground">100% available immediately</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                                <Icon icon="solar:chart-bold" className="w-5 h-5 text-blue-400" />
                                <div>
                                    <p className="text-xs font-medium text-white">Bonding Curve</p>
                                    <p className="text-[11px] text-muted-foreground">Price set by supply & demand</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                                <Icon icon="solar:safe-circle-bold" className="w-5 h-5 text-orange-400" />
                                <div>
                                    <p className="text-xs font-medium text-white">Natural Protection</p>
                                    <p className="text-[11px] text-muted-foreground">Large sells = higher slippage</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Token Chat */}
                <TokenChat tokenId={tokenId} tokenSymbol={selectedToken.symbol} />
            </div>
        </div>
    );
}

function TokenDetailSkeleton() {
    return (
        <div className="space-y-4">
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-10 w-48 mb-4" />
                    <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                    <Skeleton className="h-10 w-full mb-4" />
                    <Skeleton className="h-12 w-full mb-4" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}
