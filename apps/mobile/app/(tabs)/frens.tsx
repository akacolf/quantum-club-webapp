import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, RefreshControl, Pressable, Share, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { useGameContext } from "~/contexts/GameContext";
import { getReferralStats, claimReferralRewards } from "~/lib/api";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

interface Referral {
  id: string;
  username: string;
  quantamount: number;
}

export default function FrensScreen() {
  const { telegramId, username } = useGameContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralsCount, setReferralsCount] = useState(0);
  const [secondTierCount, setSecondTierCount] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [tonEarnings, setTonEarnings] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isClaimingTon, setIsClaimingTon] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralLink = `https://t.me/QuantumClubBot?start=ref_${telegramId}`;

  const fetchData = useCallback(async () => {
    if (!telegramId) {
      setLoading(false);
      return;
    }

    try {
      const result = await getReferralStats(telegramId);
      if (result.success && result.data) {
        setReferralsCount(result.data.referralsCount || 0);
        setSecondTierCount(result.data.secondTierCount || 0);
        setPendingRewards(result.data.pendingRewards || 0);
        setTonEarnings(result.data.tonEarnings || 0);
        setReferrals(result.data.referrals || []);
      }
    } catch (error) {
      console.error("Error fetching referral stats:", error);
    } finally {
      setLoading(false);
    }
  }, [telegramId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on Quantum Club and earn rewards! ${referralLink}`,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleClaimRewards = async () => {
    if (pendingRewards <= 0 || isClaiming || !telegramId) return;

    setIsClaiming(true);
    try {
      const result = await claimReferralRewards(telegramId, "qntm");
      if (result.success && result.data && result.data.claimedAmount > 0) {
        setPendingRewards(0);
      }
    } catch (error) {
      console.error("Claim error:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClaimTon = async () => {
    if (tonEarnings <= 0 || isClaimingTon || !telegramId) return;

    setIsClaimingTon(true);
    try {
      const result = await claimReferralRewards(telegramId, "ton");
      if (result.success && result.data && result.data.claimedAmount > 0) {
        setTonEarnings(0);
      }
    } catch (error) {
      console.error("Claim TON error:", error);
    } finally {
      setIsClaimingTon(false);
    }
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
          <Text style={styles.header}>Frens</Text>

          {/* TON Referral Earnings Card */}
          <Card className="mb-4 border-[#222] bg-[#111]">
            <CardContent className="p-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-[#0098EA] items-center justify-center">
                    <Text style={styles.tonLabel}>TON</Text>
                  </View>
                  <View>
                    <Text style={styles.cardLabel}>TON Referral Earnings</Text>
                    <View className="flex-row items-baseline gap-1">
                      <Text style={styles.bigNumber}>{tonEarnings.toFixed(4)}</Text>
                      <Text style={styles.unit}>TON</Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={handleClaimTon}
                  disabled={isClaimingTon || tonEarnings <= 0}
                  style={[styles.claimButton, tonEarnings > 0 ? styles.claimActive : styles.claimDisabled]}
                >
                  {isClaimingTon ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={[styles.claimText, tonEarnings <= 0 && styles.claimTextDisabled]}>Claim</Text>
                  )}
                </Pressable>
              </View>
              <Text style={styles.helperText}>
                Earn 0.1% from your referrals' fees when they trade on QC RocketStart.
              </Text>
            </CardContent>
          </Card>

          {/* Main Stats Card */}
          <Card className="mb-4 border-[#222] bg-[#111]">
            <CardContent className="p-6">
              {/* First Tier */}
              <View className="flex-row items-center justify-between">
                <View>
                  <Badge className="bg-blue-500/20 border-blue-500/20 mb-2">
                    <Text style={styles.badgeBlue}>EARN 10%</Text>
                  </Badge>
                  <Text style={styles.tierLabel}>FROM YOUR INVITES</Text>
                </View>
                <View className="items-end">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="people" size={32} color="#9ca3af" />
                    <Text style={styles.statNumber}>{referralsCount}</Text>
                  </View>
                  <Text style={styles.statLabel}>INVITED FRENS</Text>
                </View>
              </View>

              {/* Second Tier */}
              <View className="pt-4 mt-4 border-t border-[#222]">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Badge className="bg-white/10 border-white/10 mb-2">
                      <Text style={styles.badgeGray}>EARN 2%</Text>
                    </Badge>
                    <Text style={styles.tierLabel}>FROM THEIR INVITES</Text>
                  </View>
                  {secondTierCount > 0 && (
                    <View className="items-end">
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="people-outline" size={24} color="#9ca3af" />
                        <Text style={styles.statNumberSmall}>{secondTierCount}</Text>
                      </View>
                      <Text style={styles.statLabel}>2ND TIER FRENS</Text>
                    </View>
                  )}
                </View>

                {/* Pending Rewards */}
                <View className="mt-4 p-3 bg-white/5 border border-[#222] rounded-lg">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="gift" size={20} color="#fff" />
                      <View>
                        <Text style={styles.pendingLabel}>Pending Rewards</Text>
                        <Text style={styles.pendingAmount}>
                          {pendingRewards.toFixed(0)} QNTM
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={handleClaimRewards}
                      disabled={isClaiming || pendingRewards <= 0}
                      style={[styles.claimButtonSmall, pendingRewards > 0 ? styles.claimActive : styles.claimDisabled]}
                    >
                      {isClaiming ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Text style={[styles.claimTextSmall, pendingRewards <= 0 && styles.claimTextDisabled]}>
                          Claim
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.helperText}>
                  When your invited friends invite others, you earn 2% of their earnings.
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Invite Card */}
          <Card className="mb-6 border-[#222] bg-[#111]">
            <CardContent className="p-4">
              <Text style={styles.cardTitle}>Invite Friends</Text>
              
              {/* Link Display */}
              <View className="flex-row items-center gap-2 p-3 bg-black rounded-lg border border-[#222] mb-3">
                <Text style={styles.linkText} numberOfLines={1}>
                  {referralLink}
                </Text>
                <Pressable onPress={handleCopyLink} className="p-2">
                  <Ionicons 
                    name={copied ? "checkmark" : "copy-outline"} 
                    size={20} 
                    color={copied ? "#22c55e" : "#9ca3af"} 
                  />
                </Pressable>
              </View>

              {/* Share Button */}
              <Pressable onPress={handleShare} style={styles.shareButton}>
                <Text style={styles.shareButtonText}>Share Invite Link</Text>
              </Pressable>
            </CardContent>
          </Card>

          {/* Referrals List */}
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-4">
              <Ionicons name="people" size={20} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Your Referrals</Text>
            </View>

            {referrals.length > 0 ? (
              <View className="gap-3">
                {referrals.map((referral, index) => (
                  <Card key={index} className="bg-[#111] border-[#222]">
                    <CardContent className="p-4 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3">
                        <Avatar className="w-10 h-10 border border-[#222]">
                          <AvatarFallback className="bg-[#1a1a1a]">
                            <Ionicons name="person" size={20} color="#9ca3af" />
                          </AvatarFallback>
                        </Avatar>
                        <Text style={styles.referralName}>{referral.username}</Text>
                      </View>
                      <View className="flex-row items-center gap-2 bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[#222]">
                        <Ionicons name="trophy" size={14} color="#eab308" />
                        <Text style={styles.rewardAmount}>
                          +{((referral.quantamount * 10) / 100).toFixed(0)} QNTM
                        </Text>
                      </View>
                    </CardContent>
                  </Card>
                ))}
              </View>
            ) : (
              <View className="items-center justify-center py-8">
                <Ionicons name="person-add" size={64} color="#4b5563" />
                <Text style={styles.emptyText}>Invite some frens to see them here!</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 30,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    marginBottom: 24,
  },
  tonLabel: {
    fontSize: 12,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#9ca3af",
  },
  bigNumber: {
    fontSize: 24,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  unit: {
    fontSize: 16,
    fontFamily: "Onest_500Medium",
    color: "#9ca3af",
  },
  helperText: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    marginTop: 12,
  },
  badgeBlue: {
    fontSize: 12,
    fontFamily: "Onest_600SemiBold",
    color: "#60a5fa",
  },
  badgeGray: {
    fontSize: 12,
    fontFamily: "Onest_600SemiBold",
    color: "#d1d5db",
  },
  tierLabel: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#9ca3af",
  },
  statNumber: {
    fontSize: 40,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  statNumberSmall: {
    fontSize: 30,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Onest_500Medium",
    color: "#6b7280",
    marginTop: 4,
  },
  pendingLabel: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#fff",
  },
  pendingAmount: {
    fontSize: 18,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  claimButton: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  claimButtonSmall: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  claimActive: {
    backgroundColor: "#fff",
  },
  claimDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  claimText: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  claimTextSmall: {
    fontSize: 12,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  claimTextDisabled: {
    color: "#6b7280",
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    marginBottom: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  shareButton: {
    height: 48,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  shareButtonText: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Onest_600SemiBold",
    color: "#60a5fa",
  },
  referralName: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#e5e7eb",
  },
  rewardAmount: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#eab308",
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#9ca3af",
    marginTop: 16,
  },
});
