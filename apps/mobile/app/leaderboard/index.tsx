import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { useGameContext } from "~/contexts/GameContext";
import { useRouter } from "expo-router";
import { Icon } from '@/components/icons';
import Svg, { Path, Circle } from "react-native-svg";

interface LeaderboardUser {
  id: string;
  username: string;
  QuantAmount: number;
  rank?: number;
}

// Crown icon for top 3
function CrownIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"
      />
    </Svg>
  );
}

// QNTM Icon
function QntmIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path
        fill="#fff"
        d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667"
      />
    </Svg>
  );
}

// Format amount with K/M/B suffix
function formatAmount(amount: number): string {
  if (amount >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(1) + "B";
  } else if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1) + "M";
  } else if (amount >= 1_000) {
    return Math.round(amount / 1_000) + "K";
  }
  return amount.toFixed(0);
}

// Get rank badge color
function getRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return "#FFD700"; // Gold
    case 2:
      return "#C0C0C0"; // Silver
    case 3:
      return "#CD7F32"; // Bronze
    default:
      return "#6b7280";
  }
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { telegramId, mainQuantAmount, username, rank } = useGameContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalQuant, setTotalQuant] = useState("0");
  const [userRank, setUserRank] = useState<number | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://quantumclub.app"}/api/getUserValues`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramId }),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch leaderboard");

      const data = await response.json();
      setLeaderboard(data.allValues || []);
      setTotalUsers(data.userCount || 0);
      setTotalQuant(formatAmount(data.totalAmount || 0));

      // Find user's rank
      const userIndex = data.allValues?.findIndex(
        (user: LeaderboardUser) => user.id === telegramId
      );
      if (userIndex !== -1 && userIndex !== undefined) {
        setUserRank(userIndex + 1);
      }
    } catch (error) {
      console.error("Leaderboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [telegramId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

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
          <View className="flex-row items-center gap-3 mb-6">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
            >
              <Icon name="solar:arrow-left-linear" size={20} color="#fff" />
            </Pressable>
            <Text style={styles.header}>Leaderboard</Text>
          </View>

          {/* Stats Cards */}
          <View className="flex-row gap-3 mb-6">
            <Card className="flex-1 border-[#222] bg-[#111]">
              <CardContent className="p-4 items-center">
                <View className="flex-row items-center gap-1 mb-1">
                  <Icon name="solar:users-group-rounded-linear" size={16} color="#9ca3af" />
                  <Text style={styles.statsLabel}>Users</Text>
                </View>
                <Text style={styles.statsValue}>{totalUsers.toLocaleString()}</Text>
              </CardContent>
            </Card>
            <Card className="flex-1 border-[#222] bg-[#111]">
              <CardContent className="p-4 items-center">
                <View className="flex-row items-center gap-1 mb-1">
                  <QntmIcon size={14} />
                  <Text style={styles.statsLabel}>Total QNTM</Text>
                </View>
                <Text style={styles.statsValue}>{totalQuant}</Text>
              </CardContent>
            </Card>
          </View>

          {/* User's Stats */}
          <Card className="mb-6 border-orange-500/20 bg-[#111]">
            <CardContent className="p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-full bg-orange-500/20 items-center justify-center border border-orange-500/30">
                    <Icon name="solar:user-bold" size={24} color="#fb923c" />
                  </View>
                  <View>
                    <Text style={styles.userName}>{username || "You"}</Text>
                    <View className="flex-row items-center gap-1">
                      <Text style={styles.userRankLabel}>Rank:</Text>
                      <Text style={styles.userRankValue}>
                        #{userRank || rank || "—"}
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="items-end">
                  <Text style={styles.userBalance}>{mainQuantAmount}</Text>
                  <Text style={styles.userBalanceLabel}>QNTM</Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Leaderboard List */}
          <Text style={styles.sectionTitle}>Top Earners</Text>
          <View className="gap-2">
            {leaderboard.slice(0, 100).map((user, index) => {
              const isCurrentUser = user.id === telegramId;
              const rankNum = index + 1;
              const isTop3 = rankNum <= 3;

              return (
                <Card
                  key={user.id}
                  className={`border-[#222] ${isCurrentUser ? "bg-orange-500/10 border-orange-500/30" : "bg-[#111]"}`}
                >
                  <CardContent className="p-3 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      {/* Rank */}
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: isTop3
                            ? getRankColor(rankNum) + "20"
                            : "rgba(255,255,255,0.05)",
                        }}
                      >
                        {isTop3 ? (
                          <CrownIcon color={getRankColor(rankNum)} />
                        ) : (
                          <Text style={styles.rankNumber}>{rankNum}</Text>
                        )}
                      </View>

                      {/* Avatar */}
                      <Avatar className="w-10 h-10 border border-[#222]">
                        <AvatarFallback className="bg-[#1a1a1a]">
                          <Icon name="solar:user-linear" size={18} color="#9ca3af" />
                        </AvatarFallback>
                      </Avatar>

                      {/* Username */}
                      <Text
                        style={[
                          styles.listUsername,
                          isCurrentUser && styles.listUsernameHighlight,
                        ]}
                        numberOfLines={1}
                      >
                        {user.username || "Anonymous"}
                        {isCurrentUser && " (You)"}
                      </Text>
                    </View>

                    {/* Amount */}
                    <View className="flex-row items-center gap-1">
                      <QntmIcon size={14} />
                      <Text
                        style={[
                          styles.listAmount,
                          isTop3 && { color: getRankColor(rankNum) },
                        ]}
                      >
                        {formatAmount(user.QuantAmount)}
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              );
            })}
          </View>
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
  statsLabel: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  statsValue: {
    fontSize: 24,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  userName: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  userRankLabel: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  userRankValue: {
    fontSize: 12,
    fontFamily: "Onest_700Bold",
    color: "#fb923c",
  },
  userBalance: {
    fontSize: 20,
    fontFamily: "Onest_700Bold",
    color: "#fb923c",
  },
  userBalanceLabel: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    marginBottom: 16,
  },
  rankNumber: {
    fontSize: 12,
    fontFamily: "Onest_600SemiBold",
    color: "#9ca3af",
  },
  listUsername: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#e5e7eb",
    maxWidth: 140,
  },
  listUsernameHighlight: {
    color: "#fb923c",
  },
  listAmount: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
});
