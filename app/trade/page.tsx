"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrading } from "@/app/(contexts)/TradingContext";
import { Token, DEFAULT_GRADUATION_THRESHOLD_TON } from "@/types/trading";
import { formatPrice, formatMarketCap, formatCompactNumber } from "@/lib/jetton-operations";
import { useWallet } from "@/app/wallet/WalletContext";

import GlobalLiveTrades from "@/app/trade/(components)/GlobalLiveTrades";
import CreatorEarningsDashboard from "@/app/trade/(components)/CreatorEarningsDashboard";

// Lottie animations for tabs (Telegram-style animated emojis)
import fireAnimation from "@/public/lottie/fire-lottie.json";
import sparklesAnimation from "@/public/lottie/sparkles-lottie.json";
import diamondAnimation from "@/public/lottie/diamond-lottie.json";

// Utility for progress calculation - now TON-based
const calculateProgress = (marketCapNano: string, thresholdTon: string) => {
    try {
        const mcTon = Number(BigInt(marketCapNano || "0")) / 1e9;
        const total = Number(thresholdTon);
        if (total <= 0) return 0;
        return Math.min((mcTon / total) * 100, 100);
    } catch {
        return 0;
    }
};

function TokenCard({ token, index, tonPrice }: { token: Token; index: number; tonPrice: number }) {
    const router = useRouter();
    const priceChange = token.priceChange24h || 0;
    const isPositive = priceChange >= 0;
    const progress = calculateProgress(
        token.marketCap,
        token.graduationThreshold || DEFAULT_GRADUATION_THRESHOLD_TON
    );

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card
                className="bg-[#121212]/80 backdrop-blur-md border-white/5 hover:border-primary/50 transition-all cursor-pointer overflow-hidden group relative shadow-lg"
                onClick={() => router.push(`/trade/${token.id}`)}
            >
                {/* Glow effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-primary/10 transition-all" />

                <CardContent className="p-3.5 relative z-10">
                    <div className="flex gap-3.5">
                        {/* Token Image - Larger & detached */}
                        <div className="relative w-[4.5rem] h-[4.5rem] rounded-xl overflow-hidden bg-white/5 flex-shrink-0 shadow-inner border border-white/5">
                            {token.image ? (
                                <Image
                                    src={token.image}
                                    alt={token.name}
                                    fill
                                    className="object-cover transform group-hover:scale-110 transition-transform duration-500"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-primary font-bold text-2xl bg-gradient-to-br from-white/10 to-transparent">
                                    {token.symbol.slice(0, 2)}
                                </div>
                            )}
                            {/* Rank Badge */}
                            {/* Rank Badge */}
                            {index < 3 && (
                                <div className={`absolute top-0 left-0 w-6 h-6 flex items-center justify-center rounded-tl-xl rounded-br-xl backdrop-blur-md ${index === 0 ? "bg-yellow-500/20 text-yellow-400" :
                                    index === 1 ? "bg-slate-300/20 text-slate-300" :
                                        "bg-orange-500/20 text-orange-400"
                                    }`}>
                                    <Icon
                                        icon={index === 0 ? "solar:crown-bold" : "solar:medal-ribbon-star-bold"}
                                        className="w-3.5 h-3.5"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Content Column */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                            {/* Header Row */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-white text-base leading-tight truncate pr-2">{token.name}</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] font-bold text-black bg-primary px-1.5 py-0.5 rounded-[4px]">
                                            ${token.symbol}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground truncate">
                                            by {token.creatorWallet ? `${token.creatorWallet.slice(0, 4)}...${token.creatorWallet.slice(-4)}` : "unknown"}
                                        </span>
                                    </div>
                                </div>

                                {/* Price Box */}
                                <div className="text-right">
                                    <div className="font-bold text-white text-sm tracking-tight">
                                        {formatPrice(BigInt(token.currentPrice || "0"))}
                                    </div>
                                    <div className={`flex items-center justify-end gap-0.5 text-[11px] font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
                                        <span className="text-xs">{isPositive ? "+" : "-"}</span>
                                        {Math.abs(priceChange).toFixed(2)}%
                                    </div>
                                </div>
                            </div>

                            {/* Bonding Curve Meter (Mini) */}
                            <div className="mt-3">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-semibold text-muted-foreground/80 uppercase">Curve Progress</span>
                                    <span className="text-[10px] font-bold text-white">{progress.toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className="h-full bg-gradient-to-r from-primary to-primary/50 shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Footer - Glass Strip */}
                    <div className="grid grid-cols-2 gap-px bg-white/5 rounded-lg mt-3 overflow-hidden border border-white/5">
                        <div className="px-3 py-2 bg-white/[0.02]">
                            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block mb-0.5">Market Cap</span>
                            <span className="text-xs font-bold text-white block">
                                {formatMarketCap(token.marketCap || "0")}
                            </span>
                        </div>
                        <div className="px-3 py-2 bg-white/[0.02]">
                            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block mb-0.5">Volume (24h)</span>
                            <span className="text-xs font-bold text-white block">
                                {formatCompactNumber(token.volume24h || 0, 1)} TON
                            </span>
                            <span className="text-[9px] text-muted-foreground block">
                                ~${formatCompactNumber((token.volume24h || 0) * tonPrice, 0)}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// Token List Skeleton
function TokenListSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                        <div className="flex gap-4">
                            <Skeleton className="w-16 h-16 rounded-xl" />
                            <div className="flex-1 space-y-3">
                                <div className="flex justify-between">
                                    <div className="space-y-1">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                    <div className="space-y-1">
                                        <Skeleton className="h-5 w-20" />
                                        <Skeleton className="h-3 w-12" />
                                    </div>
                                </div>
                                <Skeleton className="h-2 w-full" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// Empty State
function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Icon icon="solar:box-minimalistic-bold" className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{message}</p>
        </div>
    );
}

export default function TradePage() {
    const router = useRouter();
    const { trendingTokens, newTokens, searchResults, isLoading, searchTokens, clearSearch, positions } = useTrading();
    const { walletAddress, tonPrice } = useWallet();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("trending");

    // Check if wallet exists (either address is set OR mnemonic exists in localStorage)
    const [hasWallet, setHasWallet] = useState(true); // Default to true to avoid flash

    useEffect(() => {
        // Check both walletAddress from context and mnemonic from localStorage
        const mnemonic = localStorage.getItem("quantum_wallet_mnemonic");
        setHasWallet(!!walletAddress || !!mnemonic);
    }, [walletAddress]);


    // Lottie refs for tab icons
    const fireLottieRef = useRef<LottieRefCurrentProps>(null);
    const sparklesLottieRef = useRef<LottieRefCurrentProps>(null);
    const diamondLottieRef = useRef<LottieRefCurrentProps>(null);

    // Prefetch trade routes
    useEffect(() => {
        router.prefetch("/trade/create");
        // Prefetch first few token pages
        trendingTokens.slice(0, 5).forEach(token => {
            router.prefetch(`/trade/${token.id}`);
        });
    }, [router, trendingTokens]);

    // Play animation when tab changes
    useEffect(() => {
        if (activeTab === "trending") {
            fireLottieRef.current?.goToAndPlay(0);
        } else if (activeTab === "new") {
            sparklesLottieRef.current?.goToAndPlay(0);
        } else if (activeTab === "holdings") {
            diamondLottieRef.current?.goToAndPlay(0);
        }
    }, [activeTab]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (searchQuery.trim()) {
                searchTokens(searchQuery);
            } else {
                clearSearch();
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [searchQuery, searchTokens, clearSearch]);

    const displayTokens = searchQuery.trim()
        ? searchResults
        : activeTab === "trending"
            ? trendingTokens
            : newTokens;

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-32">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 pb-2">
                <div className="px-4 pt-4 pb-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/20 text-primary rounded-md">BETA</span>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-white">
                                QC <span className="text-primary">RocketStart</span>
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium tracking-wide">Token Launchpad on TON</p>
                        </div>
                        <Button
                            onClick={() => router.push("/trade/create")}
                            className="bg-white hover:bg-white/90 text-black gap-2 font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all rounded-full px-5 h-10"
                        >
                            <Icon icon="solar:rocket-bold" className="w-5 h-5" />
                            Launch
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="relative group mb-3">
                        <Icon
                            icon="solar:magnifer-linear"
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-white transition-colors"
                        />
                        <Input
                            type="text"
                            placeholder="Search by name or ticker..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:bg-white/10 focus:border-white/20 transition-all rounded-xl"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white p-1 rounded-full hover:bg-white/10"
                            >
                                <Icon icon="solar:close-circle-bold" className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    {!searchQuery && (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="w-full bg-[#121212]/50 backdrop-blur-md p-1 h-11 rounded-xl grid grid-cols-4 gap-1 border border-white/5 items-stretch">
                                <TabsTrigger
                                    value="trending"
                                    className="h-full data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:backdrop-blur-md border border-transparent data-[state=active]:border-white/10 rounded-lg text-xs font-bold tracking-wide transition-all shadow-none"
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Lottie
                                            lottieRef={fireLottieRef}
                                            animationData={fireAnimation}
                                            loop={true}
                                            autoplay={activeTab === "trending"}
                                            className="w-4 h-4"
                                        />
                                        <span>Hot</span>
                                    </div>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="new"
                                    className="h-full data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:backdrop-blur-md border border-transparent data-[state=active]:border-white/10 rounded-lg text-xs font-bold tracking-wide transition-all shadow-none"
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Lottie
                                            lottieRef={sparklesLottieRef}
                                            animationData={sparklesAnimation}
                                            loop={true}
                                            autoplay={activeTab === "new"}
                                            className="w-4 h-4"
                                        />
                                        <span>New</span>
                                    </div>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="holdings"
                                    className="h-full data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:backdrop-blur-md border border-transparent data-[state=active]:border-white/10 rounded-lg text-xs font-bold tracking-wide transition-all shadow-none"
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Lottie
                                            lottieRef={diamondLottieRef}
                                            animationData={diamondAnimation}
                                            loop={true}
                                            autoplay={activeTab === "holdings"}
                                            className="w-4 h-4"
                                        />
                                        <span>Bag</span>
                                    </div>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="creator"
                                    className="h-full data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:backdrop-blur-md border border-transparent data-[state=active]:border-white/10 rounded-lg text-xs font-bold tracking-wide transition-all shadow-none"
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Icon icon="solar:money-bag-bold" className="w-4 h-4 text-amber-400" />
                                        <span>Earn</span>
                                    </div>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4">
                {/* Global Live Trades */}
                <GlobalLiveTrades />

                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <TokenListSkeleton />
                    ) : searchQuery && searchResults.length === 0 ? (
                        <EmptyState message={`No tokens found for "${searchQuery}"`} />
                    ) : activeTab === "creator" ? (
                        <CreatorEarningsDashboard />
                    ) : activeTab === "holdings" ? (
                        positions.length === 0 ? (
                            <EmptyState message="You don't have any token holdings yet" />
                        ) : (
                            <div className="space-y-3">
                                {positions.map((position, index) => (
                                    position.token && (
                                        <TokenCard
                                            key={position.tokenId}
                                            token={position.token}
                                            index={index}
                                            tonPrice={tonPrice || 0}
                                        />
                                    )
                                ))}
                            </div>
                        )
                    ) : displayTokens.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <Icon icon="solar:box-minimalistic-bold" className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground mb-4">No tokens available yet. Be the first to create one!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {displayTokens.map((token, index) => (
                                <TokenCard
                                    key={token.id}
                                    token={token}
                                    index={index}
                                    tonPrice={tonPrice || 0}
                                />
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Floating CTA for non-wallet users */}
            {!hasWallet && (
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="fixed bottom-28 left-4 right-4 z-30"
                >
                    <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl rounded-full border border-white/20 px-4 py-2.5 flex items-center gap-3 shadow-lg">
                        <Icon icon="solar:wallet-bold" className="w-5 h-5 text-primary" />
                        <span className="flex-1 text-sm text-white">Connect QC Wallet to trade</span>
                        <Button
                            onClick={() => router.push("/wallet")}
                            size="sm"
                            className="bg-white hover:bg-white/90 text-black font-semibold h-8 px-4 rounded-full"
                        >
                            Connect
                        </Button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
