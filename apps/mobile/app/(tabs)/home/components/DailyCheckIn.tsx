import React, { useState, useEffect } from "react";
import { View, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { useGameContext } from "~/contexts/GameContext";

interface DailyCheckInProps {
  isClaimDay: boolean;
  loadingDay: boolean;
  onClaim: () => Promise<void>;
}

// Calculate time until next midnight UTC
function calculateRemainingTime() {
  const now = new Date();
  const tomorrowMidnightUTC = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
  const diffMs = tomorrowMidnightUTC.getTime() - now.getTime();

  if (diffMs <= 0) return "00h 00m";

  const hours = String(Math.floor((diffMs / 1000 / 60 / 60) % 24)).padStart(
    2,
    "0"
  );
  const minutes = String(Math.floor((diffMs / 1000 / 60) % 60)).padStart(
    2,
    "0"
  );
  return `${hours}h ${minutes}m`;
}

export function DailyCheckIn({
  isClaimDay,
  loadingDay,
  onClaim,
}: DailyCheckInProps) {
  const { daily } = useGameContext();
  const [remainingTime, setRemainingTime] = useState(calculateRemainingTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(calculateRemainingTime());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="mx-4 mt-6 border-[#222] bg-[#111]">
      <CardContent className="p-4 flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-3 flex-1">
          {/* Fire Icon */}
          <View className="w-10 h-10 items-center justify-center">
            <Text className="text-3xl">🔥</Text>
          </View>

          <View className="flex-1">
            <Text style={styles.streakText}>{daily} Day Streak</Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              <Text style={styles.nextRewardLabel}>Next reward:</Text>
              <Text style={styles.timer}>{remainingTime}</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={onClaim}
          disabled={isClaimDay || loadingDay}
          style={[
            styles.claimButton,
            isClaimDay ? styles.claimButtonDisabled : styles.claimButtonActive,
          ]}
        >
          {loadingDay ? (
            <ActivityIndicator size="small" color={isClaimDay ? "#6B7280" : "#000"} />
          ) : isClaimDay ? (
            <View className="flex-row items-center gap-1.5">
              <Text style={styles.doneText}>Done</Text>
              <Text className="text-green-500">✓</Text>
            </View>
          ) : (
            <Text style={styles.claimText}>Claim</Text>
          )}
        </Pressable>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  streakText: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  nextRewardLabel: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  timer: {
    fontSize: 12,
    fontFamily: "Onest_500Medium",
    color: "#fb923c",
  },
  claimButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  claimButtonActive: {
    backgroundColor: "#fff",
  },
  claimButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  claimText: {
    fontSize: 12,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  doneText: {
    fontSize: 12,
    fontFamily: "Onest_700Bold",
    color: "#6b7280",
  },
});
