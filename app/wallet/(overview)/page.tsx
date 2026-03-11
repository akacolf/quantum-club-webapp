"use client";

import { useState, useEffect, useRef } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Loader from "@/app/(components)/Loader";
import { mnemonicNew, mnemonicToWalletKey } from "@ton/crypto";
import { WalletContractV5R1 } from "@ton/ton";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useWallet } from "../WalletContext";
import { DeletePin } from "@/components/ui/biometric-auth";
import dynamic from "next/dynamic";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { categorizeNft } from "@/lib/nft-marketplace";
import { useLivePrice } from "@/app/(hooks)/queries/use-trades";

const AnimatedPrice = dynamic(
  () => import("@/components/ui/animated-price").then((mod) => mod.AnimatedPrice),
  { ssr: false, loading: () => <Skeleton className="h-8 w-24" /> }
);

const WalletPriceChart = dynamic(
  () => import("../WalletPriceChart").then((mod) => mod.WalletPriceChart),
  { ssr: false, loading: () => <Skeleton className="w-full h-full rounded-lg" /> }
);
import { useStakingApyQuery } from "@/app/(hooks)/queries/use-staking-pools";
import { usePriceHistoryQuery } from "@/app/(hooks)/queries/use-price-history";
import { useQueryClient } from "@tanstack/react-query";

// Asset detail types
interface PricePoint {
  time: string;
  price: number;
}

type ChartPeriod = '1H' | '1D' | '1W' | '1M' | '6M' | '1Y';

interface AssetDetail {
  name: string;
  symbol: string;
  balance: string;
  value: number;
  priceUsd: number;
  image?: string;
  color: string;
  jettonAddress?: string;
}

const CHART_COLORS = [
  "#3B82F6", "#F97316", "#10B981", "#8B5CF6", "#EC4899", "#06B6D4", "#F59E0B", "#EF4444"
];
const TON_ICON = "https://ton.org/download/ton_symbol.svg";
const ETH_ICON = "/svg/eth-logo.svg";
const BTC_ICON = "/svg/btc-logo.svg";
const SOL_ICON = "/svg/sol-logo.svg";
const TRX_ICON = "/svg/trx-logo.svg";

// Format amount to 2 decimal places for display
const formatAmount = (value: number | string, decimals: number = 2): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0.00";
  return num.toFixed(decimals);
};

// Format USD value
const formatUsd = (value: number | string): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return "$0.00";
  return `$${num.toFixed(2)}`;
};

// NFT Filter Chips sub-component
type NftFilterType = "all" | "gifts" | "collections";

function NftFilterChips({ nfts }: { nfts: Array<{ address: string; name: string; image?: string; collectionAddress?: string; collectionName?: string; description?: string; ownerAddress?: string; sale?: any; attributes?: any[] }> }) {
  const [filter, setFilter] = useQueryState("nftFilter", parseAsStringLiteral(["all", "gifts", "collections"] as const).withDefault("all").withOptions({ history: "replace" }));

  const filteredNfts = nfts.filter((nft) => {
    if (filter === "all") return true;
    const category = categorizeNft(nft);
    if (filter === "gifts") return category === "gift" || category === "sticker";
    if (filter === "collections") return category === "regular";
    return true;
  });

  const filters: { value: NftFilterType; label: string; icon: string }[] = [
    { value: "all", label: "All", icon: "solar:widget-linear" },
    { value: "gifts", label: "Gifts", icon: "solar:gift-linear" },
    { value: "collections", label: "Collections", icon: "solar:gallery-minimalistic-linear" },
  ];

  return (
    <>
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-[#111] border border-[#222] text-gray-400 hover:bg-[#161616]"
            }`}
          >
            <Icon icon={f.icon} className="w-3.5 h-3.5" />
            {f.label}
          </button>
        ))}
      </div>

      {filteredNfts.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-sm text-gray-500">No {filter === "gifts" ? "gift" : "collection"} NFTs found</p>
        </div>
      )}

      {filteredNfts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {filteredNfts.map((nft, index) => {
            const category = categorizeNft(nft);
            return (
              <Link key={index} href={`/wallet/nft/${encodeURIComponent(nft.address)}`}>
                <Card className="bg-[#111] border-[#222] rounded-2xl shadow-none overflow-hidden hover:bg-[#161616] transition-colors cursor-pointer">
                  <div className="w-full aspect-square bg-[#1a1a1a] relative overflow-hidden" style={{ viewTransitionName: `nft-img-${nft.address.slice(-8)}` }}>
                    {nft.image ? (
                      <Image
                        src={nft.image}
                        alt={nft.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon icon="lucide:image" className="w-8 h-8 text-gray-600"/>
                      </div>
                    )}
                    {category === "gift" && (
                      <Badge className="absolute top-2 left-2 bg-purple-600 text-[10px] px-1.5 py-0">
                        <Icon icon="solar:gift-bold" className="w-3 h-3 mr-0.5" />
                        Gift
                      </Badge>
                    )}
                    {category === "sticker" && (
                      <Badge className="absolute top-2 left-2 bg-blue-600 text-[10px] px-1.5 py-0">
                        Sticker
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-bold text-white text-sm truncate">{nft.name}</h4>
                    {nft.collectionName && (
                      <p className="text-xs text-gray-500 truncate">{nft.collectionName}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function WalletPage() {
  const router = useRouter();
  const { MainQuantAmount, _hasHydrated } = useUserContext();
  const {
    walletAddress,
    setWalletAddress: setContextWalletAddress,
    tonBalance,
    tonUsdValue,
    totalUsdBalance,
    jettons,
    nfts,
    isLoadingAssets,
    isLoadingNfts,
    hasFetched,
    hideBalance,
    isTestnet,
    fetchWalletAssets,
    fetchNfts,
    toggleHideBalance,
    tonPrice,
    clearWallet,
    // Multi-chain
    ethAddress,
    btcAddress,
    solAddress,
    trxAddress,
    ethBalance,
    btcBalance,
    solBalance,
    trxBalance,
    ethUsdValue,
    btcUsdValue,
    solUsdValue,
    trxUsdValue,
    ethPrice,
    btcPrice,
    solPrice,
    trxPrice,
    isLoadingMultiChain
  } = useWallet();

  const { telegramId } = useUserContext();
  
  // Back button to return to main app
  useTelegramBackButton("/home");

  // Prefetch wallet action routes (not covered by <Link> on this page)
  useEffect(() => {
    router.prefetch("/wallet/send");
    router.prefetch("/wallet/receive");
    router.prefetch("/wallet/history");
    router.prefetch("/wallet/analytics");
    router.prefetch("/wallet/swap");
  }, [router]);

  const [hasWallet, setHasWallet] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: stakingApyData } = useStakingApyQuery(hasWallet);
  const bestApy = stakingApyData?.bestApy ?? 5.0;

  // Features Carousel state (timed with dots)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [carouselCurrent, setCarouselCurrent] = useState(0);
  const [carouselCount, setCarouselCount] = useState(0);

  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Features Carousel - track current slide
  useEffect(() => {
    if (!carouselApi) return;

    requestAnimationFrame(() => {
      setCarouselCount(carouselApi.scrollSnapList().length);
      setCarouselCurrent(carouselApi.selectedScrollSnap());
    });

    carouselApi.on("select", () => {
      setCarouselCurrent(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // Features Carousel - auto-play timer (7 seconds like home page)
  useEffect(() => {
    if (!carouselApi) return;

    const timer = setInterval(() => {
      carouselApi.scrollNext();
    }, 7000);

    return () => clearInterval(timer);
  }, [carouselApi, carouselCurrent]);

  // URL-synced wallet tab (shareable)
  const [walletTab, setWalletTab] = useQueryState("tab", parseAsStringLiteral(["assets", "nfts"] as const).withDefault("assets").withOptions({ history: "replace" }));

  // Asset detail modal state
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [chartPeriod, setChartPeriod] = useQueryState("period", parseAsStringLiteral(['1H', '1D', '1W', '1M', '6M', '1Y'] as const).withDefault('1D').withOptions({ history: "replace" }));
  const queryClient = useQueryClient();
  const [change24h, setChange24h] = useState<number | null>(null);

  // Virtualized jettons list
  const jettonsContainerRef = useRef<HTMLDivElement>(null);
  const jettonsVirtualizer = useWindowVirtualizer({
    count: jettons.length,
    estimateSize: () => 84,
    gap: 12,
    overscan: 5,
    scrollMargin: jettonsContainerRef.current?.offsetTop ?? 0,
  });

  // Track wallet balance history for 24h change
  useEffect(() => {
    if (!walletAddress || !hasFetched || isLoadingAssets) return;

    const currentValue = parseFloat(totalUsdBalance) || 0;
    if (currentValue === 0) {
      setChange24h(null);
      return;
    }

    const storageKey = `wallet_balance_history_${walletAddress}`;
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // Load existing history
    let history: Array<{ timestamp: number; value: number }> = [];
    try {
      const stored = localStorage.getItem(storageKey+`_${telegramId}`);
      if (stored) {
        history = JSON.parse(stored);
      }
    } catch {
      history = [];
    }

    // Add current snapshot (throttle to max 1 per 5 minutes)
    const lastEntry = history[history.length - 1];
    if (!lastEntry || now - lastEntry.timestamp > 5 * 60 * 1000) {
      history.push({ timestamp: now, value: currentValue });
    }

    // Remove entries older than 25 hours (keep some buffer)
    history = history.filter(h => h.timestamp > now - 25 * 60 * 60 * 1000);

    // Save updated history
    try {
      localStorage.setItem(storageKey+`_${telegramId}`, JSON.stringify(history));
    } catch {
      // Storage full, clear old entries
    }

    // Find the oldest entry within 24h range
    const oldEntries = history.filter(h => h.timestamp <= twentyFourHoursAgo + 60 * 60 * 1000);
    const referenceEntry = oldEntries.length > 0
      ? oldEntries[0]
      : history.length > 1 ? history[0] : null;

    if (referenceEntry && referenceEntry.value > 0) {
      const change = ((currentValue - referenceEntry.value) / referenceEntry.value) * 100;
      setChange24h(change);
    } else {
      // Not enough history yet
      setChange24h(0);
    }
  }, [walletAddress, totalUsdBalance, hasFetched, isLoadingAssets, telegramId]);

  // Price history via TanStack Query (auto-refreshes every 30s for 1H period)
  const { data: priceHistory = [], isLoading: isLoadingPrice } = usePriceHistoryQuery(
    selectedAsset?.symbol,
    selectedAsset?.jettonAddress,
    chartPeriod,
    isTestnet,
  );

  // Live price updates for selected asset via TanStack Query (5s polling)
  const { data: livePrice } = useLivePrice(selectedAsset?.symbol, 5000);

  useEffect(() => {
    if (!selectedAsset || livePrice == null) return;
    if (livePrice !== selectedAsset.priceUsd) {
      setSelectedAsset(prev => prev ? { ...prev, priceUsd: livePrice } : null);

      // Update chart cache with new price point for real-time visualization
      if (priceHistory.length > 0 && chartPeriod === '1H') {
        queryClient.setQueryData(
          ["price-history", selectedAsset.symbol, selectedAsset.jettonAddress, chartPeriod, isTestnet],
          (prev: PricePoint[] | undefined) => {
            if (!prev || prev.length === 0) return prev;
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], price: livePrice };
            return updated;
          },
        );
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedAsset is intentionally accessed by .symbol only; priceHistory.length avoids deep comparison
  }, [livePrice, selectedAsset?.symbol, chartPeriod, priceHistory.length]);

  useEffect(() => {
    const storedWallet = localStorage.getItem(`quantum_wallet_address_${telegramId}`);

    if (storedWallet) {
      setContextWalletAddress(storedWallet);
      setHasWallet(true);
    }
    requestAnimationFrame(() => {
      setIsChecking(false);
    });
  }, [setContextWalletAddress, telegramId]);

  // Fetch NFTs when wallet is loaded
  useEffect(() => {
    if (hasWallet && walletAddress) {
      fetchNfts();
    }
  }, [hasWallet, walletAddress, fetchNfts]);

  // Prefetch wallet subpages for faster navigation
  useEffect(() => {
    if (hasWallet && walletAddress) {
      // Prefetch main wallet function pages
      router.prefetch("/wallet/send");
      router.prefetch("/wallet/receive");
      router.prefetch("/wallet/history");
      router.prefetch("/wallet/swap");
      router.prefetch("/wallet/settings");
      router.prefetch("/wallet/send-qntm");
      router.prefetch("/wallet/analytics");
      router.prefetch("/wallet/earn");
      router.prefetch("/wallet/staking");
      router.prefetch("/wallet/explore");
      router.prefetch("/wallet/send-multiple");
      router.prefetch("/wallet/farming");
      router.prefetch("/wallet/unstake");
      router.prefetch("/wallet/marketplace");
      router.prefetch("/wallet/liquidity");
      // Prefetch all settings subpages
      router.prefetch("/wallet/settings/wallets");
      router.prefetch("/wallet/settings/recovery-phrase");
      router.prefetch("/legal/terms");
      router.prefetch("/legal/privacy");
    } else {
      // Prefetch onboarding flow pages for users without wallet
      router.prefetch("/wallet/backup");
      router.prefetch("/wallet/verify");
      router.prefetch("/wallet/import");
    }
  }, [hasWallet, walletAddress, router]);


  const createWallet = async () => {
    setIsLoading(true);
    try {
      const mnemonic = await mnemonicNew(24);
      const keyPair = await mnemonicToWalletKey(mnemonic);
      const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      const address = wallet.address.toString({ bounceable: false, testOnly: isTestnet });
      sessionStorage.setItem("pending_wallet_mnemonic", mnemonic.join(" "));
      sessionStorage.setItem("pending_wallet_address", address);
      router.push("/wallet/backup");
    } catch (error) {
      console.error("Wallet creation error:", error);
      toast.error("Failed to create wallet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const walletExit = () => {
    clearWallet();
    setHasWallet(false);
    DeletePin(telegramId || "");
  }
  if (isChecking) {
    return <Loader />;
  }

  if (!hasWallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 w-full">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md text-center space-y-8"
        >
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="pt-10 pb-8 px-6 flex flex-col items-center gap-6">
              <div className="w-24 h-24 bg-[#222] rounded-3xl flex items-center justify-center border border-[#333]">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" className="text-gray-400">
                  <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
                    <path d="M21.1 8.004q-.085-.005-.181-.004h-2.525c-2.068 0-3.837 1.628-3.837 3.75s1.77 3.75 3.837 3.75h2.525q.096.001.182-.004a1.755 1.755 0 0 0 1.645-1.628c.004-.06.004-.125.004-.185V9.817c0-.06 0-.125-.004-.185a1.755 1.755 0 0 0-1.645-1.628m-2.928 4.746c.532 0 .963-.448.963-1s-.431-1-.963-1c-.533 0-.964.448-.964 1s.431 1 .964 1" />
                    <path d="M20.918 17a.22.22 0 0 1 .221.278c-.2.712-.519 1.32-1.03 1.83c-.749.75-1.698 1.081-2.87 1.239c-1.14.153-2.595.153-4.433.153h-2.112c-1.838 0-3.294 0-4.433-.153c-1.172-.158-2.121-.49-2.87-1.238c-.748-.749-1.08-1.698-1.238-2.87C2 15.099 2 13.644 2 11.806v-.112C2 9.856 2 8.4 2.153 7.26c.158-1.172.49-2.121 1.238-2.87c.749-.748 1.698-1.08 2.87-1.238C7.401 3 8.856 3 10.694 3h2.112c1.838 0 3.294 0 4.433.153c1.172.158 2.121.49 2.87 1.238c.511.512.83 1.119 1.03 1.831a.22.22 0 0 1-.221.278h-2.524c-2.837 0-5.337 2.24-5.337 5.25s2.5 5.25 5.337 5.25zM5.75 7a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5z" />
                  </g>
                </svg>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-2xl font-bold text-white">QC Wallet</h3>
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">
                    BETA
                  </Badge>
                </div>
                <p className="text-gray-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                  The official wallet of Quantum Club. Secure, fast, and built for the future.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3 w-full">
            <Button
              onClick={createWallet}
              disabled={isLoading}
              className="w-full bg-white text-black hover:bg-gray-200 h-12 rounded-xl font-semibold text-base shadow-lg shadow-white/5"
            >
              {isLoading ? (
                <ButtonLoader />
              ) : (
                <>
                  <Icon icon="lucide:plus" className="w-4 h-4 mr-2"/>
                  Create new wallet
                </>
              )}
            </Button>

            <Button
              variant="outline"
              asChild
              className="w-full bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222] border-[#333] h-12 rounded-xl font-semibold text-base"
            >
              <Link href="/wallet/import">
                <Icon icon="lucide:download" className="w-4 h-4 mr-2"/>
                Import existing wallet
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchWalletAssets();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 space-y-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full"
        >
          <Card className="bg-gradient-to-br from-[#0c0c0c] to-black border-white/5 rounded-[32px] relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10" />

            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-black/40 rounded-full px-3 py-1.5 border border-white/5">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-gray-300">
                      {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyAddress}
                      className="ml-1 h-5 w-5 p-0 text-gray-500 hover:text-white hover:bg-transparent"
                    >
                      {copied ? (
                        <Icon icon="lucide:check" className="w-3 h-3 text-green-500"/>
                      ) : (
                        <Icon icon="lucide:copy" className="w-3 h-3"/>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="size-9 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white rounded-full disabled:opacity-50 transition-all active:scale-90"
                  >
                    <Icon icon="lucide:refresh-cw" className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}/>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => walletExit()}
                    className="size-9 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-full transition-all active:scale-90"
                  >
                    <Icon icon="lucide:log-out" className="w-4 h-4"/>
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Total Balance</span>
                  {isTestnet && (
                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-orange-500/20 text-[10px] py-0 px-1.5 h-5">
                      <Icon icon="lucide:flask-conical" className="w-3 h-3 mr-1"/>
                      TESTNET
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleHideBalance}
                    className="h-8 w-8 text-gray-500 hover:text-gray-300 hover:bg-transparent transition-colors"
                  >
                    {hideBalance ? (
                      <Icon icon="lucide:eye-off" className="w-3.5 h-3.5"/>
                    ) : (
                      <Icon icon="lucide:eye" className="w-3.5 h-3.5"/>
                    )}
                  </Button>
                </div>
                <div className="flex items-baseline gap-1">
                  {(isLoadingAssets || !hasFetched) ? (
                    <Skeleton className="h-10 w-32 bg-[#222]" />
                  ) : (
                    <h2 className="text-4xl font-bold text-white tracking-tight">
                      {hideBalance ? "••••••" : formatUsd(totalUsdBalance)}
                    </h2>
                  )}
                </div>
                {/* 24h Change */}
                {!isLoadingAssets && hasFetched && change24h !== null && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {(() => {
                      const isPositive = change24h >= 0;
                      return (
                        <>
                          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${isPositive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <span className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                              {hideBalance ? "••" : `${isPositive ? '+' : ''}${change24h.toFixed(2)}%`}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">24h</span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Action Grid */}
              <div className="grid grid-cols-4 gap-3 mt-8">
                {([
                  { icon: <Icon icon="lucide:send" className="w-5 h-5"/>, label: "Send", path: "/wallet/send" as const, disabled: false },
                  { icon: <Icon icon="lucide:arrow-down-left" className="w-5 h-5"/>, label: "Receive", path: "/wallet/receive" as const, disabled: false },
                  { icon: <Icon icon="lucide:history" className="w-5 h-5"/>, label: "History", path: "/wallet/history" as const, disabled: false },
                  { icon: <Icon icon="lucide:pie-chart" className="w-5 h-5"/>, label: "Portfolio", path: "/wallet/analytics" as const, disabled: false },
                ]).map((action, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    onClick={() => !action.disabled && router.push(action.path)}
                    disabled={action.disabled}
                    className={`h-auto flex flex-col items-center gap-2 p-0 bg-transparent hover:bg-transparent transition-none ${action.disabled
                      ? 'cursor-not-allowed opacity-50'
                      : 'group cursor-pointer'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-black/20 ${action.disabled
                      ? 'bg-[#222] text-gray-600'
                      : 'bg-[#222] text-gray-400 transition-all duration-200 group-hover:bg-[#333] group-hover:text-white group-hover:scale-105'
                      }`}>
                      {action.icon}
                    </div>
                    <span className={`text-xs font-medium ${action.disabled
                      ? 'text-gray-600'
                      : 'text-gray-500 transition-colors group-hover:text-gray-300'
                      }`}>
                      {action.label}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="w-full space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold text-white">QNTM Balance</h3>
          </div>
          <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/5 border-orange-500/20 rounded-2xl shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center border border-orange-500/30 shadow-lg shadow-orange-500/10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 32 32" className="text-white">
                      <path fill="currentColor" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">QNTM</h4>
                    <p className="text-xs text-gray-400">In-app currency</p>
                  </div>
                </div>
                <div className="text-right">
                  {!_hasHydrated ? (
                    <div className="space-y-1 flex flex-col items-end">
                      <Skeleton className="h-6 w-20 bg-[#222]" />
                      <Skeleton className="h-3 w-14 bg-[#222]" />
                    </div>
                  ) : (
                    <>
                      <h4 className="font-bold text-orange-400 text-xl">{hideBalance ? "••••••" : MainQuantAmount}</h4>
                      <p className="text-xs text-gray-500">QC Points</p>
                    </>
                  )}
                </div>
              </div>
              <Button
                asChild
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-bold transform-none hover:transform-none transition-opacity duration-200 hover:opacity-80 border-0 focus:ring-0 focus-visible:ring-0"
              >
                <Link href="/wallet/send-qntm">
                  <Icon icon="lucide:send" className="w-4 h-4 mr-2"/>
                  Send QNTM
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Carousel - Timed with dots navigation */}
        </div>
        <div className="flex flex-col gap-4 w-full">
          <style>{`
            @keyframes carouselProgress {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
          <Carousel 
            setApi={setCarouselApi} 
            className="w-full" 
            opts={{ loop: true }}
          >
            <CarouselContent className="ml-0">
              {/* Earn & Stake Card */}
              <CarouselItem className="pl-4 pr-4">
                <Link
                  href="/wallet/earn"
                  className="w-full h-32 p-5 rounded-2xl bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#222] flex items-center justify-between active:scale-[0.99] transition-all hover:border-primary/30 relative overflow-hidden"
                >
                  {/* Left side - Text and CTA */}
                  <div className="flex flex-col items-start justify-between h-full z-10">
                    <div className="text-left">
                      <h4 className="font-bold text-white text-lg leading-tight">Earn & Stake</h4>
                      <p className="text-sm text-gray-400">Up to {bestApy.toFixed(1)}% APY</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-primary font-medium">
                      <span>Start earning</span>
                      <Icon icon="lucide:chevron-right" className="w-4 h-4"/>
                    </div>
                  </div>
                  {/* Right side - Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon icon="lucide:trending-up" className="w-8 h-8 text-primary"/>
                  </div>
                  {/* Decorative blur */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                </Link>
              </CarouselItem>

              {/* NFT Marketplace Card */}
              <CarouselItem className="pl-4 pr-4">
                <Link
                  href="/wallet/marketplace"
                  className="w-full h-32 p-5 rounded-2xl bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#222] flex items-center justify-between active:scale-[0.99] transition-all hover:border-white/20 relative overflow-hidden"
                >
                  {/* Left side - Text and CTA */}
                  <div className="flex flex-col items-start justify-between h-full z-10">
                    <div className="text-left">
                      <h4 className="font-bold text-white text-lg leading-tight">NFT Marketplace</h4>
                      <p className="text-sm text-gray-400">Discover & collect unique NFTs</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-white/70 font-medium">
                      <span>Browse NFTs</span>
                      <Icon icon="lucide:chevron-right" className="w-4 h-4"/>
                    </div>
                  </div>
                  {/* Right side - Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                    <Icon icon="lucide:image" className="w-8 h-8 text-white/70"/>
                  </div>
                  {/* Decorative blur */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                </Link>
              </CarouselItem>

              {/* Lending Card */}
              <CarouselItem className="pl-4 pr-4">
                <Link
                  href="/wallet/lending"
                  className="w-full h-32 p-5 rounded-2xl bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#222] flex items-center justify-between active:scale-[0.99] transition-all hover:border-white/20 relative overflow-hidden"
                >
                  <div className="flex flex-col items-start justify-between h-full z-10">
                    <div className="text-left">
                      <h4 className="font-bold text-white text-lg leading-tight">Lending</h4>
                      <p className="text-sm text-gray-400">Supply & borrow on EVAA</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-white/70 font-medium">
                      <span>Earn Interest</span>
                      <Icon icon="lucide:chevron-right" className="w-4 h-4"/>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                    <Icon icon="lucide:landmark" className="w-8 h-8 text-white/70"/>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                </Link>
              </CarouselItem>
            </CarouselContent>
          </Carousel>

          {/* Dots Navigation with Progress */}
          <div className="flex justify-center gap-1.5 mb-4">
            {Array.from({ length: carouselCount }).map((_, index) => (
              <button
                key={index}
                onClick={() => carouselApi?.scrollTo(index)}
                className={`h-1.5 rounded-full transition-all duration-300 overflow-hidden relative cursor-pointer ${
                  index === carouselCurrent ? "w-8 bg-[#333]" : "w-1.5 bg-[#333] hover:bg-[#444]"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              >
                {index === carouselCurrent && (
                  <div
                    className="absolute top-0 left-0 h-full bg-white"
                    style={{
                      animation: 'carouselProgress 7s linear forwards'
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 pt-4 space-y-6">

        {isTestnet ? (
          <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-3">
            <Icon icon="lucide:flask-conical" className="w-4 h-4 text-blue-400 mt-0.5 shrink-0"/>
            <p className="text-xs text-blue-400/90 leading-relaxed">
              You&apos;re on TON Testnet. Assets here have no real value. Switch to mainnet in settings for real transactions.
            </p>
          </div>
        ) : null}


        <Tabs value={walletTab} onValueChange={(v) => setWalletTab(v as typeof walletTab)} className="w-full pb-24">
          <TabsList className="w-full h-12">
            <TabsTrigger
              value="assets"
              className="flex-1 h-full text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-lg text-gray-400"
            >
              Assets
            </TabsTrigger>
            <TabsTrigger
              value="nfts"
              className="flex-1 h-full text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-lg text-gray-400 gap-2 group"
            >
              NFTs
              {nfts.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400 group-data-[state=active]:bg-black group-data-[state=active]:text-white transition-colors">
                  {nfts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="mt-4 space-y-3">
            {/* TON Network Section Header */}
            <div className="flex items-center gap-2 px-1">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] font-bold px-2 py-0.5">
                TON
              </Badge>

            </div>

            {/* TON Card */}
            <Card
              className="bg-[#111] border-[#222] rounded-2xl shadow-none hover:bg-[#161616] transition-colors cursor-pointer active:scale-[0.99]"
              onClick={() => {
                setSelectedAsset({
                  name: "Toncoin",
                  symbol: "TON",
                  balance: tonBalance,
                  value: parseFloat(tonUsdValue) || 0,
                  priceUsd: tonPrice,
                  image: TON_ICON,
                  color: CHART_COLORS[0],
                }); setChartPeriod('1D');
              }}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="text-white">
                      <path fill="currentColor" d="m20.661 7.22l-7.846 12.494a1.06 1.06 0 0 1-1.794-.006L3.328 7.214A2.2 2.2 0 0 1 3 6.05a2.29 2.29 0 0 1 2.324-2.255h13.362C19.963 3.794 21 4.8 21 6.044c0 .413-.116.82-.339 1.175M5.218 6.8l5.723 8.826V5.912H5.816c-.592 0-.857.392-.598.89m7.84 8.826L18.783 6.8c.265-.497-.006-.89-.599-.89H13.06z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-white">TON</h4>
                    <p className="text-xs text-gray-500">Toncoin</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    {(isLoadingAssets || !hasFetched) ? (
                      <div className="space-y-1 flex flex-col items-end">
                        <Skeleton className="h-5 w-24 bg-[#222]" />
                        <Skeleton className="h-3 w-16 bg-[#222]" />
                      </div>
                    ) : (
                      <>
                        <h4 className="font-bold text-white">{hideBalance ? "••••" : formatAmount(tonBalance)}</h4>
                        <p className="text-xs text-gray-500">{hideBalance ? "••••" : formatUsd(tonUsdValue)}</p>
                      </>
                    )}
                  </div>
                  <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-500"/>
                </div>
              </CardContent>
            </Card>

            {/* Jetton loading skeleton */}
            {(isLoadingAssets || !hasFetched) && jettons.length === 0 && (
              <>
                {[1, 2].map((i) => (
                  <Card key={i} className="bg-[#111] border-[#222] rounded-2xl shadow-none">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full bg-[#222]" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-14 bg-[#222]" />
                          <Skeleton className="h-3 w-20 bg-[#222]" />
                        </div>
                      </div>
                      <div className="space-y-1.5 flex flex-col items-end">
                        <Skeleton className="h-4 w-16 bg-[#222]" />
                        <Skeleton className="h-3 w-10 bg-[#222]" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            {/* No tokens message */}
            {!isLoadingAssets && hasFetched && jettons.length === 0 && (
              <div className="py-4 text-center bg-[#111] rounded-xl border border-[#222] border-dashed">
                <p className="text-xs text-gray-500">Tokens will appear here automatically.</p>
              </div>
            )}

            {/* TON Jettons (virtualized) */}
            {jettons.length > 0 && (
              <div ref={jettonsContainerRef} className="relative w-full" style={{ height: `${jettonsVirtualizer.getTotalSize()}px` }}>
                {jettonsVirtualizer.getVirtualItems().map((virtualItem) => {
                  const index = virtualItem.index;
                  const jetton = jettons[index];
                  const formattedBalance = (parseFloat(jetton.balance) / Math.pow(10, jetton.decimals)).toFixed(4);
                  const usdDisplay = jetton.usdValue && jetton.usdValue > 0 ? `$${jetton.usdValue.toFixed(2)}` : "~";
                  return (
                    <div
                      key={index}
                      className="absolute top-0 left-0 w-full"
                      style={{ transform: `translateY(${virtualItem.start - (jettonsVirtualizer.options.scrollMargin ?? 0)}px)` }}
                      ref={jettonsVirtualizer.measureElement}
                      data-index={virtualItem.index}
                    >
                      <Card
                        className="bg-[#111] border-[#222] rounded-2xl shadow-none hover:bg-[#161616] transition-colors cursor-pointer active:scale-[0.99]"
                        onClick={() => {
                          setSelectedAsset({
                            name: jetton.name,
                            symbol: jetton.symbol,
                            balance: formattedBalance,
                            value: jetton.usdValue || 0,
                            priceUsd: jetton.priceUsd || 0,
                            image: jetton.image,
                            color: CHART_COLORS[(index + 1) % CHART_COLORS.length],
                            jettonAddress: jetton.jettonAddress,
                          }); setChartPeriod('1D');
                        }}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#222] rounded-full flex items-center justify-center overflow-hidden border border-[#333]">
                              {jetton.image ? (
                                <Image src={jetton.image} alt={jetton.symbol} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                              ) : (
                                <span className="text-white text-xs font-bold">{jetton.symbol.slice(0, 2)}</span>
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-white">{jetton.symbol}</h4>
                              <p className="text-xs text-gray-500 truncate max-w-[120px]">{jetton.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right min-w-[80px]">
                              <h4 className="font-bold text-white">{hideBalance ? "••••" : formatAmount(parseFloat(formattedBalance))}</h4>
                              <p className="text-xs text-gray-500">{hideBalance ? "••••" : usdDisplay}</p>
                            </div>
                            <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-500"/>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Multi-Chain Section Header - Only show in mainnet when addresses exist */}
            {!isTestnet && (ethAddress || btcAddress || solAddress || trxAddress) && (
              <div className="flex items-center justify-between px-1 pt-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30 text-[10px] font-bold px-2 py-0.5">
                    MULTI-CHAIN
                  </Badge>
                </div>
              </div>
            )}

            {/* BTC Balance Card - Only show in mainnet */}
            {!isTestnet && btcAddress && (
              <Card
                className="bg-[#111] border-[#222] rounded-2xl shadow-none hover:bg-[#161616] transition-colors cursor-pointer active:scale-[0.99]"
                onClick={() => {
                  setSelectedAsset({
                    name: "Bitcoin",
                    symbol: "BTC",
                    balance: btcBalance.toFixed(8),
                    value: btcUsdValue,
                    priceUsd: btcPrice,
                    image: BTC_ICON,
                    color: "#F7931A",
                  }); setChartPeriod('1D');
                }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shadow-lg shadow-[#F7931A]/20">
                      <Image src={BTC_ICON} alt="BTC" width={40} height={40} className="w-full h-full" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">BTC</h4>
                      <p className="text-xs text-gray-500">Bitcoin</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {isLoadingMultiChain ? (
                        <div className="space-y-1 flex flex-col items-end">
                          <Skeleton className="h-5 w-24 bg-[#222]" />
                          <Skeleton className="h-3 w-16 bg-[#222]" />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-white">{hideBalance ? "••••" : formatAmount(btcBalance, 2)}</h4>
                          <p className="text-xs text-gray-500">{hideBalance ? "••••" : formatUsd(btcUsdValue)}</p>
                        </>
                      )}
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-500"/>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ETH Balance Card - Only show in mainnet */}
            {!isTestnet && ethAddress && (
              <Card
                className="bg-[#111] border-[#222] rounded-2xl shadow-none hover:bg-[#161616] transition-colors cursor-pointer active:scale-[0.99]"
                onClick={() => {
                  setSelectedAsset({
                    name: "Ethereum",
                    symbol: "ETH",
                    balance: ethBalance.toFixed(6),
                    value: ethUsdValue,
                    priceUsd: ethPrice,
                    image: ETH_ICON,
                    color: "#627EEA",
                  }); setChartPeriod('1D');
                }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shadow-lg shadow-[#627EEA]/20">
                      <Image src={ETH_ICON} alt="ETH" width={40} height={40} className="w-full h-full" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">ETH</h4>
                      <p className="text-xs text-gray-500">Ethereum</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {isLoadingMultiChain ? (
                        <div className="space-y-1 flex flex-col items-end">
                          <Skeleton className="h-5 w-24 bg-[#222]" />
                          <Skeleton className="h-3 w-16 bg-[#222]" />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-white">{hideBalance ? "••••" : formatAmount(ethBalance)}</h4>
                          <p className="text-xs text-gray-500">{hideBalance ? "••••" : formatUsd(ethUsdValue)}</p>
                        </>
                      )}
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-500"/>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SOL Balance Card - Only show in mainnet */}
            {!isTestnet && solAddress && (
              <Card
                className="bg-[#111] border-[#222] rounded-2xl shadow-none hover:bg-[#161616] transition-colors cursor-pointer active:scale-[0.99]"
                onClick={() => {
                  setSelectedAsset({
                    name: "Solana",
                    symbol: "SOL",
                    balance: solBalance.toFixed(4),
                    value: solUsdValue,
                    priceUsd: solPrice,
                    image: SOL_ICON,
                    color: "#9945FF",
                  }); setChartPeriod('1D');
                }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shadow-lg shadow-[#9945FF]/20">
                      <Image src={SOL_ICON} alt="SOL" width={40} height={40} className="w-full h-full" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">SOL</h4>
                      <p className="text-xs text-gray-500">Solana</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {isLoadingMultiChain ? (
                        <div className="space-y-1 flex flex-col items-end">
                          <Skeleton className="h-5 w-24 bg-[#222]" />
                          <Skeleton className="h-3 w-16 bg-[#222]" />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-white">{hideBalance ? "••••" : formatAmount(solBalance)}</h4>
                          <p className="text-xs text-gray-500">{hideBalance ? "••••" : formatUsd(solUsdValue)}</p>
                        </>
                      )}
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-500"/>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TRX Balance Card - Only show in mainnet */}
            {!isTestnet && trxAddress && (
              <Card
                className="bg-[#111] border-[#222] rounded-2xl shadow-none hover:bg-[#161616] transition-colors cursor-pointer active:scale-[0.99]"
                onClick={() => {
                  setSelectedAsset({
                    name: "TRON",
                    symbol: "TRX",
                    balance: trxBalance.toFixed(2),
                    value: trxUsdValue,
                    priceUsd: trxPrice,
                    image: TRX_ICON,
                    color: "#FF0013",
                  }); setChartPeriod('1D');
                }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shadow-lg shadow-[#FF0013]/20">
                      <Image src={TRX_ICON} alt="TRX" width={40} height={40} className="w-full h-full" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">TRX</h4>
                      <p className="text-xs text-gray-500">TRON</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {isLoadingMultiChain ? (
                        <div className="space-y-1 flex flex-col items-end">
                          <Skeleton className="h-5 w-24 bg-[#222]" />
                          <Skeleton className="h-3 w-16 bg-[#222]" />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-white">{hideBalance ? "••••" : formatAmount(trxBalance)}</h4>
                          <p className="text-xs text-gray-500">{hideBalance ? "••••" : formatUsd(trxUsdValue)}</p>
                        </>
                      )}
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-4 h-4 text-gray-500"/>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="nfts" className="mt-4 space-y-3">
            {/* Filter Chips */}
            {nfts.length > 0 && (
              <NftFilterChips nfts={nfts} />
            )}

            {isLoadingNfts && nfts.length === 0 && (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="bg-[#111] border-[#222] rounded-2xl shadow-none overflow-hidden">
                    <Skeleton className="w-full aspect-square bg-[#222]" />
                    <CardContent className="p-3 space-y-1.5">
                      <Skeleton className="h-4 w-20 bg-[#222]" />
                      <Skeleton className="h-3 w-24 bg-[#222]" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoadingNfts && nfts.length === 0 && (
              <div className="py-8 text-center bg-[#111] rounded-2xl border border-[#222] border-dashed">
                <Icon icon="lucide:image" className="w-8 h-8 text-gray-600 mx-auto mb-2"/>
                <p className="text-sm text-gray-500">No NFTs found</p>
                <p className="text-xs text-gray-600 mt-1">Your collectibles will appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div >

      {/* Asset Detail Modal */}
      <AnimatePresence>
        {
          selectedAsset && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center"
              onClick={() => setSelectedAsset(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-[#111] border-t border-[#333] rounded-t-3xl w-full max-w-md p-6 pb-24"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border border-white/10"
                      style={{ backgroundColor: selectedAsset.symbol === 'TON' ? '#3B82F6' : (selectedAsset.image ? 'transparent' : selectedAsset.color) }}
                    >
                      {selectedAsset.symbol === 'TON' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" className="text-white">
                          <path fill="currentColor" d="m20.661 7.22l-7.846 12.494a1.06 1.06 0 0 1-1.794-.006L3.328 7.214A2.2 2.2 0 0 1 3 6.05a2.29 2.29 0 0 1 2.324-2.255h13.362C19.963 3.794 21 4.8 21 6.044c0 .413-.116.82-.339 1.175M5.218 6.8l5.723 8.826V5.912H5.816c-.592 0-.857.392-.598.89m7.84 8.826L18.783 6.8c.265-.497-.006-.89-.599-.89H13.06z" />
                        </svg>
                      ) : selectedAsset.image && !selectedAsset.image.includes('ton.org') ? (
                        <Image
                          src={selectedAsset.image}
                          alt={selectedAsset.symbol}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-white text-lg font-bold">{selectedAsset.symbol.slice(0, 2)}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedAsset.symbol}</h3>
                      <p className="text-sm text-gray-400">{selectedAsset.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedAsset(null)}
                    className="w-8 h-8 bg-[#222] rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#333] transition-colors"
                  >
                    <Icon icon="lucide:x" className="w-4 h-4"/>
                  </Button>
                </div>

                {/* Current Price */}
                <div className="mb-6">
                  <p className="text-gray-400 text-sm mb-1">Current Price</p>
                  <h2 className="text-3xl font-bold text-white">
                    <AnimatedPrice 
                      value={selectedAsset.priceUsd || 0} 
                      decimals={2}
                      showDirection={true}
                      className=""
                    />
                  </h2>
                </div>

                {/* Price Chart */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-gray-400 text-sm">Price Chart</p>
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                      {(['1H', '1D', '1W', '1M', '6M', '1Y'] as ChartPeriod[]).map((period) => (
                        <Button
                          key={period}
                          size="sm"
                          variant="ghost"
                          onClick={() => setChartPeriod(period)}
                          className={`px-2.5 py-1 h-auto rounded-lg text-[10px] font-medium transition-colors ${chartPeriod === period
                            ? 'bg-white text-black hover:bg-white/90 shadow-sm'
                            : 'bg-[#1a1a1a] text-gray-500 hover:text-gray-300 hover:bg-[#252525]'
                            }`}
                        >
                          {period}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="h-52 bg-[#0a0a0a] rounded-xl p-2">
                    {isLoadingPrice ? (
                      <div className="h-full flex items-center justify-center">
                        <Skeleton className="w-full h-full bg-[#222]" />
                      </div>
                    ) : priceHistory.length > 0 ? (
                      <WalletPriceChart
                        data={priceHistory}
                        color={selectedAsset.color}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                        No price data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Holdings Info */}
                <div className="bg-[#0a0a0a] rounded-xl p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400 text-sm">Your Holdings</span>
                    <span className="text-white font-bold">
                      {hideBalance ? "••••" : `${selectedAsset.balance} ${selectedAsset.symbol}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Value</span>
                    <span className="text-white font-bold">
                      {hideBalance ? "••••" : `$${selectedAsset.value.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )
        }
      </AnimatePresence >
    </div >
  );
}