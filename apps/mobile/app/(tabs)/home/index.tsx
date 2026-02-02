import React, { useState } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PersonalizedGreeting } from "./components/PersonalizedGreeting";
import { QntmBalance } from "./components/QntmBalance";
import { DailyCheckIn } from "./components/DailyCheckIn";
import { SolveToEarnCard } from "./components/SolveToEarnCard";
import { useGameContext } from "~/contexts/GameContext";
import { claimDailyCheckIn } from "~/lib/api";

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
      </ScrollView>
    </SafeAreaView>
  );
}
