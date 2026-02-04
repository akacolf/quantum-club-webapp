import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useRouter } from "expo-router";
import { Icon } from '@/components/icons';
import Svg, { Path, Rect } from "react-native-svg";

interface Token {
  id: string;
  name: string;
  symbol: string;
  image?: string;
  currentPrice: string;
  priceChange24h?: number;
  marketCap?: string;
  tonReserve?: string;
  volume24h?: number;
  creatorWallet?: string;
  graduationThreshold?: string;
}

const DEFAULT_GRADUATION_THRESHOLD_TON = "100";

// Crown icon for rankings
function CrownIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"
      />
    </Svg>
  );
}

// Format price from nano
function formatPrice(priceNano: bigint): string {
  const price = Number(priceNano) / 1e9;
  if (price < 0.000001) return "<0.000001 TON";
  if (price < 0.001) return `${price.toFixed(6)} TON`;
  if (price < 1) return `${price.toFixed(4)} TON`;
  return `${price.toFixed(2)} TON`;
}

// Format market cap
function formatMarketCap(capNano: string): string {
  const cap = Number(BigInt(capNano || "0")) / 1e9;
  if (cap >= 1000000) return `${(cap / 1000000).toFixed(1)}M TON`;
  if (cap >= 1000) return `${(cap / 1000).toFixed(1)}K TON`;
  return `${cap.toFixed(2)} TON`;
}

// Calculate progress percentage
function calculateProgress(marketCapNano: string, thresholdTon: string): number {
  try {
    const mcTon = Number(BigInt(marketCapNano || "0")) / 1e9;
    const total = Number(thresholdTon);
    if (total <= 0) return 0;
    return Math.min((mcTon / total) * 100, 100);
  } catch {
    return 0;
  }
}

// Get rank badge color
function getRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return "#FFD700";
    case 2:
      return "#C0C0C0";
    case 3:
      return "#CD7F32";
    default:
      return "#6b7280";
  }
}

// Token Card Component
function TokenCard({ token, index }: { token: Token; index: number }) {
  const router = useRouter();
  const priceChange = token.priceChange24h || 0;
  const isPositive = priceChange >= 0;
  const progress = calculateProgress(
    token.tonReserve || token.marketCap || "0",
    token.graduationThreshold || DEFAULT_GRADUATION_THRESHOLD_TON
  );
  const isTop3 = index < 3;

  return (
    <Pressable onPress={() => router.push(`/trade/${token.id}` as never)}>
      <Card className="bg-[#111] border-[#222] mb-3">
        <CardContent className="p-3">
          <View className="flex-row gap-3">
            {/* Token Image */}
            <View className="w-16 h-16 rounded-2xl bg-[#222] items-center justify-center overflow-hidden">
              {/* Rank Badge */}
              {isTop3 && (
                <View
                  className="absolute top-0 left-0 z-10 w-6 h-6 rounded-br-xl items-center justify-center"
                  style={{ backgroundColor: getRankColor(index + 1) + "CC" }}
                >
                  <CrownIcon color="#000" />
                </View>
              )}
              <Text style={styles.tokenInitials}>{token.symbol.slice(0, 2)}</Text>
            </View>

            {/* Content */}
            <View className="flex-1">
              {/* Header Row */}
              <View className="flex-row items-start justify-between mb-1.5">
                <View className="flex-1 pr-2">
                  <Text style={styles.tokenName} numberOfLines={1}>
                    {token.name}
                  </Text>
                  <View className="flex-row items-center gap-1.5 mt-0.5">
                    <View className="bg-white/90 px-1.5 py-0.5 rounded">
                      <Text style={styles.tokenSymbol}>${token.symbol}</Text>
                    </View>
                    <Text style={styles.creatorWallet} numberOfLines={1}>
                      by {token.creatorWallet?.slice(0, 4)}...{token.creatorWallet?.slice(-4)}
                    </Text>
                  </View>
                </View>

                {/* Price */}
                <View className="items-end">
                  <Text style={styles.tokenPrice}>
                    {formatPrice(BigInt(token.currentPrice || "0"))}
                  </Text>
                  <View className="flex-row items-center gap-0.5">
                    <Icon
                      name={isPositive ? "solar:arrow-right-up-linear" : "solar:arrow-left-down-linear"}
                      size={10}
                      color={isPositive ? "#4ade80" : "#f87171"}
                    />
                    <Text
                      style={[
                        styles.priceChange,
                        { color: isPositive ? "#4ade80" : "#f87171" },
                      ]}
                    >
                      {Math.abs(priceChange).toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Progress Bar */}
              <View className="mt-2">
                <View className="flex-row justify-between mb-1">
                  <Text style={styles.progressLabel}>Bonding Curve</Text>
                  <Text
                    style={[
                      styles.progressValue,
                      progress > 90 && { color: "#4ade80" },
                    ]}
                  >
                    {progress.toFixed(1)}%
                  </Text>
                </View>
                <View className="h-1 bg-[#333] rounded-full overflow-hidden">
                  <View
                    className={`h-full rounded-full ${
                      progress >= 100 ? "bg-green-500" : "bg-white"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Footer Stats */}
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-[#222]">
            <View className="flex-row items-center gap-1.5">
              <Icon name="solar:chart-2-linear" size={12} color="#9ca3af" />
              <Text style={styles.statLabel}>MCap:</Text>
              <Text style={styles.statValue}>
                {formatMarketCap(token.tonReserve || token.marketCap || "0")}
              </Text>
            </View>
            <View className="w-px h-3 bg-[#333]" />
            <View className="flex-row items-center gap-1.5">
              <Icon name="solar:graph-up-linear" size={12} color="#9ca3af" />
              <Text style={styles.statLabel}>Vol:</Text>
              <Text style={styles.statValue}>
                {((token.volume24h || 0) / 1e9).toFixed(1)} TON
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
}

// Tab Button Component
function TabButton({
  label,
  active,
  icon,
  onPress,
}: {
  label: string;
  active: boolean;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 h-10 rounded-xl items-center justify-center flex-row gap-1.5 ${
        active ? "bg-white" : "bg-transparent"
      }`}
    >
      <Icon name={icon} size={14} color={active ? "#000" : "#9ca3af"} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function TradeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"trending" | "new" | "graduated">("trending");
  const [tokens, setTokens] = useState<Token[]>([]);

  const fetchTokens = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://quantumclub.app"}/api/tokens?tab=${activeTab}`
      );
      if (response.ok) {
        const data = await response.json();
        setTokens(data.tokens || []);
      }
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchTokens();
  }, [fetchTokens]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTokens();
    setRefreshing(false);
  };

  const filteredTokens = tokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
            colors={["#fff"]}
          />
        }
      >
        <View className="p-4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
              >
                <Icon name="solar:arrow-left-linear" size={20} color="#fff" />
              </Pressable>
              <Text style={styles.header}>RocketStart</Text>
            </View>
            <Pressable
              onPress={() => router.push("/trade/create" as never)}
              className="h-10 px-4 rounded-xl bg-white flex-row items-center gap-2"
            >
              <Icon name="solar:add-circle-bold" size={18} color="#000" />
              <Text style={styles.createButtonText}>Create</Text>
            </Pressable>
          </View>

          {/* Search */}
          <View className="flex-row items-center gap-2 p-3 bg-[#111] border border-[#222] rounded-xl mb-4">
            <Icon name="solar:magnifer-linear" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tokens..."
              placeholderTextColor="#6b7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Icon name="solar:close-circle-bold" size={18} color="#6b7280" />
              </Pressable>
            )}
          </View>

          {/* Tabs */}
          <View className="flex-row gap-2 p-1 bg-[#111] border border-[#222] rounded-xl mb-6">
            <TabButton
              label="Trending"
              icon="solar:fire-bold"
              active={activeTab === "trending"}
              onPress={() => setActiveTab("trending")}
            />
            <TabButton
              label="New"
              icon="solar:stars-bold"
              active={activeTab === "new"}
              onPress={() => setActiveTab("new")}
            />
            <TabButton
              label="Graduated"
              icon="solar:rocket-bold"
              active={activeTab === "graduated"}
              onPress={() => setActiveTab("graduated")}
            />
          </View>

          {/* Token List */}
          {loading ? (
            <View className="gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-[#111] border-[#222]">
                  <CardContent className="p-4">
                    <View className="flex-row gap-3">
                      <Skeleton className="w-16 h-16 rounded-xl" />
                      <View className="flex-1 gap-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-2 w-full" />
                      </View>
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>
          ) : filteredTokens.length > 0 ? (
            filteredTokens.map((token, index) => (
              <TokenCard key={token.id} token={token} index={index} />
            ))
          ) : (
            <View className="items-center justify-center py-12">
              <View className="w-16 h-16 rounded-full bg-white/5 items-center justify-center mb-4">
                <Icon name="solar:box-linear" size={32} color="#6b7280" />
              </View>
              <Text style={styles.emptyText}>
                {searchQuery ? "No tokens found" : "No tokens yet"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  createButtonText: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#fff",
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: "Onest_600SemiBold",
    color: "#9ca3af",
  },
  tabLabelActive: {
    color: "#000",
  },
  tokenInitials: {
    fontSize: 18,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  tokenName: {
    fontSize: 15,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  tokenSymbol: {
    fontSize: 10,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  creatorWallet: {
    fontSize: 10,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
  },
  tokenPrice: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#fff",
  },
  priceChange: {
    fontSize: 10,
    fontFamily: "Onest_700Bold",
  },
  progressLabel: {
    fontSize: 9,
    fontFamily: "Onest_500Medium",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: 9,
    fontFamily: "Onest_500Medium",
    color: "#fff",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Onest_500Medium",
    color: "#9ca3af",
  },
  statValue: {
    fontSize: 10,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#6b7280",
  },
});
