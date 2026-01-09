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
import SupplyInfo from "@/app/trade/(components)/SupplyInfo";
import SlippageSettings from "@/app/trade/(components)/SlippageSettings";
import { DEFAULT_GRADUATION_THRESHOLD_TON, DEFAULT_SLIPPAGE } from "@/types/trading";
import ImageViewer from "@/components/ui/image-viewer";
import { FEE_CONFIG } from "@/lib/platform-config";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";

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
    const { walletAddress, tonBalance, tonPrice, isTestnet, fetchWalletAssets } = useWallet();
    const { getGroupByToken, joinGroup, isGroupMember, createGroup } = useGroups();

    // Get linked community group for this token
    const tokenGroup = getGroupByToken(tokenId);

    // Telegram back button
    useTelegramBackButton("/trade");

    const [activeTab, setActiveTab] = useState("buy");
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
    const [preview, setPreview] = useState<{
        tokensReceived?: string;
        tonReceived?: string;
        averagePrice: string;
        fee: string;
        newPrice: string;
    } | null>(null);
    const [isImageViewOpen, setIsImageViewOpen] = useState(false);

    // Load token and refresh balance
    useEffect(() => {
        if (tokenId) {
            selectToken(tokenId);
        }
        // Refresh wallet balance on page load
        if (walletAddress) {
            fetchWalletAssets();
        }
    }, [tokenId, selectToken, walletAddress, fetchWalletAssets]);

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
                const result = await buyTokens(tokenId, amount, slippage / 100);
                if (result.success) {
                    toast.success("Purchase successful!", {
                        description: `Your ${selectedToken?.symbol || 'tokens'} will appear in QC Wallet shortly`,
                        duration: 5000,
                    });
                    setAmount("");
                } else {
                    toast.error(result.error || "Transaction failed");
                }
            } else {
                const result = await sellTokens(tokenId, amount);
                if (result.success) {
                    toast.success("Sale successful!", {
                        description: "TON has been sent to your QC Wallet",
                        duration: 5000,
                    });
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
            {/* Header - Premium Glassmorphism */}
            {/* Header - Premium Glassmorphism */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl shadow-black/20">
                <div className="px-4 py-3 flex items-center gap-4">
                    <button
                        onClick={() => selectedToken.image && setIsImageViewOpen(true)}
                        className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-white/10 to-transparent relative cursor-pointer ring-1 ring-white/10 hover:ring-primary/50 transition-all flex-shrink-0 group"
                    >
                        {selectedToken.image ? (
                            <Image src={selectedToken.image} alt={selectedToken.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" unoptimized />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary font-bold bg-white/5">
                                {selectedToken.symbol.slice(0, 2)}
                            </div>
                        )}
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-white truncate leading-none">{selectedToken.name}</h1>
                            {selectedToken.isGraduated && (
                                <Icon icon="solar:verified-check-bold" className="w-4 h-4 text-blue-400" />
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                             <span className="text-[10px] font-bold text-black bg-white/90 px-1.5 py-px rounded-[4px] tracking-tight">
                                ${selectedToken.symbol}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                         <Badge
                            variant="outline"
                            className={`text-[9px] px-2 py-0.5 h-5 border-0 font-semibold ${
                                !selectedToken.isGraduated 
                                ? "bg-green-500/10 text-green-400" 
                                : "bg-blue-500/10 text-blue-400"
                            }`}
                        >
                            {!selectedToken.isGraduated ? "Active Curve" : "Graduated"}
                        </Badge>
                        {selectedToken.jettonMasterAddress && (
                            <div className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-white/5 border border-white/5">
                                <span className="text-[10px] text-muted-foreground">
                                    {selectedToken.jettonMasterAddress.slice(0, 4)}...{selectedToken.jettonMasterAddress.slice(-4)}
                                </span>
                                <div className="w-px h-3 bg-white/10 mx-1" />
                                <button
                                    className="text-muted-foreground hover:text-white transition-colors"
                                    onClick={() => {
                                        navigator.clipboard.writeText(selectedToken.jettonMasterAddress || "");
                                        toast.success("Address copied!");
                                    }}
                                >
                                    <Icon icon="solar:copy-linear" className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                    onClick={() =>
                                        window.open(
                                            `${isTestnet ? "https://testnet.tonviewer.com" : "https://tonviewer.com"}/${selectedToken.jettonMasterAddress}`,
                                            "_blank"
                                        )
                                    }
                                >
                                    <Icon icon="solar:link-circle-linear" className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-4 py-4 space-y-4">
                {/* Graduation Progress - Above price */}
                {!selectedToken.isGraduated && (
                    <GraduationProgress token={selectedToken} tonPriceUsd={tonPrice || 5} />
                )}

                {/* Price Card - Sleek Glow */}
                <Card className="bg-white/5 backdrop-blur-md border border-white/5 relative overflow-hidden group">
                     {/* Ambient Glow */}
                     <div className={`absolute -right-10 -top-10 w-40 h-40 blur-[80px] rounded-full transition-opacity opacity-50 ${isPositive ? "bg-green-500/20" : "bg-red-500/20"}`} />
                    
                    <CardContent className="p-4 relative z-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/5 ${
                                    isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                }`}>
                                    <Icon icon="solar:tag-price-bold" className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Current Price</p>
                                    <p className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-1">
                                         {formatPrice(BigInt(selectedToken.currentPrice || "0"))} 
                                         <span className="text-xs text-muted-foreground font-normal">TON</span>
                                    </p>
                                </div>
                            </div>
                            <div className={`flex flex-col items-end ${isPositive ? "text-green-400" : "text-red-400"}`}>
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                                    isPositive ? "bg-green-500/10" : "bg-red-500/10"
                                }`}>
                                    <Icon icon={isPositive ? "solar:graph-up-bold" : "solar:graph-down-bold"} className="w-3 h-3" />
                                    {Math.abs(priceChange).toFixed(2)}%
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-1">24h Change</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Price Chart - Now reads directly from blockchain */}
                <PriceChart 
                    currentPrice={selectedToken.currentPrice} 
                    jettonAddress={selectedToken.jettonMasterAddress}
                />

                {/* Trading Panel - Show different UI based on graduation status (moved up, under graduation progress) */}
                {selectedToken.isGraduated ? (
                    <GraduatedTrading token={selectedToken} />
                ) : (
                    <Card className="bg-white/5 backdrop-blur-xl border border-white/5 overflow-hidden shadow-xl">
                        <CardContent className="p-5">
                            {/* Header with Slippage Settings */}
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Icon icon="solar:card-transfer-bold" className="w-5 h-5 text-primary" />
                                    Trade
                                </h3>
                                <SlippageSettings value={slippage} onChange={setSlippage} />
                            </div>

                            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setAmount(""); }}>
                                <TabsList className="w-full bg-white/5 p-1 mb-5 h-12 rounded-xl grid grid-cols-2 relative overflow-hidden">
                                     {/* Background slider could go here for extra polish, but default tabs are fine with tweaks */}
                                    <TabsTrigger
                                        value="buy"
                                        className="h-full gap-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-lg duration-200"
                                    >
                                        Buy
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="sell"
                                        className="h-full gap-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg duration-200"
                                        disabled={!position || BigInt(position.balance) <= BigInt(0)}
                                    >
                                        Sell
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="buy" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount (TON)</label>
                                            <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-md">
                                                Bal: <span className="text-white">{parseFloat(tonBalance || "0").toFixed(2)}</span>
                                            </span>
                                        </div>
                                        
                                        <div className="relative group">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="bg-white/5 border-white/10 text-white text-2xl font-bold h-16 pl-4 pr-16 rounded-2xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all placeholder:text-white/10"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                                <div className="w-6 h-6 relative">
                                                    <Image src="/svg/ton-logo.svg" alt="TON" fill className="object-contain" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            {quickAmounts.map((value) => (
                                                <Button
                                                    key={value}
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleQuickAmount(value)}
                                                    className="bg-white/5 border border-white/5 text-xs text-muted-foreground hover:text-white hover:bg-white/10 hover:border-white/20 h-9 rounded-lg"
                                                >
                                                    {value}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {preview && (
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 space-y-2.5">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">You receive</span>
                                                <span className="text-white font-bold text-lg">
                                                    ~{parseFloat(preview.tokensReceived || "0").toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{selectedToken.symbol}</span>
                                                </span>
                                            </div>
                                            <div className="h-px bg-white/5 w-full my-1" />
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Price per token</span>
                                                <span className="text-white">{parseFloat(preview.averagePrice || "0").toFixed(6)} TON</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-muted-foreground">Fee ({FEE_CONFIG.totalTradingFeePercent}%)</span>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <button type="button" className="focus:outline-none opacity-50 hover:opacity-100">
                                                                <Icon icon="solar:info-circle-bold" className="w-3.5 h-3.5" />
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-3 text-xs bg-black/95 border-white/10 text-white backdrop-blur-xl" side="top">
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-muted-foreground">Platform Fee</span>
                                                                    <span className="font-medium">0%</span>
                                                                </div>
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-muted-foreground">Protocol Fee</span>
                                                                    <span className="font-medium">{FEE_CONFIG.totalTradingFeePercent}%</span>
                                                                </div>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                <span className="text-white">{preview.fee} TON</span>
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full h-14 text-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-green-500/20"
                                        onClick={handleTrade}
                                        disabled={isLoading || !amount || parseFloat(amount) <= 0}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <ButtonLoader />
                                                <span>Confirming...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center leading-tight">
                                                <span>Buy {selectedToken.symbol}</span>
                                                {/* <span className="text-[10px] opacity-80 font-normal">Instant settlement</span> */}
                                            </div>
                                        )}
                                    </Button>
                                </TabsContent>

                                <TabsContent value="sell" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount ({selectedToken.symbol})</label>
                                            <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-md">
                                                Avail: <span className="text-white">{(Number(availableToSell || 0) / 1e9).toLocaleString()}</span>
                                            </span>
                                        </div>
                                        
                                        <div className="relative group">
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="bg-white/5 border-white/10 text-white text-2xl font-bold h-16 pl-4 pr-16 rounded-2xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all placeholder:text-white/10"
                                            />
                                            {selectedToken.image && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full overflow-hidden bg-white/10 p-0.5 pointer-events-none">
                                                     <Image src={selectedToken.image} alt="" fill className="object-cover rounded-full" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            {quickAmounts.map((value) => (
                                                <Button
                                                    key={value}
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleQuickAmount(value)}
                                                    className="bg-white/5 border border-white/5 text-xs text-muted-foreground hover:text-white hover:bg-white/10 hover:border-white/20 h-9 rounded-lg"
                                                >
                                                    {value}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {preview && (
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 space-y-2.5">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">You receive</span>
                                                <span className="text-white font-bold text-lg">
                                                    ~{parseFloat(preview.tonReceived || "0").toFixed(4)} <span className="text-sm font-normal text-muted-foreground">TON</span>
                                                </span>
                                            </div>
                                            <div className="h-px bg-white/5 w-full my-1" />
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Price per token</span>
                                                <span className="text-white">{parseFloat(preview.averagePrice || "0").toFixed(6)} TON</span>
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full h-14 text-lg bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20"
                                        onClick={handleTrade}
                                        disabled={isLoading || !amount || parseFloat(amount) <= 0}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <ButtonLoader />
                                                <span>Processing...</span>
                                            </div>
                                        ) : (
                                            `Sell ${selectedToken.symbol}`
                                        )}
                                    </Button>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                )}

                {/* Stats Card - Cleaner Grid */}
                <Card className="bg-white/5 border border-white/5 overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Icon icon="solar:chart-square-bold" className="w-4 h-4 text-primary" />
                            <p className="text-xs text-white/70 font-bold uppercase tracking-wide">Market Statistics</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                             {/* Market Cap */}
                            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.02]">
                                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                                     <Icon icon="solar:chart-2-bold" className="w-3.5 h-3.5 text-blue-400" />
                                     <span className="text-[10px] uppercase font-bold tracking-wider">Market Cap</span>
                                </div>
                                <p className="text-lg font-bold text-white leading-tight">
                                    ${formatCompactNumber((Number(selectedToken.marketCap || "0") / 1e9) * (tonPrice || 5), 2)}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {formatMarketCap(selectedToken.marketCap || "0")}
                                </p>
                            </div>

                             {/* Volume */}
                             <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.02]">
                                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                                     <Icon icon="solar:graph-new-bold" className="w-3.5 h-3.5 text-orange-400" />
                                     <span className="text-[10px] uppercase font-bold tracking-wider">Volume (24h)</span>
                                </div>
                                <p className="text-lg font-bold text-white leading-tight">
                                    {formatCompactNumber(selectedToken.volume24h || 0, 1)} <span className="text-sm font-normal text-muted-foreground">TON</span>
                                </p>
                            </div>

                             {/* Holders */}
                             <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.02]">
                                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                                     <Icon icon="solar:users-group-two-rounded-bold" className="w-3.5 h-3.5 text-purple-400" />
                                     <span className="text-[10px] uppercase font-bold tracking-wider">Holders</span>
                                </div>
                                <p className="text-lg font-bold text-white leading-tight">
                                    {formatCompactNumber(selectedToken.holders, 0)}
                                </p>
                            </div>

                             {/* Trades */}
                             <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.02]">
                                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                                     <Icon icon="solar:transfer-horizontal-bold" className="w-3.5 h-3.5 text-cyan-400" />
                                     <span className="text-[10px] uppercase font-bold tracking-wider">Transactions</span>
                                </div>
                                <p className="text-lg font-bold text-white leading-tight">
                                    {formatCompactNumber(selectedToken.trades || 0, 0)}
                                </p>
                            </div>
                        </div>

                        {/* Graduation Progress Strip */}
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Icon icon="solar:rocket-2-bold" className="w-4 h-4 text-blue-500" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">To Graduation</p>
                                    <p className="text-xs font-semibold text-blue-100">ST<span className="text-blue-500">O</span>N.fi Listing</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-white">
                                    {(() => {
                                        const rawThreshold = parseFloat(selectedToken.graduationThreshold || DEFAULT_GRADUATION_THRESHOLD_TON);
                                        let thresholdTon = rawThreshold > 1e9 ? rawThreshold / 1e9 : rawThreshold;
                                        if (thresholdTon === 100) thresholdTon = 2000;
                                        const marketCapTon = Number(selectedToken.marketCap || "0") / 1e9;
                                        return formatCompactNumber(Math.max(0, thresholdTon - marketCapTon), 0);
                                    })()} <span className="text-xs font-normal text-muted-foreground">TON remaining</span>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Supply Info */}
                <SupplyInfo token={selectedToken} />

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

                {/* Token Description */}
                {selectedToken.description && (
                    <Card className="bg-white/5 border border-white/5 overflow-hidden">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                    <Icon icon="solar:document-text-bold" className="w-4 h-4 text-cyan-400" />
                                </div>
                                <h3 className="font-bold text-white text-base">About</h3>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed font-light">{selectedToken.description}</p>
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                     <Icon icon="solar:user-circle-bold" className="w-3.5 h-3.5 text-white/70" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Created by <span className="text-white font-medium">{selectedToken.creatorWallet ? `${selectedToken.creatorWallet.slice(0, 6)}...${selectedToken.creatorWallet.slice(-4)}` : "unknown"}</span>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Trade Info */}
                <Card className="bg-white/5 border border-white/5 overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-bold text-white text-base">How It Works</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.02]">
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                                    <Icon icon="solar:bolt-circle-bold" className="w-4 h-4 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">Instant Unlock</p>
                                    <p className="text-[11px] text-muted-foreground">100% of supply available immediately</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.02]">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                     <Icon icon="solar:chart-bold" className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">Bonding Curve</p>
                                    <p className="text-[11px] text-muted-foreground">Price is determined by supply & demand</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.02]">
                                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                                    <Icon icon="solar:safe-circle-bold" className="w-4 h-4 text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">Natural Protection</p>
                                    <p className="text-[11px] text-muted-foreground">Large sells incur higher slippage automatically</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Community Group Section */}
                <Card className="bg-white/5 border border-white/5 overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                    <Icon icon="solar:users-group-rounded-bold" className="w-4 h-4 text-primary" />
                                </div>
                                <h3 className="font-bold text-white text-base">Community</h3>
                            </div>
                            {tokenGroup && (
                                <Badge variant="secondary" className="text-xs bg-white/10 hover:bg-white/20 text-white">
                                    {tokenGroup.memberCount} members
                                </Badge>
                            )}
                        </div>

                        {tokenGroup ? (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">{tokenGroup.description || `Join the ${selectedToken.symbol} community`}</p>
                                {isGroupMember(tokenGroup.id) ? (
                                    <Button
                                        onClick={() => router.push(`/groups/${tokenGroup.id}`)}
                                        className="w-full bg-primary/20 hover:bg-primary/30 text-primary h-12 rounded-xl font-bold"
                                    >
                                        <Icon icon="solar:chat-round-line-bold" className="w-5 h-5 mr-2" />
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
                                        className="w-full bg-white hover:bg-white/90 text-black h-12 rounded-xl font-bold transition-all shadow-lg shadow-white/10"
                                    >
                                        <Icon icon="solar:add-circle-bold" className="w-5 h-5 mr-2" />
                                        Join Community
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4 text-center py-2">
                                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                    <Icon icon="solar:users-group-two-rounded-bold" className="w-6 h-6 text-muted-foreground/50" />
                                </div>
                                <p className="text-sm text-muted-foreground">No community group yet. Be the first to start one!</p>
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
                                        className="w-full border-white/20 text-white hover:bg-white/10 h-11 rounded-xl"
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
