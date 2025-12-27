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
import { useGroups } from "@/app/(contexts)/GroupsContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { formatPrice, formatMarketCap, formatCompactNumber } from "@/lib/jetton-operations";
import { toast } from "sonner";
import TokenChat from "@/app/trade/(components)/TokenChat";
import LiveTrades from "@/app/trade/(components)/LiveTrades";
import PriceChart from "@/app/trade/(components)/PriceChart";
import GraduatedTrading from "@/app/trade/(components)/GraduatedTrading";
import GraduationProgress from "@/app/trade/(components)/GraduationProgress";
import { DEFAULT_GRADUATION_THRESHOLD_TON } from "@/types/trading";
import ImageViewer from "@/components/ui/image-viewer";

export default function TokenDetailPage() {
    const params = useParams();
    const router = useRouter();
    const tokenId = params.tokenId as string;

    const {
        selectedToken,
        selectToken,
        getPosition,
        previewBuy,
        previewSell,
        buyTokens,
        sellTokens,
    } = useTrading();
    const { walletAddress, tonBalance, tonPrice } = useWallet();
    const { getGroupByToken, joinGroup, isGroupMember, createGroup } = useGroups();

    // Get linked community group for this token
    const tokenGroup = getGroupByToken(tokenId);

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
    const [isImageViewOpen, setIsImageViewOpen] = useState(false);

    // Load token
    useEffect(() => {
        if (tokenId) {
            selectToken(tokenId);
        }
    }, [tokenId, selectToken]);

    // Get user position
    const position = getPosition(tokenId);
    const availableToSell = position?.balance || "0";

    // Preview calculation
    useEffect(() => {
        if (!amount || parseFloat(amount) <= 0 || !selectedToken) {
            setPreview(null);
            return;
        }

        const fetchPreview = async () => {
            if (activeTab === "buy") {
                const result = await previewBuy(tokenId, amount);
                setPreview(result);
            } else {
                const result = await previewSell(tokenId, amount);
                setPreview(result);
            }
        };
        fetchPreview();
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
            const available = BigInt(availableToSell || "0");
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
                    <button
                        onClick={() => selectedToken.image && setIsImageViewOpen(true)}
                        className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 relative cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                    >
                        {selectedToken.image ? (
                            <Image src={selectedToken.image} alt={selectedToken.name} fill className="object-cover" unoptimized />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                                {selectedToken.symbol.slice(0, 2)}
                            </div>
                        )}
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-white">{selectedToken.name}</h1>
                        <p className="text-sm text-muted-foreground">${selectedToken.symbol}</p>
                    </div>
                    <Badge
                        variant={!selectedToken.isGraduated ? "default" : "secondary"}
                        className={!selectedToken.isGraduated ? "bg-green-500/20 text-green-400" : ""}
                    >
                        {!selectedToken.isGraduated ? "Active" : "Graduated"}
                    </Badge>
                </div>
            </div>

            <div className="px-4 py-4 space-y-4">
                {/* Price Card */}
                <Card className="bg-white/5 border-white/10 overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
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
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                }`}>
                                <Icon icon={isPositive ? "solar:graph-up-bold" : "solar:graph-down-bold"} className="w-3 h-3" />
                                {isPositive ? "+" : "-"}{Math.abs(priceChange).toFixed(2)}%
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contract Address */}
                {selectedToken.jettonMasterAddress && (
                    <Card className="bg-white/5 border-white/10 overflow-hidden">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:document-text-bold" className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">Contract Address</p>
                                        <p className="text-xs font-mono text-white">
                                            {selectedToken.jettonMasterAddress.slice(0, 8)}...{selectedToken.jettonMasterAddress.slice(-8)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-muted-foreground hover:text-white"
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedToken.jettonMasterAddress || "");
                                            toast.success("Address copied!");
                                        }}
                                    >
                                        <Icon icon="solar:copy-bold" className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-primary hover:text-primary/80"
                                        onClick={() => window.open(`https://tonviewer.com/${selectedToken.jettonMasterAddress}`, "_blank")}
                                    >
                                        <Icon icon="solar:arrow-right-up-bold" className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Price Chart */}
                <PriceChart tokenId={tokenId} currentPrice={selectedToken.currentPrice} />

                {/* Stats Card */}
                <Card className="bg-white/5 border-white/10 overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Icon icon="solar:chart-square-bold" className="w-4 h-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground font-medium">Token Stats</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Icon icon="solar:chart-2-bold" className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">MCap</p>
                                    <p className="text-xs font-semibold text-white">
                                        {formatMarketCap(selectedToken.marketCap || "0")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <Icon icon="solar:users-group-two-rounded-bold" className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Holders</p>
                                    <p className="text-xs font-semibold text-white">{formatCompactNumber(selectedToken.holders, 0)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                    <Icon icon="solar:graph-new-bold" className="w-4 h-4 text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">24h Vol</p>
                                    <p className="text-xs font-semibold text-white">
                                        {formatCompactNumber(selectedToken.volume24h || 0, 1)} TON
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Second Stats Row */}
                        <div className="grid grid-cols-3 gap-3 pt-3 mt-3 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <Icon icon="solar:wallet-money-bold" className="w-4 h-4 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Collected</p>
                                    <p className="text-xs font-semibold text-white">
                                        {formatCompactNumber(Number(selectedToken.marketCap || "0") / 1e9, 1)} TON
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                    <Icon icon="solar:transfer-horizontal-bold" className="w-4 h-4 text-cyan-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Trades</p>
                                    <p className="text-xs font-semibold text-white">{formatCompactNumber(selectedToken.trades || 0, 0)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                                    <Icon icon="solar:rocket-2-bold" className="w-4 h-4 text-pink-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">To Grad</p>
                                    <p className="text-xs font-semibold text-white">
                                        {formatCompactNumber(Math.max(0, parseFloat(selectedToken.graduationThreshold || DEFAULT_GRADUATION_THRESHOLD_TON) - (Number(selectedToken.marketCap || "0") / 1e9)), 0)} TON
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

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
                                        {formatCompactNumber(Number(position.balance) / 1e9, 2)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">{selectedToken.symbol}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon icon="solar:dollar-minimalistic-bold" className="w-4 h-4 text-green-400" />
                                        <p className="text-xs text-muted-foreground">Value</p>
                                    </div>
                                    <p className="text-lg font-bold text-white">
                                        {formatCompactNumber((Number(position.balance) / 1e9) * (Number(selectedToken.currentPrice) / 1e9), 4)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">TON</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {/* Graduation Progress - Only for bonding tokens */}
                {!selectedToken.isGraduated && (
                    <GraduationProgress token={selectedToken} tonPriceUsd={tonPrice || 5} />
                )}

                {/* Trading Panel - Show different UI based on graduation status */}
                {selectedToken.isGraduated ? (
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
                                                Available: {(Number(availableToSell || 0) / 1e9).toLocaleString()}
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
                                        {/* Sell info */}
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
                                    Created by {selectedToken.creatorWallet ? `${selectedToken.creatorWallet.slice(0, 6)}...${selectedToken.creatorWallet.slice(-4)}` : "unknown"}
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

                {/* Community Group Section */}
                <Card className="bg-white/5 border-white/10 overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                    <Icon icon="solar:users-group-rounded-bold" className="w-4 h-4 text-primary" />
                                </div>
                                <h3 className="font-semibold text-white">Community</h3>
                            </div>
                            {tokenGroup && (
                                <Badge variant="secondary" className="text-xs">
                                    {tokenGroup.memberCount} members
                                </Badge>
                            )}
                        </div>

                        {tokenGroup ? (
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">{tokenGroup.description || `Join the ${selectedToken.symbol} community`}</p>
                                {isGroupMember(tokenGroup.id) ? (
                                    <Button
                                        onClick={() => router.push(`/groups/${tokenGroup.id}`)}
                                        className="w-full bg-primary/20 hover:bg-primary/30 text-primary"
                                    >
                                        <Icon icon="solar:chat-round-line-bold" className="w-4 h-4 mr-2" />
                                        Open Group Chat
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={async () => {
                                            const success = await joinGroup(tokenGroup.id);
                                            if (success) {
                                                toast.success("Joined community!");
                                                router.push(`/groups/${tokenGroup.id}`);
                                            } else {
                                                toast.error("Failed to join");
                                            }
                                        }}
                                        className="w-full bg-white hover:bg-white/90 text-black"
                                    >
                                        <Icon icon="solar:add-circle-bold" className="w-4 h-4 mr-2" />
                                        Join Community
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">No community group yet</p>
                                {selectedToken.creatorId && (
                                    <Button
                                        onClick={async () => {
                                            const groupId = await createGroup(
                                                `${selectedToken.symbol} Community`,
                                                `Official community for ${selectedToken.name} token holders`,
                                                tokenId,
                                                selectedToken.symbol
                                            );
                                            if (groupId) {
                                                toast.success("Community created!");
                                                router.push(`/groups/${groupId}`);
                                            } else {
                                                toast.error("Failed to create community");
                                            }
                                        }}
                                        variant="outline"
                                        className="w-full border-white/20 text-white hover:bg-white/10"
                                    >
                                        <Icon icon="solar:add-circle-bold" className="w-4 h-4 mr-2" />
                                        Create Community
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Token Chat */}
                <TokenChat tokenId={tokenId} tokenSymbol={selectedToken.symbol} />
            </div>

            {/* Image Viewer Modal */}
            <ImageViewer
                isOpen={isImageViewOpen}
                onClose={() => setIsImageViewOpen(false)}
                imageUrl={selectedToken.image || ""}
                alt={selectedToken.name}
            />
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
