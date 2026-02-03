import React from "react";
import { View, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeInDown,
} from "react-native-reanimated";

export interface EarnTask {
  id: string;
  description: string;
  platform: string; // Emoji or icon identifier
  category: "Limited" | "In-app" | "Partners";
  buttonText: string;
  quant: number;
  completed: boolean;
  url?: string;
}

interface TaskCardProps {
  task: EarnTask;
  onPress: (task: EarnTask) => void;
  isLoading?: boolean;
  index?: number;
}

// Platform icon mapping
function PlatformIcon({ platform }: { platform: string }) {
  const icons: Record<string, string> = {
    telegram: "📱",
    twitter: "🐦",
    wallet: "👛",
    referral: "👥",
    solve: "🧠",
    check: "✅",
    default: "📋",
  };

  return <Text className="text-2xl">{icons[platform] || icons.default}</Text>;
}

export function TaskCard({ task, onPress, isLoading, index = 0 }: TaskCardProps) {
  const isDisabled = task.completed || isLoading;
  const buttonScale = useSharedValue(1);

  const handlePress = () => {
    buttonScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );
    onPress(task);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 100)}>
      <Card
        className={`border-[#222] bg-[#111] ${
          task.completed ? "opacity-60" : ""
        }`}
      >
        <CardContent className="p-4 flex-row items-center gap-4">
          {/* Icon */}
          <View className="w-12 h-12 rounded-xl bg-[#1a1a1a] items-center justify-center border border-[#222]">
            <PlatformIcon platform={task.platform} />
          </View>

          {/* Content */}
          <View className="flex-1">
            <Text style={styles.taskTitle} numberOfLines={1}>
              {task.description}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-1">
              <Badge
                variant="outline"
                className="bg-yellow-500/10 border-yellow-500/20 px-2 py-0"
              >
                <Text style={styles.rewardText}>+{task.quant} QNTM</Text>
              </Badge>
            </View>
          </View>

          {/* Action Button */}
          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              onPress={handlePress}
              disabled={isDisabled}
              style={[
                styles.actionButton,
                task.completed ? styles.actionButtonDone : styles.actionButtonActive,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : task.completed ? (
                <View className="flex-row items-center gap-1">
                  <Text className="text-green-500">✓</Text>
                  <Text style={styles.doneText}>Done</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>{task.buttonText}</Text>
              )}
            </Pressable>
          </Animated.View>
        </CardContent>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  taskTitle: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#fff",
  },
  rewardText: {
    fontSize: 10,
    fontFamily: "Onest_700Bold",
    color: "#eab308",
  },
  actionButton: {
    height: 36,
    paddingHorizontal: 16,
    minWidth: 80,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonActive: {
    backgroundColor: "#fff",
  },
  actionButtonDone: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  buttonText: {
    fontSize: 12,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  doneText: {
    fontSize: 12,
    fontFamily: "Onest_700Bold",
    color: "rgba(255,255,255,0.2)",
  },
});
