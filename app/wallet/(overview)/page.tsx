"use client";

import { useState, useEffect, useRef } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mnemonicNew, mnemonicToWalletKey } from "@ton/crypto";
import { WalletContractV5R1 } from "@ton/ton";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useWallet } from "../WalletContext";
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

const WalletWelcomeCinematic = dynamic(
  () => import("./WalletWelcomeCinematic"),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full bg-secondary" /> }
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
type AssetChainTab = "ton" | "multichain";

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
const WALLET_SYMBOLS = [
  "solar:wallet-bold",
  "solar:star-bold",
  "solar:shield-keyhole-bold",
  "solar:bolt-bold",
  "solar:crown-bold",
  "solar:planet-bold",
];

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
  const nftGridRef = useRef<HTMLDivElement>(null);

  const filteredNfts = nfts.filter((nft) => {
    if (filter === "all") return true;
    const category = categorizeNft(nft);
    if (filter === "gifts") return category === "gift" || category === "sticker";
    if (filter === "collections") return category === "regular";
    return true;
  });

  const rowCount = Math.ceil(filteredNfts.length / 2);

  const nftVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => 220,
    overscan: 3,
    scrollMargin: nftGridRef.current?.offsetTop ?? 0,
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
                : "bg-secondary border-0 text-neutral-400 hover:bg-secondary/80"
            }`}
          >
            <Icon icon={f.icon} className="w-3.5 h-3.5" />
            {f.label}
          </button>
        ))}
      </div>

      {filteredNfts.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-sm text-neutral-500">No {filter === "gifts" ? "gift" : "collection"} NFTs found</p>
        </div>
      )}

      {filteredNfts.length > 0 && (
        <div ref={nftGridRef}>
          <div className="relative" style={{ height: `${nftVirtualizer.getTotalSize()}px` }}>
            {nftVirtualizer.getVirtualItems().map((virtualRow) => {
              const leftIndex = virtualRow.index * 2;
              const rightIndex = leftIndex + 1;
              const leftNft = filteredNfts[leftIndex];
              const rightNft = rightIndex < filteredNfts.length ? filteredNfts[rightIndex] : null;
              const leftCategory = categorizeNft(leftNft);
              const rightCategory = rightNft ? categorizeNft(rightNft) : null;

              return (
                <div
                  key={virtualRow.key}
                  ref={nftVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start - nftVirtualizer.options.scrollMargin}px)` }}
                >
                  <div className="grid grid-cols-2 gap-3 pb-3">
                    {/* Left NFT card */}
                    <Link href={`/wallet/nft/${encodeURIComponent(leftNft.address)}`}>
                      <Card className="bg-secondary border-0 rounded-2xl shadow-none overflow-hidden hover:bg-secondary/80 transition-colors cursor-pointer">
                        <div className="w-full aspect-square bg-secondary relative overflow-hidden" style={{ viewTransitionName: `nft-img-${leftNft.address.slice(-8)}` }}>
                          {leftNft.image ? (
                            <Image
                              src={leftNft.image}
                              alt={leftNft.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon icon="lucide:image" className="w-8 h-8 text-neutral-600"/>
                            </div>
                          )}
                          {leftCategory === "gift" && (
                            <Badge className="absolute top-2 left-2 bg-purple-600 text-[10px] px-1.5 py-0">
                              <Icon icon="solar:gift-bold" className="w-3 h-3 mr-0.5" />
                              Gift
                            </Badge>
                          )}
                          {leftCategory === "sticker" && (
                            <Badge className="absolute top-2 left-2 bg-neutral-700 text-[10px] px-1.5 py-0">
                              Sticker
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <h4 className="font-bold text-white text-sm truncate">{leftNft.name}</h4>
                          {leftNft.collectionName && (
                            <p className="text-xs text-neutral-500 truncate">{leftNft.collectionName}</p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>

                    {/* Right NFT card */}
                    {rightNft && (
                      <Link href={`/wallet/nft/${encodeURIComponent(rightNft.address)}`}>
                        <Card className="bg-secondary border-0 rounded-2xl shadow-none overflow-hidden hover:bg-secondary/80 transition-colors cursor-pointer">
                          <div className="w-full aspect-square bg-secondary relative overflow-hidden" style={{ viewTransitionName: `nft-img-${rightNft.address.slice(-8)}` }}>
                            {rightNft.image ? (
                              <Image
                                src={rightNft.image}
                                alt={rightNft.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Icon icon="lucide:image" className="w-8 h-8 text-neutral-600"/>
                              </div>
                            )}
                            {rightCategory === "gift" && (
                              <Badge className="absolute top-2 left-2 bg-purple-600 text-[10px] px-1.5 py-0">
                                <Icon icon="solar:gift-bold" className="w-3 h-3 mr-0.5" />
                                Gift
                              </Badge>
                            )}
                            {rightCategory === "sticker" && (
                              <Badge className="absolute top-2 left-2 bg-neutral-700 text-[10px] px-1.5 py-0">
                                Sticker
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-3">
                            <h4 className="font-bold text-white text-sm truncate">{rightNft.name}</h4>
                            {rightNft.collectionName && (
                              <p className="text-xs text-neutral-500 truncate">{rightNft.collectionName}</p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

export default function WalletPage() {
  const router = useRouter();
  const { MainQuantAmount, _hasHydrated, telegramId, username } = useUserContext();
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
    fetchNfts,
    toggleHideBalance,
    tonPrice,
    storedWallets,
    switchWallet,
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
    isLoadingMultiChain,
    change24h,
  } = useWallet();

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
  const [tgFirstName, setTgFirstName] = useState("Quantum User");
  const [walletSymbol, setWalletSymbol] = useState(WALLET_SYMBOLS[0]);
  const [assetChainTab, setAssetChainTab] = useState<AssetChainTab>("ton");
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

  useEffect(() => {
    const firstName = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || username || "Quantum User";
    queueMicrotask(() => setTgFirstName(firstName));
  }, [username]);

  useEffect(() => {
    if (!telegramId) return;
    const storedSymbol = localStorage.getItem(`quantum_wallet_symbol_${telegramId}`);
    if (storedSymbol && WALLET_SYMBOLS.includes(storedSymbol)) {
      queueMicrotask(() => setWalletSymbol(storedSymbol));
    }
  }, [telegramId]);

  // Features Carousel - track current slide
  useEffect(() => {
    if (!carouselApi) return;

    requestAnimationFrame(() => {
      setCarouselCount(carouselApi.scrollSnapList().length);
      setCarouselCurrent(carouselApi.selectedScrollSnap());
    });

    const handleSelect = () => {
      setCarouselCurrent(carouselApi.selectedScrollSnap());
    };

    carouselApi.on("select", handleSelect);

    return () => {
      carouselApi.off("select", handleSelect);
    };
  }, [carouselApi]);

  // Features Carousel - auto-play timer (7 seconds like home page)
  useEffect(() => {
    if (!carouselApi) return;

    const timer = setInterval(() => {
      carouselApi.scrollNext();
    }, 7000);

    return () => clearInterval(timer);
  }, [carouselApi]);

  // URL-synced wallet tab (shareable)
  const [walletTab, setWalletTab] = useQueryState("tab", parseAsStringLiteral(["assets", "nfts"] as const).withDefault("assets").withOptions({ history: "replace" }));

  // Asset detail modal state
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'1H' | '1D' | '1W' | '1M' | '6M' | '1Y'>('1D');
  const queryClient = useQueryClient();
  const tonAssetCount = 1 + jettons.length;
  const multiChainAssetCount = [btcAddress, ethAddress, solAddress, trxAddress].filter(Boolean).length;
  const btcAssetIndex = btcAddress ? 0 : -1;
  const ethAssetIndex = ethAddress ? [btcAddress].filter(Boolean).length : -1;
  const solAssetIndex = solAddress ? [btcAddress, ethAddress].filter(Boolean).length : -1;
  const trxAssetIndex = trxAddress ? [btcAddress, ethAddress, solAddress].filter(Boolean).length : -1;

  // Virtualized jettons list
  const jettonsContainerRef = useRef<HTMLDivElement>(null);
  const jettonsVirtualizer = useWindowVirtualizer({
    count: jettons.length,
    estimateSize: () => 84,
    gap: 12,
    overscan: 5,
    scrollMargin: jettonsContainerRef.current?.offsetTop ?? 0,
  });

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
      queueMicrotask(() => {
        setSelectedAsset(prev => prev ? { ...prev, priceUsd: livePrice } : null);
      });

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
  }, [livePrice, selectedAsset?.symbol, chartPeriod, priceHistory.length]);

  useEffect(() => {
    const storedWallet = localStorage.getItem(`quantum_wallet_address_${telegramId}`);

    if (storedWallet) {
      queueMicrotask(() => {
        setContextWalletAddress(storedWallet);
        setHasWallet(true);
      });
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

  if (isChecking) {
    return (
      <div className="min-h-screen">
        <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 space-y-6">
          <Card className="w-full bg-gradient-to-br from-[#0c0c0c] to-black border-0 rounded-[32px] overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-32 rounded-full" />
                <div className="flex gap-1.5">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="size-9 rounded-full" />
                </div>
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-36" />
                <Skeleton className="h-4 w-16 mt-1" />
              </div>
              <div className="flex gap-3 pt-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                    <Skeleton className="size-12 rounded-full" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="w-full space-y-3">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-secondary border-0">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-3 w-12 ml-auto" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!hasWallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 w-full overflow-hidden">
        <WalletOnboardingReveal
          tgFirstName={tgFirstName}
          isLoading={isLoading}
          createWallet={createWallet}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex w-full flex-col items-center space-y-8">
        <div
          className="w-[90%]"
        >
          <div className="relative overflow-hidden">
            <div className="relative z-10 space-y-8 py-7">
              <div className="flex w-full items-center justify-center">
                <div className="inline-flex h-9 min-w-0 items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-9 max-w-52 rounded-full border-0 bg-transparent px-0 text-sm font-semibold text-neutral-200 hover:bg-transparent hover:text-white"
                      >
                        <Icon icon={walletSymbol} className="mr-1 h-5 w-5 text-neutral-300" />
                        <span className="truncate">
                          {storedWallets.find((wallet) => wallet.address === walletAddress)?.name ?? "Wallet"}
                        </span>
                        <Icon icon="lucide:chevron-down" className="ml-2 h-4 w-4 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-60 rounded-2xl border-0 bg-popover p-2 text-white shadow-2xl">
                      <DropdownMenuLabel className="px-2 pb-2 pt-1 text-[11px] font-semibold text-neutral-500">
                        Wallet symbol
                      </DropdownMenuLabel>
                      <div className="grid grid-cols-6 gap-1 px-1 pb-2">
                        {WALLET_SYMBOLS.map((symbol) => (
                          <button
                            key={symbol}
                            type="button"
                            onClick={() => {
                              setWalletSymbol(symbol);
                              if (telegramId) {
                                localStorage.setItem(`quantum_wallet_symbol_${telegramId}`, symbol);
                              }
                            }}
                            className={`flex size-8 items-center justify-center rounded-lg text-sm transition-colors ${
                              walletSymbol === symbol
                                ? "bg-secondary text-white"
                                : "text-neutral-500 hover:bg-secondary hover:text-neutral-200"
                            }`}
                            aria-label="Use wallet symbol"
                          >
                            <Icon icon={symbol} className="h-4 w-4" />
                          </button>
                        ))}
                      </div>
                      <DropdownMenuSeparator className="bg-secondary" />
                      {(storedWallets.length > 0
                        ? storedWallets
                        : [{ address: walletAddress, name: "Wallet", isActive: true }]
                      ).map((wallet) => (
                        <DropdownMenuItem
                          key={wallet.address}
                          onClick={() => switchWallet(wallet.address)}
                          className="flex items-center justify-between gap-3 rounded-xl text-neutral-300 focus:bg-secondary focus:text-white"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{wallet.name}</div>
                            <div className="text-xs text-neutral-500">
                              {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                            </div>
                          </div>
                          {wallet.address === walletAddress ? (
                            <Icon icon="lucide:check" className="w-4 h-4 text-white shrink-0" />
                          ) : null}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator className="bg-secondary" />
                      <DropdownMenuItem
                        onClick={() => {
                          if (!walletAddress) return;
                          navigator.clipboard.writeText(walletAddress);
                          toast.success("Address copied");
                        }}
                        className="flex items-center gap-2 rounded-xl text-neutral-200 focus:bg-secondary focus:text-white"
                      >
                        <Icon icon="lucide:copy" className="h-4 w-4" />
                        Copy address
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-xl text-neutral-200 focus:bg-secondary focus:text-white">
                        <Link href="/wallet/import" className="flex items-center gap-2">
                          <Icon icon="lucide:plus" className="h-4 w-4" />
                          Add wallet
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="space-y-2 text-center">
                <button
                  type="button"
                  onClick={toggleHideBalance}
                  className="mx-auto block text-center active:scale-[0.99] transition-transform"
                  aria-label="Toggle wallet balance visibility"
                >
                  {(isLoadingAssets || !hasFetched) ? (
                    <Skeleton className="h-10 w-32 bg-secondary" />
                  ) : (
                    <h2 className="text-5xl font-bold text-white tracking-tight">
                      {hideBalance ? "••••••" : formatUsd(totalUsdBalance)}
                    </h2>
                  )}
                </button>
                {!isLoadingAssets && hasFetched && change24h !== null && (
                  <p className={change24h >= 0 ? "text-xs text-green-500" : "text-xs text-red-500"}>
                    {hideBalance ? "$••" : formatUsd((parseFloat(totalUsdBalance) || 0) * (change24h / 100))}{" "}
                    <span>
                      {hideBalance ? "••" : `(${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%)`}
                    </span>{" "}
                    <span className="text-neutral-500">1D</span>
                  </p>
                )}
              </div>

              {/* Action Grid */}
              <div className="grid grid-cols-4 gap-3">
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
                    className={`h-auto w-full flex flex-col items-center gap-2 p-0 bg-transparent hover:bg-transparent transition-none ${action.disabled
                      ? 'cursor-not-allowed opacity-50'
                      : 'group cursor-pointer'
                      }`}
                  >
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-secondary ${action.disabled
                      ? 'text-neutral-600'
                      : 'text-white transition-all duration-200 group-hover:scale-105'
                      }`}>
                      {action.icon}
                    </div>
                    <span className={`text-xs font-medium ${action.disabled
                      ? 'text-neutral-600'
                      : 'text-white transition-colors'
                      }`}>
                      {action.label}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full space-y-3 order-2">
          <Card className="mx-auto w-[90%] rounded-2xl border-0 bg-secondary shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 32 32" className="text-white">
                      <path fill="currentColor" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">QNTM</h4>
                    <p className="text-xs text-neutral-400">The native token of QC</p>
                  </div>
                </div>
                <div className="text-right">
                  {!_hasHydrated ? (
                    <div className="space-y-1 flex flex-col items-end">
                      <Skeleton className="h-6 w-20 bg-secondary" />
                      <Skeleton className="h-3 w-14 bg-secondary" />
                    </div>
                  ) : (
                    <>
                      <h4 className="font-bold text-orange-400 text-xl">{hideBalance ? "••••••" : MainQuantAmount}</h4>
                    </>
                  )}
                </div>
              </div>
              <Button
                asChild
                className="w-full font-bold"
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
        <div className="flex flex-col gap-4 w-full order-1 overflow-hidden">
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
              {/* Earn and stake slide */}
              <CarouselItem className="pl-0">
                <Link
                  href="/wallet/earn"
                  className="mx-auto flex h-32 w-[90%] items-center justify-between rounded-2xl border-0 bg-secondary p-5 transition-all active:scale-[0.99]"
                >
                  <div className="flex flex-col items-start justify-between h-full z-10">
                    <div className="text-left">
                      <h4 className="font-bold text-white text-lg leading-tight">Earn and stake</h4>
                      <p className="text-sm text-neutral-400">Up to {bestApy.toFixed(1)}% APY</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-primary font-medium">
                      <span>Start earning</span>
                      <Icon icon="lucide:chevron-right" className="w-4 h-4"/>
                    </div>
                  </div>
                  <Icon icon="lucide:trending-up" className="w-8 h-8 shrink-0 text-primary"/>
                </Link>
              </CarouselItem>

              {/* NFT marketplace slide */}
              <CarouselItem className="pl-0">
                <Link
                  href="/wallet/marketplace"
                  className="mx-auto flex h-32 w-[90%] items-center justify-between rounded-2xl border-0 bg-secondary p-5 transition-all active:scale-[0.99]"
                >
                  <div className="flex flex-col items-start justify-between h-full z-10">
                    <div className="text-left">
                      <h4 className="font-bold text-white text-lg leading-tight">NFT marketplace</h4>
                      <p className="text-sm text-neutral-400">Discover and collect unique NFTs</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-white/70 font-medium">
                      <span>Browse NFTs</span>
                      <Icon icon="lucide:chevron-right" className="w-4 h-4"/>
                    </div>
                  </div>
                  <Icon icon="lucide:image" className="w-8 h-8 shrink-0 text-white/70"/>
                </Link>
              </CarouselItem>

              {/* Lending Card */}
              <CarouselItem className="pl-0">
                <Link
                  href="/wallet/lending"
                  className="mx-auto flex h-32 w-[90%] items-center justify-between rounded-2xl border-0 bg-secondary p-5 transition-all active:scale-[0.99]"
                >
                  <div className="flex flex-col items-start justify-between h-full z-10">
                    <div className="text-left">
                      <h4 className="font-bold text-white text-lg leading-tight">Lending</h4>
                      <p className="text-sm text-neutral-400">Supply and borrow on EVAA</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-white/70 font-medium">
                      <span>Earn interest</span>
                      <Icon icon="lucide:chevron-right" className="w-4 h-4"/>
                    </div>
                  </div>
                  <Icon icon="lucide:landmark" className="w-8 h-8 shrink-0 text-white/70"/>
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
                  index === carouselCurrent ? "w-8 bg-secondary" : "w-1.5 bg-secondary hover:bg-secondary/80"
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
        <div className="order-3 flex w-[90%] flex-col items-center space-y-6 pt-4">

        {isTestnet ? (
          <div className="w-full bg-secondary border-0 rounded-xl p-3 flex items-start gap-3">
            <Icon icon="lucide:flask-conical" className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0"/>
            <div className="text-xs text-neutral-400 leading-relaxed space-y-1">
              <p>You&apos;re on TON Testnet. Assets here have no real value.</p>
              <p>Need testnet TON? Get 2 TON/hour from <a href="https://t.me/testgiver_ton_bot" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-neutral-200 hover:text-white">@testgiver_ton_bot</a>.</p>
            </div>
          </div>
        ) : null}


        <Tabs value={walletTab} onValueChange={(v) => setWalletTab(v as typeof walletTab)} className="w-full pb-24">
          <TabsList className="w-full h-12 border-0 bg-secondary">
            <TabsTrigger
              value="assets"
              className="flex-1 h-full text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-lg text-neutral-400"
            >
              Assets
            </TabsTrigger>
            <TabsTrigger
              value="nfts"
              className="flex-1 h-full text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-lg text-neutral-400 gap-2 group"
            >
              NFTs
              {nfts.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-semibold text-black group-data-[state=active]:bg-neutral-500 group-data-[state=active]:text-white transition-colors">
                  {nfts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="mt-4 flex w-full flex-col gap-2 text-sm">
            <div className="mb-2 flex items-center gap-2">
              {([
                { value: "ton", label: "TON" },
                { value: "multichain", label: "Multi chain" },
              ] as const).map((chain) => (
                <button
                  key={chain.value}
                  type="button"
                  onClick={() => setAssetChainTab(chain.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    assetChainTab === chain.value
                      ? "bg-white text-black"
                      : "bg-secondary text-neutral-400 hover:text-white"
                  }`}
                >
                  {chain.label}
                </button>
              ))}
            </div>
            {assetChainTab === "ton" ? (
              <div className="rounded-2xl bg-secondary p-1">
            {/* TON Card */}
            <Card
              className="w-full bg-transparent border-0 rounded-none shadow-none hover:bg-secondary/60 transition-colors cursor-pointer active:scale-[0.99]"
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
                  <div className="w-10 h-10 bg-[#0098ea] rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="text-white">
                      <path fill="currentColor" d="m20.661 7.22l-7.846 12.494a1.06 1.06 0 0 1-1.794-.006L3.328 7.214A2.2 2.2 0 0 1 3 6.05a2.29 2.29 0 0 1 2.324-2.255h13.362C19.963 3.794 21 4.8 21 6.044c0 .413-.116.82-.339 1.175M5.218 6.8l5.723 8.826V5.912H5.816c-.592 0-.857.392-.598.89m7.84 8.826L18.783 6.8c.265-.497-.006-.89-.599-.89H13.06z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-white">TON</h4>
                    <p className="text-xs text-neutral-500">Toncoin</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    {(isLoadingAssets || !hasFetched) ? (
                      <div className="space-y-1 flex flex-col items-end">
                        <Skeleton className="h-5 w-24 bg-secondary" />
                        <Skeleton className="h-3 w-16 bg-secondary" />
                      </div>
                    ) : (
                      <>
                        <h4 className="font-bold text-white">{hideBalance ? "••••" : formatAmount(tonBalance)}</h4>
                        <p className="text-xs text-neutral-500">{hideBalance ? "••••" : formatUsd(tonUsdValue)}</p>
                      </>
                    )}
                  </div>
                  <Icon icon="lucide:chevron-right" className="w-4 h-4 text-neutral-500"/>
                </div>
              </CardContent>
            </Card>
            {tonAssetCount > 1 ? <Separator /> : null}

            {/* Jetton loading skeleton */}
            {(isLoadingAssets || !hasFetched) && jettons.length === 0 && (
              <>
                {[1, 2].map((i) => (
                  <Card key={i} className="w-full bg-transparent border-0 rounded-none shadow-none">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full bg-secondary" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-14 bg-secondary" />
                          <Skeleton className="h-3 w-20 bg-secondary" />
                        </div>
                      </div>
                      <div className="space-y-1.5 flex flex-col items-end">
                        <Skeleton className="h-4 w-16 bg-secondary" />
                        <Skeleton className="h-3 w-10 bg-secondary" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            {/* No tokens message */}
            {!isLoadingAssets && hasFetched && jettons.length === 0 && (
              <div className="py-4 text-center">
                <p className="text-xs text-neutral-500">Tokens will appear here automatically.</p>
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
                      key={jetton.jettonAddress ?? `jetton-${index}`}
                      className="absolute top-0 left-0 w-full"
                      style={{ transform: `translateY(${virtualItem.start - (jettonsVirtualizer.options.scrollMargin ?? 0)}px)` }}
                      ref={jettonsVirtualizer.measureElement}
                      data-index={virtualItem.index}
                    >
                      <Card
                        className="w-full bg-transparent border-0 rounded-none shadow-none hover:bg-secondary/60 transition-colors cursor-pointer active:scale-[0.99]"
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
                            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center overflow-hidden border-0">
                              {jetton.image ? (
                                <Image src={jetton.image} alt={jetton.symbol} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                              ) : (
                                <span className="text-white text-xs font-bold">{jetton.symbol.slice(0, 2)}</span>
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-white">{jetton.symbol}</h4>
                              <p className="text-xs text-neutral-500 truncate max-w-[120px]">{jetton.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right min-w-[80px]">
                              <h4 className="font-bold text-white">{hideBalance ? "••••" : formatAmount(parseFloat(formattedBalance))}</h4>
                              <p className="text-xs text-neutral-500">{hideBalance ? "••••" : usdDisplay}</p>
                            </div>
                            <Icon icon="lucide:chevron-right" className="w-4 h-4 text-neutral-500"/>
                          </div>
                        </CardContent>
                      </Card>
                      {index < jettons.length - 1 ? <Separator /> : null}
                    </div>
                  );
                })}
              </div>
            )}
              </div>
            ) : null}

            {/* BTC Balance Card - Only show in mainnet */}
            {assetChainTab === "multichain" && !isTestnet && multiChainAssetCount > 0 ? (
              <div className="rounded-2xl bg-secondary p-1">
            {btcAddress && (
              <>
              <Card
                className="w-full bg-transparent border-0 rounded-none shadow-none hover:bg-secondary/60 transition-colors cursor-pointer active:scale-[0.99]"
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
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                      <Image src={BTC_ICON} alt="BTC" width={40} height={40} className="w-full h-full" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">BTC</h4>
                      <p className="text-xs text-neutral-500">Bitcoin</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {isLoadingMultiChain ? (
                        <div className="space-y-1 flex flex-col items-end">
                          <Skeleton className="h-5 w-24 bg-secondary" />
                          <Skeleton className="h-3 w-16 bg-secondary" />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-white">{hideBalance ? "••••" : formatAmount(btcBalance, 2)}</h4>
                          <p className="text-xs text-neutral-500">{hideBalance ? "••••" : formatUsd(btcUsdValue)}</p>
                        </>
                      )}
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-4 h-4 text-neutral-500"/>
                  </div>
                </CardContent>
              </Card>
              {btcAssetIndex < multiChainAssetCount - 1 ? <Separator /> : null}
              </>
            )}

            {/* ETH Balance Card - Only show in mainnet */}
            {ethAddress && (
              <>
              <Card
                className="w-full bg-transparent border-0 rounded-none shadow-none hover:bg-secondary/60 transition-colors cursor-pointer active:scale-[0.99]"
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
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                      <Image src={ETH_ICON} alt="ETH" width={40} height={40} className="w-full h-full" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">ETH</h4>
                      <p className="text-xs text-neutral-500">Ethereum</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {isLoadingMultiChain ? (
                        <div className="space-y-1 flex flex-col items-end">
                          <Skeleton className="h-5 w-24 bg-secondary" />
                          <Skeleton className="h-3 w-16 bg-secondary" />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-white">{hideBalance ? "••••" : formatAmount(ethBalance)}</h4>
                          <p className="text-xs text-neutral-500">{hideBalance ? "••••" : formatUsd(ethUsdValue)}</p>
                        </>
                      )}
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-4 h-4 text-neutral-500"/>
                  </div>
                </CardContent>
              </Card>
              {ethAssetIndex < multiChainAssetCount - 1 ? <Separator /> : null}
              </>
            )}

            {/* SOL Balance Card - Only show in mainnet */}
            {solAddress && (
              <>
              <Card
                className="w-full bg-transparent border-0 rounded-none shadow-none hover:bg-secondary/60 transition-colors cursor-pointer active:scale-[0.99]"
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
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                      <Image src={SOL_ICON} alt="SOL" width={40} height={40} className="w-full h-full" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">SOL</h4>
                      <p className="text-xs text-neutral-500">Solana</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {isLoadingMultiChain ? (
                        <div className="space-y-1 flex flex-col items-end">
                          <Skeleton className="h-5 w-24 bg-secondary" />
                          <Skeleton className="h-3 w-16 bg-secondary" />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-white">{hideBalance ? "••••" : formatAmount(solBalance)}</h4>
                          <p className="text-xs text-neutral-500">{hideBalance ? "••••" : formatUsd(solUsdValue)}</p>
                        </>
                      )}
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-4 h-4 text-neutral-500"/>
                  </div>
                </CardContent>
              </Card>
              {solAssetIndex < multiChainAssetCount - 1 ? <Separator /> : null}
              </>
            )}

            {/* TRX Balance Card - Only show in mainnet */}
            {trxAddress && (
              <>
              <Card
                className="w-full bg-transparent border-0 rounded-none shadow-none hover:bg-secondary/60 transition-colors cursor-pointer active:scale-[0.99]"
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
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                      <Image src={TRX_ICON} alt="TRX" width={40} height={40} className="w-full h-full" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">TRX</h4>
                      <p className="text-xs text-neutral-500">TRON</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {isLoadingMultiChain ? (
                        <div className="space-y-1 flex flex-col items-end">
                          <Skeleton className="h-5 w-24 bg-secondary" />
                          <Skeleton className="h-3 w-16 bg-secondary" />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-white">{hideBalance ? "••••" : formatAmount(trxBalance)}</h4>
                          <p className="text-xs text-neutral-500">{hideBalance ? "••••" : formatUsd(trxUsdValue)}</p>
                        </>
                      )}
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-4 h-4 text-neutral-500"/>
                  </div>
                </CardContent>
              </Card>
              {trxAssetIndex < multiChainAssetCount - 1 ? <Separator /> : null}
              </>
            )}
              </div>
            ) : null}
            {assetChainTab === "multichain" && (
              <>
                {isTestnet ? (
                  <div className="py-8 text-center">
                    <Icon icon="lucide:flask-conical" className="mx-auto mb-2 h-8 w-8 text-neutral-600" />
                    <p className="text-sm text-neutral-500">Multi-chain assets are available on mainnet.</p>
                  </div>
                ) : !btcAddress && !ethAddress && !solAddress && !trxAddress ? (
                  <div className="py-8 text-center">
                    <Icon icon="lucide:wallet-cards" className="mx-auto mb-2 h-8 w-8 text-neutral-600" />
                    <p className="text-sm text-neutral-500">Preparing multi-chain assets...</p>
                  </div>
                ) : null}
              </>
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
                  <Card key={i} className="bg-secondary border-0 rounded-2xl shadow-none overflow-hidden">
                    <Skeleton className="w-full aspect-square bg-secondary" />
                    <CardContent className="p-3 space-y-1.5">
                      <Skeleton className="h-4 w-20 bg-secondary" />
                      <Skeleton className="h-3 w-24 bg-secondary" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoadingNfts && nfts.length === 0 && (
              <div className="py-8 text-center">
                <Icon icon="lucide:image" className="w-8 h-8 text-neutral-600 mx-auto mb-2"/>
                <p className="text-sm text-neutral-500">No NFTs found</p>
                <p className="text-xs text-neutral-600 mt-1">Your collectibles will appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div >
      </div>

      {/* Asset Detail Modal */}
      
        {
          selectedAsset && (
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center"
              onClick={() => setSelectedAsset(null)}
            >
              <div
                className="bg-secondary border-t-0 rounded-t-3xl w-full max-w-md p-6 pb-24"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-0"
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
                      <p className="text-sm text-neutral-400">{selectedAsset.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedAsset(null)}
                    className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-secondary/80 transition-colors"
                  >
                    <Icon icon="lucide:x" className="w-4 h-4"/>
                  </Button>
                </div>

                {/* Current Price */}
                <div className="mb-6 flex items-end justify-between gap-4">
                  <p className="text-neutral-400 text-sm pb-1">Current price</p>
                  <h2 className="text-right text-3xl font-bold text-white">
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
                    <p className="text-neutral-400 text-sm">Price chart</p>
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                      {(['1H', '1D', '1W', '1M', '6M', '1Y'] as ChartPeriod[]).map((period) => (
                        <Button
                          key={period}
                          size="sm"
                          variant="ghost"
                          onClick={() => setChartPeriod(period)}
                          className={`px-2.5 py-1 h-auto rounded-lg text-[10px] font-medium transition-colors ${chartPeriod === period
                            ? 'bg-white text-black hover:bg-white/90 shadow-sm'
                            : 'bg-secondary text-neutral-500 hover:text-neutral-300 hover:bg-secondary/80'
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
                        <Skeleton className="w-full h-full bg-secondary" />
                      </div>
                    ) : priceHistory.length > 0 ? (
                      <WalletPriceChart
                        data={priceHistory}
                        color={selectedAsset.color}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
                        No price data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Holdings Info */}
                <div className="bg-[#0a0a0a] rounded-xl p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-neutral-400 text-sm">Your holdings</span>
                    <span className="text-white font-bold">
                      {hideBalance ? "••••" : `${selectedAsset.balance} ${selectedAsset.symbol}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 text-sm">Value</span>
                    <span className="text-white font-bold">
                      {hideBalance ? "••••" : `$${selectedAsset.value.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        }
    </div >
  );
}

// ─── Wallet onboarding ─────────────────────────────────
function WalletOnboardingReveal({
  tgFirstName,
  isLoading,
  createWallet,
}: {
  tgFirstName: string;
  isLoading: boolean;
  createWallet: () => Promise<void>;
}) {
  return (
    <div className="flex min-h-[68vh] w-full max-w-md flex-col justify-between text-center">
      <div className="relative pt-2">
        <WalletWelcomeCinematic />
      </div>

      <div className="space-y-3 px-2 pb-2">
        <h3 className="text-3xl font-bold text-white tracking-tight">
          Welcome to QC Wallet, {tgFirstName}.
        </h3>
        <p className="text-neutral-400 text-sm max-w-[340px] mx-auto leading-relaxed">
          This is your secure, fast, and reliable home for your assets. Tap below to create or import your wallet.
        </p>
      </div>

      <div className="space-y-3 w-full">
        <Button
          onClick={createWallet}
          disabled={isLoading}
          className="w-full bg-white text-black hover:bg-neutral-200 h-12 rounded-xl font-semibold text-base shadow-lg shadow-white/5 border-0 inline-flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <ButtonLoader />
          ) : (
            <>
              <Icon icon="lucide:plus" className="w-4 h-4" />
              Create new wallet
            </>
          )}
        </Button>

        <Button
          variant="secondary"
          asChild
          className="w-full h-12 rounded-xl font-semibold text-base inline-flex items-center justify-center gap-2"
        >
          <Link href="/wallet/import">
            <Icon icon="lucide:download" className="w-4 h-4" />
            Import existing wallet
          </Link>
        </Button>
      </div>
    </div>
  );
}
