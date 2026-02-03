import React, { useState } from "react";
import { View, ScrollView, RefreshControl, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { PersonalizedGreeting } from "./_components/PersonalizedGreeting";
import { QntmBalance } from "./_components/QntmBalance";
import { DailyCheckIn } from "./_components/DailyCheckIn";
import { SolveToEarnCard } from "./_components/SolveToEarnCard";
import { useGameContext } from "~/contexts/GameContext";
import { claimDailyCheckIn } from "~/lib/api";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const router = useRouter();
  const { 
    telegramId,
    setMainQuantAmount, 
    setDaily,
    refreshUserData,
    mainQuantAmount,
    daily,
  } = useGameContext();
  
  const [refreshing, setRefreshing] = useState(false);
  const [isClaimDay, setIsClaimDay] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUserData();
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleClaimDaily = async () => {
    if (isClaimDay || loadingDay || !telegramId) return;
    
    setLoadingDay(true);
    try {
      const result = await claimDailyCheckIn(telegramId);
      if (result.success && result.data) {
        setIsClaimDay(true);
        setDaily(result.data.streak);
        // Update QNTM balance with reward
        const currentBalance = parseFloat(mainQuantAmount) || 0;
        setMainQuantAmount((currentBalance + result.data.reward).toString());
      }
    } catch (error) {
      console.error("Claim error:", error);
    } finally {
      setLoadingDay(false);
    }
  };

  const handleSolveToEarn = () => {
    router.push("/solve-to-earn" as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <ScrollView
        className="flex-1 bg-black"
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
        <PersonalizedGreeting />
        
        <QntmBalance />
        
        <DailyCheckIn
          isClaimDay={isClaimDay}
          loadingDay={loadingDay}
          onClaim={handleClaimDaily}
        />
        
        {/* TODO: Add HomeCarousel component */}
        
        <SolveToEarnCard onPress={handleSolveToEarn} />

        {/* Quick Actions */}
        <View className="mx-4 mt-6">
          <Text style={styles.sectionTitle}>Explore</Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.push("/leaderboard" as never)}
              className="flex-1"
            >
              <Card className="border-[#222] bg-[#111]">
                <CardContent className="p-4 items-center gap-2">
                  <View className="w-12 h-12 rounded-2xl bg-yellow-500/10 items-center justify-center">
                    <Ionicons name="trophy" size={24} color="#eab308" />
                  </View>
                  <Text style={styles.actionLabel}>Leaderboard</Text>
                </CardContent>
              </Card>
            </Pressable>
            <Pressable
              onPress={() => router.push("/trade" as never)}
              className="flex-1"
            >
              <Card className="border-[#222] bg-[#111]">
                <CardContent className="p-4 items-center gap-2">
                  <View className="w-12 h-12 rounded-2xl bg-blue-500/10 items-center justify-center">
                    <Ionicons name="rocket" size={24} color="#3b82f6" />
                  </View>
                  <Text style={styles.actionLabel}>RocketStart</Text>
                </CardContent>
              </Card>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
});
