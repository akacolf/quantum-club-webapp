"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useTrading } from "@/app/(contexts)/TradingContext";
import { useWallet } from "@/app/wallet/WalletContext";
import { useGroups } from "@/app/(contexts)/GroupsContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { formatPrice, formatMarketCap, formatCompactNumber } from "@/lib/jetton-operations";
import { toast } from "sonner";
import { tradeAmountSchema } from "@/lib/validations";
import { haptics } from "@/lib/haptics";
import TokenChat from "@/app/ecosystem/trade/(components)/TokenChat";
import LiveTrades from "@/app/ecosystem/trade/(components)/LiveTrades";
import PriceChart from "@/app/ecosystem/trade/(components)/PriceChart";
import GraduatedTrading from "@/app/ecosystem/trade/(components)/GraduatedTrading";
import GraduationProgress from "@/app/ecosystem/trade/(components)/GraduationProgress";
import SupplyInfo from "@/app/ecosystem/trade/(components)/SupplyInfo";
import SlippageSettings from "@/app/ecosystem/trade/(components)/SlippageSettings";
import { DEFAULT_GRADUATION_THRESHOLD_TON, DEFAULT_SLIPPAGE } from "@/types/trading";
import ImageViewer from "@/components/ui/image-viewer";
import { FEE_CONFIG } from "@/lib/platform-config";
import { useOnChainStats, EMPTY_ON_CHAIN_STATS } from "@/app/(hooks)/queries/use-trades";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { TokenAnalysisCard } from "@/components/ai";

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
    const queryClient = useQueryClient();

    // Get linked community group for this token
    const tokenGroup = getGroupByToken(tokenId);

    // Telegram back button
    useTelegramBackButton("/ecosystem/trade");

    const [activeTab, setActiveTab] = useQueryState("side", parseAsStringLiteral(["buy", "sell"] as const).withDefault("buy").withOptions({ history: "replace" }));
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
    const [tradingOpen, setTradingOpen] = useState(false);

    // On-chain stats from TONAPI via TanStack Query
    const { data: onChainStats = EMPTY_ON_CHAIN_STATS, isLoading: isLoadingStats } = useOnChainStats(
        selectedToken?.jettonMasterAddress,
        isTestnet,
    );

    // Refresh token + stats after a trade without resetting displayed data
    const refreshAfterTrade = () => {
        selectToken(tokenId);
        if (selectedToken?.jettonMasterAddress) {
            queryClient.invalidateQueries({ queryKey: ["onChainStats", selectedToken.jettonMasterAddress, isTestnet] });
            queryClient.invalidateQueries({ queryKey: ["liveTrades", selectedToken.jettonMasterAddress, isTestnet] });
        }
    };

    useEffect(() => {
        router.prefetch("/wallet");
    }, [router]);

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

        // Zod schema validation at submit boundary
        const parsed = tradeAmountSchema.safeParse({ amount: amount || "" });
        if (!parsed.success) {
            toast.error(parsed.error.errors[0].message);
            return;
        }

        setIsLoading(true);

        try {
            if (activeTab === "buy") {
                const result = await buyTokens(tokenId, amount, slippage / 100);
                if (result.success) {
                    haptics.success();
                    toast.success("Purchase successful!", {
                        description: `Your ${selectedToken?.symbol || 'tokens'} will appear in QC Wallet shortly`,
                        duration: 5000,
                    });
                    setAmount("");
                    setTradingOpen(false);
                    // Refresh token data from on-chain after trade settles
                    setTimeout(refreshAfterTrade, 3000);
                } else {
                    haptics.error();
                    toast.error(result.error || "Transaction failed");
                }
            } else {
                const result = await sellTokens(tokenId, amount);
                if (result.success) {
                    haptics.success();
                    toast.success("Sale successful!", {
                        description: "TON has been sent to your QC Wallet",
                        duration: 5000,
                    });
                    setAmount("");
                    setTradingOpen(false);
                    // Refresh token data from on-chain after trade settles
                    setTimeout(refreshAfterTrade, 3000);
                } else {
                    haptics.error();
                    toast.error(result.error || "Transaction failed");
                }
            }
        } catch {
            haptics.error();
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Quick amount buttons - minimum buy is 0.15 TON, so start at 1 TON
    const quickAmounts = activeTab === "buy"
        ? ["1", "5", "7", "10"]
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

            const tokenAmountNano = (available * BigInt(Math.floor(percentage * 100))) / BigInt(100);
            // Convert from nano (1e9) to human-readable token amount
            const tokenAmountHuman = Number(tokenAmountNano) / 1e9;
            setAmount(tokenAmountHuman.toString());
        }
    };

    const openTrade = (tab: "buy" | "sell") => {
        setActiveTab(tab);
        setAmount("");
        setPreview(null);
        setTradingOpen(true);
    };

    if (!selectedToken) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-32 px-4 pt-16">
                <TokenDetailSkeleton />
            </div>
        );
    }

    const shortAddr = selectedToken.jettonMasterAddress
        ? `${selectedToken.jettonMasterAddress.slice(0, 6)}...${selectedToken.jettonMasterAddress.slice(-4)}`
        : "";

    const tonReserveTon = Number(selectedToken.tonReserve || selectedToken.marketCap || "0") / 1e9;
    const marketCapUsd = tonReserveTon * (tonPrice || 5);

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-40">
            <div className="px-4 pt-4 space-y-4">
                {/* Token Header — matches Spot Trading style */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => selectedToken.image && setIsImageViewOpen(true)}
                        className="relative w-14 h-14 rounded-full overflow-hidden bg-[#222] ring-1 ring-white/10 flex-shrink-0 hover:ring-primary/50 transition-all group"
                        style={{ viewTransitionName: `token-img-${tokenId}` }}
                    >
                        {selectedToken.image ? (
                            <Image src={selectedToken.image} alt={selectedToken.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" unoptimized />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary font-bold text-lg">
                                {selectedToken.symbol.slice(0, 2)}
                            </div>
                        )}
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-white truncate">{selectedToken.symbol}</h1>
                            {selectedToken.isGraduated && (
                                <Icon icon="solar:verified-check-bold" className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            )}
                            <Badge
                                className={`text-[9px] h-4 border-0 font-semibold ${
                                    !selectedToken.isGraduated
                                    ? "bg-green-500/10 text-green-400"
                                    : "bg-blue-500/10 text-blue-400"
                                }`}
                            >
                                {!selectedToken.isGraduated ? "Active Curve" : "Graduated"}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{selectedToken.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            {selectedToken.jettonMasterAddress && (
                                <>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedToken.jettonMasterAddress || "");
                                            toast.success("Address copied!");
                                        }}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-muted-foreground hover:text-white transition-colors"
                                    >
                                        {shortAddr}
                                        <Icon icon="solar:copy-linear" className="w-3 h-3" />
                                    </button>
                                    <a
                                        href={`${isTestnet ? "https://testnet.tonviewer.com" : "https://tonviewer.com"}/${selectedToken.jettonMasterAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-white transition-colors"
                                    >
                                        <Icon icon="solar:link-round-bold" className="w-3.5 h-3.5" />
                                    </a>
                                </>
                            )}
                            <Badge className="bg-primary/10 text-primary border-0 text-[9px] h-4">RocketStart</Badge>
                        </div>
                    </div>
                </div>

                {/* Graduation Progress */}
                {!selectedToken.isGraduated && (
                    <GraduationProgress token={selectedToken} tonPriceUsd={tonPrice || 5} />
                )}

                {/* Market Stats — matches Spot Trading card layout */}
                <Card className="bg-white/5 border-white/5">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                                    {selectedToken.isGraduated ? "Market cap" : "TON Reserve"}
                                </p>
                                <p className="text-2xl font-bold text-white">
                                    ${formatCompactNumber(marketCapUsd, 2)}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {formatMarketCap(selectedToken.tonReserve || selectedToken.marketCap || "0")}
                                </p>
                            </div>
                            <div className="text-right space-y-1.5">
                                <StatRow label="Holders" value={onChainStats.holders > 0 ? formatCompactNumber(onChainStats.holders, 0) : undefined} loading={isLoadingStats} />
                                <StatRow label="Volume 24h" value={onChainStats.volume24h > 0 ? `${formatCompactNumber(onChainStats.volume24h, 1)} TON` : undefined} loading={isLoadingStats} />
                                <StatRow label="Transactions" value={onChainStats.trades > 0 ? formatCompactNumber(onChainStats.trades, 0) : undefined} loading={isLoadingStats} />
                            </div>
                        </div>

                        {/* Graduation progress strip */}
                        {!selectedToken.isGraduated && (
                            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
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
                                            return formatCompactNumber(Math.max(0, thresholdTon - tonReserveTon), 0);
                                        })()} <span className="text-xs font-normal text-muted-foreground">TON remaining</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Price row — matches Spot Trading */}
                <div className="flex items-center gap-3 px-1">
                    <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Price</p>
                        <div className="flex items-center gap-2">
                            <p className="text-base font-semibold text-white">
                                {formatPrice(BigInt(selectedToken.currentPrice || "0"))} TON
                            </p>
                            <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-[8px]">
                                ON-CHAIN
                            </Badge>
                        </div>
                    </div>
                    {tonPrice > 0 && (
                        <div className="text-right">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Price (USD)</p>
                            <p className="text-base font-semibold text-white">
                                ${(Number(selectedToken.currentPrice || "0") / 1e9 * tonPrice).toFixed(6)}
                            </p>
                        </div>
                    )}
                </div>

                {/* Price Chart */}
                <PriceChart
                    currentPrice={selectedToken.currentPrice}
                    jettonAddress={selectedToken.jettonMasterAddress}
                />

                {/* AI Token Analysis */}
                <TokenAnalysisCard
                    tokenAddress={selectedToken.jettonMasterAddress || tokenId}
                    tokenData={{
                        name: selectedToken.name,
                        symbol: selectedToken.symbol,
                        price: Number(selectedToken.currentPrice || "0") / 1e9,
                        marketCap: tonReserveTon,
                        volume24h: onChainStats.volume24h,
                        holders: onChainStats.holders,
                        createdAt: selectedToken.createdAt ? new Date(selectedToken.createdAt).toISOString() : undefined,
                    }}
                />

                {/* Graduated Trading (STON.fi) */}
                {selectedToken.isGraduated && (
                    <GraduatedTrading token={selectedToken} />
                )}

                {/* Supply Info */}
                <SupplyInfo token={selectedToken} />

                {/* Live Trades */}
                <LiveTrades tokenId={tokenId} tokenSymbol={selectedToken.symbol} jettonAddress={selectedToken.jettonMasterAddress} />

                {/* User Position (if exists) */}
                {position && BigInt(position.balance) > BigInt(0) && (() => {
                    const balanceTokens = Number(position.balance) / 1e9;
                    const pricePerTokenTon = Number(selectedToken.currentPrice) / 1e9;
                    const currentValueTon = balanceTokens * pricePerTokenTon;
                    const currentValueUsd = currentValueTon * (tonPrice || 0);
                    const totalInvested = Number(position.totalInvested || "0") / 1e9;
                    const hasPnl = totalInvested > 0;
                    const pnlTon = hasPnl ? currentValueTon - totalInvested : 0;
                    const pnlPercent = hasPnl && totalInvested > 0 ? (pnlTon / totalInvested) * 100 : 0;
                    const isPnlPositive = pnlTon >= 0;

                    return (
                        <Card className="bg-white/5 border-white/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon icon="solar:wallet-money-bold" className="w-4 h-4 text-primary" />
                                    <h3 className="font-semibold text-white text-sm">Your Position</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground mb-0.5">Balance</p>
                                        <p className="text-lg font-bold text-white">
                                            {formatCompactNumber(balanceTokens, 2)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">{selectedToken.symbol}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-muted-foreground mb-0.5">Value</p>
                                        <p className="text-lg font-bold text-white">
                                            {formatCompactNumber(currentValueTon, 4)} TON
                                        </p>
                                        {currentValueUsd > 0 && (
                                            <p className="text-[10px] text-muted-foreground">${formatCompactNumber(currentValueUsd, 2)}</p>
                                        )}
                                    </div>
                                </div>
                                {hasPnl && (
                                    <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground mb-0.5">P/L</p>
                                            <p className={`text-sm font-bold ${isPnlPositive ? "text-green-400" : "text-red-400"}`}>
                                                {isPnlPositive ? "+" : ""}{formatCompactNumber(pnlTon, 4)} TON
                                            </p>
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${isPnlPositive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                            {isPnlPositive ? "+" : ""}{pnlPercent.toFixed(2)}%
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })()}

                {/* Token Description */}
                {selectedToken.description && (
                    <Card className="bg-white/5 border-white/5">
                        <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground mb-1">About</p>
                            <p className="text-sm text-white/80 line-clamp-3">{selectedToken.description}</p>
                            {selectedToken.creatorWallet && (
                                <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-white/5">
                                    Created by <span className="text-white font-medium">{selectedToken.creatorWallet.slice(0, 6)}...{selectedToken.creatorWallet.slice(-4)}</span>
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Community Group */}
                <Card className="bg-white/5 border-white/5">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Icon icon="solar:users-group-rounded-bold" className="w-4 h-4 text-primary" />
                                <h3 className="font-semibold text-white text-sm">Community</h3>
                            </div>
                            {tokenGroup && (
                                <span className="text-[10px] text-muted-foreground">{tokenGroup.memberCount} members</span>
                            )}
                        </div>

                        {tokenGroup ? (
                            <div className="space-y-3">
                                <p className="text-xs text-muted-foreground">{tokenGroup.description || `Join the ${selectedToken.symbol} community`}</p>
                                {isGroupMember(tokenGroup.id) ? (
                                    <Button
                                        onClick={() => router.push(`/groups/${tokenGroup.id}`)}
                                        className="w-full bg-primary/20 hover:bg-primary/30 text-primary h-11 rounded-xl font-bold text-sm"
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
                                        className="w-full bg-white hover:bg-white/90 text-black h-11 rounded-xl font-bold text-sm"
                                    >
                                        <Icon icon="solar:add-circle-bold" className="w-4 h-4 mr-2" />
                                        Join Community
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3 text-center py-2">
                                <p className="text-xs text-muted-foreground">No community group yet</p>
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
                                        className="w-full border-white/20 text-white hover:bg-white/10 h-10 rounded-xl text-sm"
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

            {/* Floating Buy/Sell Buttons — matches Spot Trading */}
            {!selectedToken.isGraduated && (
                <div className="fixed bottom-28 left-0 right-0 px-4 z-40">
                    <div className="flex gap-3 max-w-md mx-auto">
                        <Button
                            onClick={() => openTrade("buy")}
                            className="flex-1 h-12 bg-green-500 hover:bg-green-600 text-white font-bold text-base rounded-xl shadow-lg shadow-green-500/20"
                        >
                            Buy
                        </Button>
                        <Button
                            onClick={() => openTrade("sell")}
                            disabled={!position || BigInt(position?.balance || "0") <= BigInt(0)}
                            className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white font-bold text-base rounded-xl shadow-lg shadow-red-500/20"
                        >
                            Sell
                        </Button>
                    </div>
                </div>
            )}

            {/* Trading Sheet — matches Spot Trading's bottom drawer */}
            {!selectedToken.isGraduated && (
                <Sheet open={tradingOpen} onOpenChange={setTradingOpen}>
                    <SheetContent side="bottom" className="bg-[#111] border-t border-white/10 rounded-t-2xl max-h-[85vh] overflow-y-auto px-0">
                        <SheetHeader className="px-5 pb-2">
                            <div className="flex items-center justify-between">
                                <SheetTitle className="text-white font-bold">
                                    Trade {selectedToken.symbol}
                                </SheetTitle>
                                <SlippageSettings value={slippage} onChange={setSlippage} />
                            </div>
                        </SheetHeader>

                        <div className="px-5 pb-8">
                            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "buy" | "sell"); setAmount(""); setPreview(null); }}>
                                <TabsList className="w-full bg-white/5 p-1 mb-5 h-11 rounded-xl grid grid-cols-2">
                                    <TabsTrigger
                                        value="buy"
                                        className="h-full text-sm font-semibold data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                                    >
                                        Buy
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="sell"
                                        className="h-full text-sm font-semibold data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                                        disabled={!position || BigInt(position?.balance || "0") <= BigInt(0)}
                                    >
                                        Sell
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="buy" className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount (TON)</label>
                                            <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-md">
                                                Bal: <span className="text-white">{parseFloat(tonBalance || "0").toFixed(2)}</span>
                                            </span>
                                        </div>

                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="bg-white/5 border-white/10 text-white text-lg font-bold h-12 pl-4 pr-14 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all placeholder:text-white/10"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                                <div className="w-5 h-5 relative">
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
                                        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">You receive</span>
                                                <span className="text-white font-bold">
                                                    ~{parseFloat(preview.tokensReceived || "0").toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{selectedToken.symbol}</span>
                                                </span>
                                            </div>
                                            <div className="h-px bg-white/5 w-full" />
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
                                        className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20"
                                        onClick={handleTrade}
                                        disabled={isLoading || !amount || parseFloat(amount) <= 0}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <ButtonLoader />
                                                <span>Confirming...</span>
                                            </div>
                                        ) : (
                                            `Buy ${selectedToken.symbol}`
                                        )}
                                    </Button>
                                </TabsContent>

                                <TabsContent value="sell" className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount ({selectedToken.symbol})</label>
                                            <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-md">
                                                Avail: <span className="text-white">{(Number(availableToSell || 0) / 1e9).toLocaleString()}</span>
                                            </span>
                                        </div>

                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="bg-white/5 border-white/10 text-white text-lg font-bold h-12 pl-4 pr-14 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all placeholder:text-white/10"
                                            />
                                            {selectedToken.image && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full overflow-hidden bg-white/10 pointer-events-none">
                                                    <Image src={selectedToken.image} alt="" fill className="object-cover rounded-full" unoptimized />
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
                                        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">You receive</span>
                                                <span className="text-white font-bold">
                                                    ~{parseFloat(preview.tonReceived || "0").toFixed(4)} <span className="text-xs font-normal text-muted-foreground">TON</span>
                                                </span>
                                            </div>
                                            <div className="h-px bg-white/5 w-full" />
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Price per token</span>
                                                <span className="text-white">{parseFloat(preview.averagePrice || "0").toFixed(6)} TON</span>
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20"
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
                        </div>
                    </SheetContent>
                </Sheet>
            )}

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

function StatRow({ label, value, loading }: { label: string; value?: string; loading?: boolean }) {
    return (
        <div className="flex items-center justify-end gap-2">
            <span className="text-[10px] text-muted-foreground">{label}</span>
            {loading ? (
                <Skeleton className="h-4 w-16" />
            ) : (
                <span className="text-sm font-semibold text-white">{value || "--"}</span>
            )}
        </div>
    );
}

function TokenDetailSkeleton() {
    return (
        <div className="space-y-4">
            {/* Token Header */}
            <div className="flex items-center gap-3">
                <Skeleton className="w-14 h-14 rounded-full" />
                <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-4 w-24 rounded-full" />
                </div>
            </div>
            {/* Graduation Progress */}
            <Skeleton className="h-28 w-full rounded-xl" />
            {/* Market Stats */}
            <Card className="bg-white/5 border-white/5">
                <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-8 w-24" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <div className="space-y-2 text-right">
                            <Skeleton className="h-4 w-20 ml-auto" />
                            <Skeleton className="h-4 w-24 ml-auto" />
                            <Skeleton className="h-4 w-20 ml-auto" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            {/* Price row */}
            <div className="flex items-center gap-3 px-1">
                <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-5 w-28" />
                </div>
                <div className="space-y-1 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" />
                    <Skeleton className="h-5 w-20 ml-auto" />
                </div>
            </div>
            {/* Chart */}
            <Skeleton className="h-[260px] w-full rounded-xl" />
            {/* Supply Info */}
            <Skeleton className="h-48 w-full rounded-xl" />
            {/* Live Trades */}
            <Skeleton className="h-48 w-full rounded-xl" />
        </div>
    );
}
