import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { useGameContext } from "~/contexts/GameContext";
import Animated, {
  FadeInLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";

interface SolveToEarnCardProps {
  onPress: () => void;
}

export function SolveToEarnCard({ onPress }: SolveToEarnCardProps) {
  const { remainingSolveToEarn } = useGameContext();
  const buttonScale = useSharedValue(1);

  const handlePress = () => {
    buttonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );
    onPress();
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <Animated.View entering={FadeInLeft.duration(500).delay(400)}>
      <Card className="mx-4 mt-6 border-[#222] bg-[#111]">
        <CardContent className="p-4 flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-3 flex-1">
            {/* 100 Icon */}
            <View className="w-10 h-10 items-center justify-center">
              <Text className="text-3xl">💯</Text>
            </View>

            <View className="flex-1">
              <Text style={styles.title}>Solve & Earn</Text>
              <Text style={styles.subtitle}>
                {remainingSolveToEarn} passes available
              </Text>
            </View>
          </View>

          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              onPress={handlePress}
              disabled={remainingSolveToEarn === 0}
              style={[
                styles.solveButton,
                remainingSolveToEarn > 0 ? styles.solveButtonActive : styles.solveButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.solveText,
                  remainingSolveToEarn === 0 && styles.solveTextDisabled,
                ]}
              >
                Solve
              </Text>
            </Pressable>
          </Animated.View>
        </CardContent>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#d1d5db",
    marginTop: 2,
  },
  solveButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  solveButtonActive: {
    backgroundColor: "#fff",
  },
  solveButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  solveText: {
    fontSize: 12,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  solveTextDisabled: {
    color: "rgba(255,255,255,0.2)",
  },
});
