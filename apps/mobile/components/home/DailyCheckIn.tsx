import React, { useState, useEffect, useRef } from "react";
import { View, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { useGameContext } from "~/contexts/GameContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeInRight,
} from "react-native-reanimated";
import { Icon } from '@/components/icons';
import LottieView from "lottie-react-native";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";

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
  const buttonScale = useSharedValue(1);
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(calculateRemainingTime());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handlePress = async () => {
    // Animate button press
    buttonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );
    await onClaim();
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <Animated.View entering={FadeInRight.duration(500).delay(300)}>
      <Card className="mx-4 mt-6 border-[#222] bg-[#111] overflow-hidden">
        {/* Glow Effect */}
        <View style={{ position: 'absolute', top: -40, right: -40 }} pointerEvents="none">
          <Svg height="128" width="128">
            <Defs>
              <RadialGradient id="orangeGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#fb923c" stopOpacity="0.1" />
                <Stop offset="1" stopColor="#fb923c" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="64" cy="64" r="64" fill="url(#orangeGlow)" />
          </Svg>
        </View>

        <CardContent className="p-4 flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-3 flex-1">
            {/* Fire Animation */}
            <View className="w-12 h-12">
              <LottieView
                ref={lottieRef}
                source={require("~/assets/lottie/fire-lottie.json")}
                autoPlay
                loop
                style={{ width: "100%", height: "100%" }}
              />
            </View>

            <View className="flex-1">
              <Text style={styles.streakText}>{daily} Day Streak</Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Text style={styles.nextRewardLabel}>Next reward:</Text>
                <Text style={styles.timer}>{remainingTime}</Text>
              </View>
            </View>
          </View>

          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              onPress={handlePress}
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
                  <Icon name="solar:check-circle-bold" size={14} color="#22c55e" />
                </View>
              ) : (
                <Text style={styles.claimText}>Claim</Text>
              )}
            </Pressable>
          </Animated.View>
        </CardContent>
      </Card>
    </Animated.View>
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
