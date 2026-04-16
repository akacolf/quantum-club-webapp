"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { TokenImageFill } from "@/components/ui/token-image";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrading } from "@/app/(contexts)/TradingContext";
import { Token, DEFAULT_GRADUATION_THRESHOLD_TON, type HolderPosition } from "@/types/trading";
import { formatPrice, formatMarketCap, formatCompactNumber } from "@/lib/jetton-operations";
import { useWallet } from "@/app/wallet/WalletContext";
import { hasMnemonic } from "@/lib/secure-mnemonic";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

// Lazy load Lottie (large library)
const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
  loading: () => <div className="w-5 h-5 bg-white/10 rounded animate-pulse" />
});

// Lazy load GlobalLiveTrades (below-fold content)
const GlobalLiveTrades = dynamic(() => import("@/app/ecosystem/trade/(components)/GlobalLiveTrades"), {
  ssr: false,
  loading: () => <Skeleton className="h-40" />
});

// Lazy load Lottie animation data
const useLottieData = () => {
  const [data, setData] = useState<{
    fire: object | null;
    sparkles: object | null;
    diamond: object | null;
    rocket: object | null;
  }>({ fire: null, sparkles: null, diamond: null, rocket: null });

  useEffect(() => {
    const loadAnimations = async () => {
      const [fire, sparkles, diamond, rocket] = await Promise.all([
        import("@/public/lottie/fire-lottie.json").then(m => m.default),
        import("@/public/lottie/sparkles-lottie.json").then(m => m.default),
        import("@/public/lottie/diamond-lottie.json").then(m => m.default),
        import("@/public/lottie/rocket-lottie.json").then(m => m.default),
      ]);
      setData({ fire, sparkles, diamond, rocket });
    };
    loadAnimations();
  }, []);

  return data;
};

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

function TokenCard({ token, index, showRank = true }: { token: Token; index: number; showRank?: boolean }) {
    const trades = token.trades || 0;
    // Use tonReserve (on-chain) or fall back to marketCap for progress
    const progress = calculateProgress(
        token.tonReserve || token.marketCap,
        token.graduationThreshold || DEFAULT_GRADUATION_THRESHOLD_TON
    );

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index * 0.05, 0.3) }}
        >
        <Link href={`/ecosystem/trade/${token.id}`} prefetch={true}>
            <Card
                className="bg-white/5 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer overflow-hidden group relative shadow-md hover:shadow-lg hover:bg-white/10"
            >
                {/* Subtle Gradient Glow */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-[80px] rounded-full translate-x-10 -translate-y-10 group-hover:bg-primary/10 transition-colors duration-700" />
                
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <CardContent className="p-3 relative z-10">
                    <div className="flex gap-4 items-center">
                        {/* Token Image - Sleek with Rank */}
                        <div
                            className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[#222] shadow-inner ring-1 ring-white/5 group-hover:ring-white/10 transition-all flex-shrink-0"
                            style={{ viewTransitionName: `token-img-${token.id}` }}
                        >
                            {token.image ? (
                                <TokenImageFill
                                    src={token.image}
                                    alt={token.name}
                                    className="object-cover transform group-hover:scale-105 transition-transform duration-700"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xl bg-gradient-to-br from-white/5 to-white/[0.02]">
                                    {token.symbol.slice(0, 2)}
                                </div>
                            )}
                            
                             {/* Rank Badge - Clean & Minimal */}
                             {showRank && index < 3 && (
                                <div className="absolute top-0 left-0">
                                    <div className={`
                                        w-6 h-6 flex items-center justify-center rounded-br-xl backdrop-blur-md
                                        ${index === 0 ? "bg-yellow-500/80 text-black shadow-[0_0_10px_rgba(234,179,8,0.3)]" :
                                          index === 1 ? "bg-slate-300/80 text-black" :
                                          "bg-orange-500/80 text-black"}
                                    `}>
                                        <Icon
                                            icon="solar:crown-bold"
                                            className="w-3.5 h-3.5"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Content Column */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                            {/* Header Row */}
                            <div className="flex items-start justify-between mb-1.5 ">
                                <div className="min-w-0 pr-2">
                                    <h3 className="font-bold text-white text-[15px] leading-tight truncate group-hover:text-primary transition-colors duration-300">{token.name}</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] font-bold text-black bg-white/90 px-1.5 py-px rounded-[4px] tracking-tight">
                                            ${token.symbol}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground truncate opacity-60">
                                            by {token.creatorWallet ? `${token.creatorWallet.slice(0, 4)}...${token.creatorWallet.slice(-4)}` : "unknown"}
                                        </span>
                                    </div>
                                </div>

                                {/* Price Box - Right Aligned */}
                                <div className="text-right flex-shrink-0">
                                    <div className="font-medium text-white text-sm tracking-tight">
                                        {formatPrice(BigInt(token.currentPrice || "0"))}
                                    </div>
                                    <div className="flex items-center justify-end gap-0.5 text-[10px] font-bold mt-0.5 text-muted-foreground">
                                        <Icon icon="solar:transfer-horizontal-bold" className="w-2.5 h-2.5" />
                                        {trades} trade{trades !== 1 ? "s" : ""}
                                    </div>
                                </div>
                            </div>
                            
                             {/* Progress Bar - Slim & Elegant */}
                             <div className="space-y-1">
                                <div className="flex justify-between items-center text-[9px] font-medium opacity-60">
                                    <span className="text-muted-foreground uppercase tracking-wider">Bonding Curve</span>
                                    <span className={progress > 90 ? "text-green-400" : "text-white"}>{progress.toFixed(1)}%</span>
                                </div>
                                <div className="h-1 w-full bg-[#333] rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={`h-full relative ${
                                            progress >= 100 
                                            ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
                                            : "bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                                        }`}
                                    />
                                </div>
                             </div>

                        </div>
                    </div>

                    {/* Footer Stats - Minimalist Row */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                         <div className="flex items-center gap-1.5">
                            <Icon icon="solar:chart-2-bold" className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground font-medium">MCap:</span>
                            <span className="text-[10px] font-bold text-white tracking-wide">{formatMarketCap(token.tonReserve || token.marketCap || "0")}</span>
                         </div>
                         <div className="w-px h-3 bg-white/10" />
                         <div className="flex items-center gap-1.5">
                             <Icon icon="solar:graph-new-bold" className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground font-medium">Vol:</span>
                            <span className="text-[10px] font-bold text-white tracking-wide">{formatCompactNumber(token.volume24h || 0, 1)} TON</span>
                         </div>
                    </div>

                </CardContent>
            </Card>
        </Link>
        </motion.div>
    );
}

// Token List Skeleton
function TokenListSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-white/5 border border-white/5">
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

function PositionCard({ position, index }: { position: HolderPosition; index: number }) {
    const token = position.token!;
    const balanceTokens = Number(position.balance) / 1e9;
    const pricePerTokenTon = Number(token.currentPrice || "0") / 1e9;
    const currentValueTon = balanceTokens * pricePerTokenTon;
    const totalInvested = Number(position.totalInvested || "0") / 1e9;
    const hasPnl = totalInvested > 0;
    const pnlTon = hasPnl ? currentValueTon - totalInvested : 0;
    const pnlPercent = hasPnl && totalInvested > 0 ? (pnlTon / totalInvested) * 100 : 0;
    const isPnlPositive = pnlTon >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index * 0.05, 0.3) }}
        >
            <Link href={`/ecosystem/trade/${token.id}`} prefetch={true}>
                <Card className="bg-white/5 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer overflow-hidden group shadow-md hover:shadow-lg hover:bg-white/10">
                    <CardContent className="p-3">
                        <div className="flex gap-3 items-center">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#222] ring-1 ring-white/5 flex-shrink-0">
                                {token.image ? (
                                    <TokenImageFill src={token.image} alt={token.name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-primary font-bold text-lg">
                                        {token.symbol.slice(0, 2)}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="font-bold text-white text-sm truncate">{token.symbol}</h3>
                                    <Badge className="bg-primary/20 text-primary text-[9px] px-1.5 py-0 h-4 border-0 flex-shrink-0">
                                        {formatCompactNumber(balanceTokens, 1)}
                                    </Badge>
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {formatCompactNumber(currentValueTon, 4)} TON
                                </span>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="font-medium text-white text-sm">
                                    {formatPrice(BigInt(token.currentPrice || "0"))}
                                </div>
                                {hasPnl ? (
                                    <div className={`text-[11px] font-bold ${isPnlPositive ? "text-green-400" : "text-red-400"}`}>
                                        {isPnlPositive ? "+" : ""}{pnlPercent.toFixed(2)}%
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-muted-foreground/50">--</div>
                                )}
                            </div>
                        </div>
                        {hasPnl && (
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                <span className="text-[10px] text-muted-foreground">P/L</span>
                                <span className={`text-[10px] font-bold ${isPnlPositive ? "text-green-400" : "text-red-400"}`}>
                                    {isPnlPositive ? "+" : ""}{formatCompactNumber(pnlTon, 4)} TON
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </Link>
        </motion.div>
    );
}

export default function TradePage() {
    const router = useRouter();
    useTelegramBackButton("/home");
    const { trendingTokens, newTokens, graduatedTokens, searchResults, isLoading, searchTokens, clearSearch, positions, myTokens, retryDeployToken } = useTrading();
    const { walletAddress } = useWallet();
    const [{ tab: activeTab, q: searchQuery }, setParams] = useQueryStates({
        tab: parseAsStringLiteral(["trending", "new", "holdings", "created", "dex"]).withDefault("trending"),
        q: parseAsString.withDefault(""),
    }, { history: "replace" });
    const setActiveTab = (value: string) => setParams({ tab: value as typeof activeTab });
    const setSearchQuery = (value: string) => setParams({ q: value });
    const [deployingTokenId, setDeployingTokenId] = useState<string | null>(null);
    const tokenListRef = useRef<HTMLDivElement>(null);
    const {telegramId} = useUserContext()
    // Check if wallet exists - prioritize context state, fallback to localStorage for SSR
    const [hasWallet, setHasWallet] = useState(true); // Default to true to avoid flash

    useEffect(() => {
        // If context has wallet address, we definitely have a wallet
        if (walletAddress) {
            setHasWallet(true);
            return;
        }
        
        // If context is empty, check localStorage (for SSR hydration)
        // This will be empty after logout due to clearWallet()
        setHasWallet(hasMnemonic(telegramId));
    }, [walletAddress, telegramId]);

    // Handle retry deployment
    const handleRetryDeploy = async (tokenId: string) => {
        setDeployingTokenId(tokenId);
        toast.info("Deploying contract...");
        
        const result = await retryDeployToken(tokenId);
        
        if (result.success) {
            toast.success("Token deployed successfully!");
        } else {
            toast.error(result.error || "Deployment failed");
        }
        
        setDeployingTokenId(null);
    };

    // Lazy load lottie animations
    const lottieData = useLottieData();

    // Prefetch first few token detail pages (dynamic routes not covered by Link)
    useEffect(() => {
        trendingTokens.slice(0, 5).forEach(token => {
            router.prefetch(`/ecosystem/trade/${token.id}`);
        });
    }, [router, trendingTokens]);

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

    const holdingsListRef = useRef<HTMLDivElement>(null);
    const dexListRef = useRef<HTMLDivElement>(null);
    const myTokensListRef = useRef<HTMLDivElement>(null);

    // Filter positions to only those with token data
    const validPositions = positions.filter(p => p.token);
    const deployedTokens = myTokens.filter(t => t.isDeployed);

    const tokenVirtualizer = useWindowVirtualizer({
        count: displayTokens.length,
        estimateSize: () => 140,
        overscan: 3,
        scrollMargin: tokenListRef.current?.offsetTop ?? 0,
    });

    const holdingsVirtualizer = useWindowVirtualizer({
        count: validPositions.length,
        estimateSize: () => 100,
        overscan: 5,
        scrollMargin: holdingsListRef.current?.offsetTop ?? 0,
    });

    const dexVirtualizer = useWindowVirtualizer({
        count: graduatedTokens.length,
        estimateSize: () => 140,
        overscan: 3,
        scrollMargin: dexListRef.current?.offsetTop ?? 0,
    });

    const myTokensVirtualizer = useWindowVirtualizer({
        count: deployedTokens.length,
        estimateSize: () => 140,
        overscan: 3,
        scrollMargin: myTokensListRef.current?.offsetTop ?? 0,
    });

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
                        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-bold shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_25px_rgba(var(--primary),0.4)] transition-all rounded-full px-5 h-10">
                            <Link href="/ecosystem/trade/create">
                                <Icon icon="solar:rocket-bold" className="w-5 h-5" />
                                Launch
                            </Link>
                        </Button>
                    </div>

                    {/* Testnet notice */}
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 flex items-center gap-2.5 mb-1">
                        <Icon icon="lucide:flask-conical" className="w-4 h-4 text-orange-400 shrink-0"/>
                        <p className="text-[11px] text-orange-400/90 leading-snug">
                            Running on <span className="font-semibold">TON Testnet</span> — no real funds at risk. Make sure to switch to testnet mode from your wallet&apos;s settings. Get 2 TON/hour from{" "}
                            <a href="https://t.me/testgiver_ton_bot" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-orange-400 hover:text-orange-300">@testgiver_ton_bot</a>.
                        </p>
                    </div>

                    {/* Search */}
                    <div className="relative group mb-1">
                        <Icon
                            icon="solar:magnifer-linear"
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-white transition-colors z-10"
                        />
                        <Input
                            type="text"
                            placeholder="Search tokens..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 bg-white/5 border-white/5 text-white placeholder:text-muted-foreground focus:bg-white/10 focus:border-white/20 transition-all rounded-xl backdrop-blur-sm"
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
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-3">
                            <TabsList className="w-full bg-black/40 backdrop-blur-md p-1 h-12 rounded-xl grid grid-cols-5 gap-1 border border-white/5 items-stretch shadow-inner">
                                <TabsTrigger
                                    value="trending"
                                    className="h-full data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-white/10 border border-transparent rounded-lg text-[11px] font-bold tracking-wide transition-all duration-300"
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        {lottieData.fire ? (
                                            <Lottie
                                                animationData={lottieData.fire}
                                                loop={true}
                                                autoplay={true}
                                                className="w-4 h-4"
                                            />
                                        ) : (
                                            <div className="w-4 h-4" />
                                        )}
                                        <span>Hot</span>
                                    </div>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="new"
                                    className="h-full data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-white/10 border border-transparent rounded-lg text-[11px] font-bold tracking-wide transition-all duration-300"
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        {lottieData.sparkles ? (
                                            <Lottie
                                                animationData={lottieData.sparkles}
                                                loop={true}
                                                autoplay={true}
                                                className="w-4 h-4"
                                            />
                                        ) : (
                                            <div className="w-4 h-4" />
                                        )}
                                        <span>New</span>
                                    </div>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="holdings"
                                    className="h-full data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-white/10 border border-transparent rounded-lg text-[11px] font-bold tracking-wide transition-all duration-300"
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        {lottieData.diamond ? (
                                            <Lottie
                                                animationData={lottieData.diamond}
                                                loop={true}
                                                autoplay={true}
                                                className="w-4 h-4"
                                            />
                                        ) : (
                                            <div className="w-4 h-4" />
                                        )}
                                        <span>Bag</span>
                                    </div>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="created"
                                    className="h-full data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-white/10 border border-transparent rounded-lg text-[11px] font-bold tracking-wide transition-all duration-300 relative"
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        {lottieData.rocket ? (
                                            <Lottie
                                                animationData={lottieData.rocket}
                                                loop={true}
                                                autoplay={true}
                                                className="w-4 h-4"
                                            />
                                        ) : (
                                            <div className="w-4 h-4" />
                                        )}
                                        <span>Mine</span>
                                    </div>
                                    {myTokens.some(t => !t.isDeployed) && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                                    )}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="dex"
                                    className="h-full data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:border-white/10 border border-transparent rounded-lg text-[11px] font-bold tracking-wide transition-all duration-300"
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        <Icon icon="solar:chart-2-bold" className="w-4 h-4 text-green-400" />
                                        <span>DEX</span>
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
                    ) : activeTab === "dex" ? (
                        graduatedTokens.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                                    <Icon icon="solar:chart-2-bold" className="w-8 h-8 text-green-400" />
                                </div>
                                <p className="text-white font-medium mb-2">No DEX tokens yet</p>
                                <p className="text-xs text-muted-foreground max-w-[200px]">
                                    Tokens that reach 2,000 TON market cap graduate to STON.fi DEX
                                </p>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-green-500/20 text-green-400 border-0">
                                        <Icon icon="solar:verified-check-bold" className="w-3 h-3 mr-1" />
                                        Tradable on STON.fi
                                    </Badge>
                                </div>
                                <div ref={dexListRef}>
                                    <div className="relative" style={{ height: `${dexVirtualizer.getTotalSize()}px` }}>
                                        {dexVirtualizer.getVirtualItems().map((virtualItem) => {
                                            const token = graduatedTokens[virtualItem.index];
                                            return (
                                                <div
                                                    key={token.id}
                                                    className="absolute top-0 left-0 w-full pb-3"
                                                    style={{ transform: `translateY(${virtualItem.start - dexVirtualizer.options.scrollMargin}px)` }}
                                                    data-index={virtualItem.index}
                                                    ref={dexVirtualizer.measureElement}
                                                >
                                                    <TokenCard
                                                        token={token}
                                                        index={virtualItem.index}
                                                        showRank={false}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )
                    ) : activeTab === "holdings" ? (
                        validPositions.length === 0 ? (
                            <EmptyState message="You don't have any token holdings yet" />
                        ) : (
                            <div ref={holdingsListRef}>
                                <div className="relative" style={{ height: `${holdingsVirtualizer.getTotalSize()}px` }}>
                                    {holdingsVirtualizer.getVirtualItems().map((virtualItem) => {
                                        const position = validPositions[virtualItem.index];
                                        return (
                                            <div
                                                key={position.tokenId}
                                                className="absolute top-0 left-0 w-full pb-3"
                                                style={{ transform: `translateY(${virtualItem.start - holdingsVirtualizer.options.scrollMargin}px)` }}
                                                data-index={virtualItem.index}
                                                ref={holdingsVirtualizer.measureElement}
                                            >
                                                <PositionCard
                                                    position={position}
                                                    index={virtualItem.index}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    ) : activeTab === "created" ? (
                        myTokens.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Icon icon="solar:rocket-bold" className="w-8 h-8 text-primary" />
                                </div>
                                <p className="text-white font-medium mb-2">No tokens created yet</p>
                                <p className="text-xs text-muted-foreground max-w-[200px] mb-4">
                                    Launch your own token and start building your community
                                </p>
                                <Button asChild className="bg-white hover:bg-white/90 text-black gap-2 font-bold rounded-full px-5">
                                    <Link href="/ecosystem/trade/create">
                                        <Icon icon="solar:rocket-bold" className="w-4 h-4" />
                                        Create token
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Pending Deployments Section */}
                                {myTokens.filter(t => !t.isDeployed).length > 0 && (
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge className="bg-orange-500/20 text-orange-400 border-0">
                                                <Icon icon="solar:danger-triangle-bold" className="w-3 h-3 mr-1" />
                                                Pending Deployment
                                            </Badge>
                                        </div>
                                        {myTokens.filter(t => !t.isDeployed).map((token) => (
                                            <Card key={token.id} className="bg-[#111] border-[#333] mb-2">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 relative">
                                                            {token.image ? (
                                                                <TokenImageFill src={token.image} alt={token.name} />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white/50">
                                                                    {token.symbol?.charAt(0) || "?"}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-white truncate">{token.name}</h4>
                                                            <p className="text-xs text-orange-400">${token.symbol}</p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Token not deployed
                                                            </p>
                                                        </div>
                                                        <Button
                                                            onClick={() => handleRetryDeploy(token.id)}
                                                            disabled={deployingTokenId === token.id}
                                                            className="bg-white hover:bg-white/90 text-black font-bold rounded-full px-4"
                                                            size="sm"
                                                        >
                                                            {deployingTokenId === token.id ? (
                                                                <>
                                                                    <ButtonLoader />
                                                                    <span className="ml-1">Deploying...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Icon icon="solar:rocket-bold" className="w-4 h-4 mr-1" />
                                                                    Deploy
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Deployed Tokens */}
                                {deployedTokens.length > 0 && (
                                    <>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge className="bg-green-500/20 text-green-400 border-0">
                                                <Icon icon="solar:verified-check-bold" className="w-3 h-3 mr-1" />
                                                Live Tokens
                                            </Badge>
                                        </div>
                                        <div ref={myTokensListRef}>
                                            <div className="relative" style={{ height: `${myTokensVirtualizer.getTotalSize()}px` }}>
                                                {myTokensVirtualizer.getVirtualItems().map((virtualItem) => {
                                                    const token = deployedTokens[virtualItem.index];
                                                    return (
                                                        <div
                                                            key={token.id}
                                                            className="absolute top-0 left-0 w-full pb-3"
                                                            style={{ transform: `translateY(${virtualItem.start - myTokensVirtualizer.options.scrollMargin}px)` }}
                                                            data-index={virtualItem.index}
                                                            ref={myTokensVirtualizer.measureElement}
                                                        >
                                                            <TokenCard
                                                                token={token}
                                                                index={virtualItem.index}
                                                                showRank={false}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}
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
                        <div ref={tokenListRef}>
                            <div className="relative" style={{ height: `${tokenVirtualizer.getTotalSize()}px` }}>
                                {tokenVirtualizer.getVirtualItems().map((virtualItem) => {
                                    const token = displayTokens[virtualItem.index];
                                    return (
                                        <div
                                            key={token.id}
                                            className="absolute top-0 left-0 w-full pb-3"
                                            style={{ transform: `translateY(${virtualItem.start - tokenVirtualizer.options.scrollMargin}px)` }}
                                            data-index={virtualItem.index}
                                            ref={tokenVirtualizer.measureElement}
                                        >
                                            <TokenCard
                                                token={token}
                                                index={virtualItem.index}
                                                showRank={activeTab === "trending"}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
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
                        <Button size="sm" asChild className="bg-white hover:bg-white/90 text-black font-semibold h-8 px-4 rounded-full">
                            <Link href="/wallet">Connect</Link>
                        </Button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
