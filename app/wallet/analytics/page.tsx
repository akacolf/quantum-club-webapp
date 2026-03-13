"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../WalletContext";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import Loader from "@/app/(components)/Loader";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { PortfolioHealthCard } from "@/components/ai";

const COLORS = [
  "#3B82F6", // Blue (TON)
  "#F7931A", // Orange (BTC)
  "#627EEA", // Purple (ETH)
  "#9945FF", // Violet (SOL)
  "#FF0013", // Red (TRX)
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#8B5CF6", // Violet
  "#06B6D4", // Cyan
];

interface AssetAllocation {
  name: string;
  symbol: string;
  value: number;
  percentage: number;
  color: string;
  image?: string;
}

interface BalanceHistoryEntry {
  timestamp: number;
  value: number;
}

export default function AnalyticsPage() {
  useTelegramBackButton("/wallet");
  const router = useRouter();

  const {
    walletAddress,
    tonUsdValue,
    totalUsdBalance,
    jettons,
    isLoadingAssets,
    hideBalance,
    isTestnet,
    // Multi-chain
    ethUsdValue,
    btcUsdValue,
    solUsdValue,
    trxUsdValue,
  } = useWallet();
  const { telegramId } = useUserContext();
  useEffect(() => {
    router.prefetch("/wallet");
  }, [router]);

  const [change24h, setChange24h] = useState<number | null>(null);
  const [change7d, setChange7d] = useState<number | null>(null);

  // Load balance history from localStorage
  useEffect(() => {
    if (!walletAddress) return;

    const storageKey = `wallet_balance_history_${walletAddress}`;
    try {
      const stored = localStorage.getItem(storageKey+`_${telegramId}`);
      if (stored) {
        const history = JSON.parse(stored) as BalanceHistoryEntry[];

        // Calculate 24h and 7d changes
        const now = Date.now();
        const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        const currentValue = parseFloat(totalUsdBalance) || 0;

        // 24h change
        const old24h = history.filter(h => h.timestamp <= twentyFourHoursAgo + 60 * 60 * 1000);
        if (old24h.length > 0 && old24h[0].value > 0) {
          requestAnimationFrame(() => {
            setChange24h(((currentValue - old24h[0].value) / old24h[0].value) * 100);
          });
        }

        // 7d change
        const old7d = history.filter(h => h.timestamp <= sevenDaysAgo + 60 * 60 * 1000);
        if (old7d.length > 0 && old7d[0].value > 0) {
          requestAnimationFrame(() => {
            setChange7d(((currentValue - old7d[0].value) / old7d[0].value) * 100);
          });
        }
      }
    } catch {
      // Ignore errors
    }
  }, [walletAddress, totalUsdBalance, telegramId]);

  // Calculate portfolio allocation
  const portfolioAllocation = ((): AssetAllocation[] => {
    const total = parseFloat(totalUsdBalance) || 0;
    if (total === 0) return [];

    const allocations: AssetAllocation[] = [];
    let colorIndex = 0;

    // TON
    const tonValue = parseFloat(tonUsdValue) || 0;
    if (tonValue > 0) {
      allocations.push({
        name: "Toncoin",
        symbol: "TON",
        value: tonValue,
        percentage: (tonValue / total) * 100,
        color: COLORS[colorIndex++ % COLORS.length],
        image: "/svg/ton-logo.svg",
      });
    }

    // Multi-chain assets (mainnet only)
    if (!isTestnet) {
      if (btcUsdValue > 0) {
        allocations.push({
          name: "Bitcoin",
          symbol: "BTC",
          value: btcUsdValue,
          percentage: (btcUsdValue / total) * 100,
          color: COLORS[colorIndex++ % COLORS.length],
          image: "/svg/btc-logo.svg",
        });
      }

      if (ethUsdValue > 0) {
        allocations.push({
          name: "Ethereum",
          symbol: "ETH",
          value: ethUsdValue,
          percentage: (ethUsdValue / total) * 100,
          color: COLORS[colorIndex++ % COLORS.length],
          image: "/svg/eth-logo.svg",
        });
      }

      if (solUsdValue > 0) {
        allocations.push({
          name: "Solana",
          symbol: "SOL",
          value: solUsdValue,
          percentage: (solUsdValue / total) * 100,
          color: COLORS[colorIndex++ % COLORS.length],
          image: "/svg/sol-logo.svg",
        });
      }

      if (trxUsdValue > 0) {
        allocations.push({
          name: "TRON",
          symbol: "TRX",
          value: trxUsdValue,
          percentage: (trxUsdValue / total) * 100,
          color: COLORS[colorIndex++ % COLORS.length],
          image: "/svg/trx-logo.svg",
        });
      }
    }

    // Jettons
    jettons.forEach((jetton) => {
      if (jetton.usdValue && jetton.usdValue > 0) {
        allocations.push({
          name: jetton.name,
          symbol: jetton.symbol,
          value: jetton.usdValue,
          percentage: (jetton.usdValue / total) * 100,
          color: COLORS[colorIndex++ % COLORS.length],
          image: jetton.image,
        });
      }
    });

    // Sort by value descending
    return allocations.sort((a, b) => b.value - a.value);
  })();

  // Prepare data for pie chart
  const pieChartData = portfolioAllocation.map((asset) => ({
    name: asset.symbol,
    value: asset.value,
    color: asset.color,
  }));

  // Prepare data for bar chart (top 5 assets)
  const barChartData = portfolioAllocation.slice(0, 5).map((asset) => ({
    name: asset.symbol,
    value: asset.value,
    percentage: asset.percentage,
    color: asset.color,
  }));

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; color: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 shadow-xl">
          <p className="text-white font-bold">{data.name}</p>
          <p className="text-gray-400 text-sm">${data.value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for bar chart
  const BarTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; percentage: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 shadow-xl">
          <p className="text-white font-bold">{data.name}</p>
          <p className="text-gray-400 text-sm">${data.value.toFixed(2)}</p>
          <p className="text-gray-500 text-xs">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  if (!walletAddress) {
    router.push("/wallet");
    return <Loader />;
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 space-y-4">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full"
        >
          <h1 className="text-2xl font-bold text-white mb-1">Portfolio Analytics</h1>
          <p className="text-gray-400 text-sm">Track your asset performance</p>
        </motion.div>

        {/* Total Balance Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full"
        >
          <Card className="bg-gradient-to-br from-[#0c0c0c] to-black border-white/5 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="lucide:wallet" className="w-4 h-4 text-gray-400"/>
                <span className="text-gray-400 text-sm">Total Portfolio Value</span>
              </div>
              {isLoadingAssets ? (
                <Skeleton className="h-10 w-32 bg-[#222]" />
              ) : (
                <h2 className="text-4xl font-bold text-white">
                  {hideBalance ? "••••••" : `$${totalUsdBalance}`}
                </h2>
              )}

              {/* Performance badges */}
              <div className="flex items-center gap-2 mt-3">
                {change24h !== null && (
                  <Badge
                    variant="secondary"
                    className={`${change24h >= 0
                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                      : "bg-red-500/10 text-red-500 border-red-500/20"
                      } text-xs`}
                  >
                    {change24h >= 0 ? (
                      <Icon icon="lucide:arrow-up-right" className="w-3 h-3 mr-1"/>
                    ) : (
                      <Icon icon="lucide:arrow-down-right" className="w-3 h-3 mr-1"/>
                    )}
                    {hideBalance ? "••" : `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`} 24h
                  </Badge>
                )}
                {change7d !== null && (
                  <Badge
                    variant="secondary"
                    className={`${change7d >= 0
                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                      : "bg-red-500/10 text-red-500 border-red-500/20"
                      } text-xs`}
                  >
                    {change7d >= 0 ? (
                      <Icon icon="lucide:arrow-up-right" className="w-3 h-3 mr-1"/>
                    ) : (
                      <Icon icon="lucide:arrow-down-right" className="w-3 h-3 mr-1"/>
                    )}
                    {hideBalance ? "••" : `${change7d >= 0 ? "+" : ""}${change7d.toFixed(2)}%`} 7d
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Portfolio Health */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="w-full"
        >
          <PortfolioHealthCard
            assets={portfolioAllocation.map(a => ({
              symbol: a.symbol,
              value: a.value,
              percentage: a.percentage,
            }))}
            totalValue={parseFloat(totalUsdBalance) || 0}
            stakedAmount={0}
          />
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full grid grid-cols-2 gap-3"
        >
          <Card className="bg-[#111] border-[#222] rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Icon icon="lucide:pie-chart" className="w-4 h-4 text-blue-400"/>
                </div>
              </div>
              <p className="text-gray-400 text-xs mb-1">Assets</p>
              <p className="text-xl font-bold text-white">
                {portfolioAllocation.length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#111] border-[#222] rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Icon icon="lucide:bar-chart-3" className="w-4 h-4 text-purple-400"/>
                </div>
              </div>
              <p className="text-gray-400 text-xs mb-1">Largest Holding</p>
              <p className="text-xl font-bold text-white">
                {portfolioAllocation[0]?.symbol || "N/A"}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts Tabs */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full"
        >
          <Tabs defaultValue="allocation" className="w-full">
            <TabsList className="w-full h-10">
              <TabsTrigger
                value="allocation"
                className="flex-1 h-full text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-black text-gray-400"
              >
                <Icon icon="lucide:pie-chart" className="w-3.5 h-3.5 mr-1.5"/>
                Allocation
              </TabsTrigger>
              <TabsTrigger
                value="holdings"
                className="flex-1 h-full text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-black text-gray-400"
              >
                <Icon icon="lucide:bar-chart-3" className="w-3.5 h-3.5 mr-1.5"/>
                Holdings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="allocation" className="mt-4">
              <Card className="bg-[#111] border-[#222] rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400 font-medium">Asset Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAssets ? (
                    <div className="h-64 flex items-center justify-center">
                      <Skeleton className="w-48 h-48 rounded-full bg-[#222]" />
                    </div>
                  ) : portfolioAllocation.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                      No assets to display
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip content={<PieTooltip />} />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => (
                              <span className="text-gray-300 text-xs">{value}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="holdings" className="mt-4">
              <Card className="bg-[#111] border-[#222] rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400 font-medium">Top Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAssets ? (
                    <div className="h-64 flex items-center justify-center">
                      <Skeleton className="w-full h-48 bg-[#222]" />
                    </div>
                  ) : barChartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                      No assets to display
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
                          <XAxis
                            type="number"
                            stroke="#555"
                            tick={{ fill: "#555", fontSize: 10 }}
                            tickFormatter={(value) => `$${value}`}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#555"
                            tick={{ fill: "#999", fontSize: 11 }}
                            width={40}
                          />
                          <Tooltip content={<BarTooltip />} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {barChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Asset List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full space-y-3"
        >
          <h3 className="text-sm font-medium text-gray-400 px-1">All Assets</h3>

          {isLoadingAssets ? (
            <>
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-[#111] border-[#222] rounded-xl">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full bg-[#222]" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-16 bg-[#222]" />
                        <Skeleton className="h-3 w-24 bg-[#222]" />
                      </div>
                    </div>
                    <div className="space-y-1.5 flex flex-col items-end">
                      <Skeleton className="h-4 w-20 bg-[#222]" />
                      <Skeleton className="h-3 w-12 bg-[#222]" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : portfolioAllocation.length === 0 ? (
            <Card className="bg-[#111] border-[#222] rounded-xl border-dashed">
              <CardContent className="p-6 text-center">
                <p className="text-gray-500 text-sm">No assets in portfolio</p>
              </CardContent>
            </Card>
          ) : (
            portfolioAllocation.map((asset, index) => (
              <Card key={asset.symbol} className="bg-[#111] border-[#222] rounded-xl hover:bg-[#161616] transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-white/10"
                      style={{ backgroundColor: asset.image ? "transparent" : asset.color }}
                    >
                      {asset.image ? (
                        <Image
                          src={asset.image}
                          alt={asset.symbol}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-white text-xs font-bold">{asset.symbol.slice(0, 2)}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{asset.symbol}</h4>
                      <p className="text-xs text-gray-500">{asset.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-white">
                      {hideBalance ? "••••" : `$${asset.value.toFixed(2)}`}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {hideBalance ? "••" : `${asset.percentage.toFixed(1)}%`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
