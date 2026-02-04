import React, { useState, useEffect } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { useRouter } from "expo-router";
import { Icon } from '@/components/icons';
import Animated, { FadeInDown } from "react-native-reanimated";
import { Loader } from "~/components/Loader";

interface RewardHistoryItem {
  id: string;
  title: string;
  type: "task" | "daily_check_in" | "referral" | "other";
  amount: number;
  date: string; // ISO string
  platform?: "telegram" | "twitter" | "youtube" | "instagram" | "tiktok";
}

// Mock Data matching web structure
const MOCK_HISTORY: RewardHistoryItem[] = [
  {
    id: "1",
    title: "Daily Check-in",
    type: "daily_check_in",
    amount: 100,
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: "2",
    title: "Join Telegram Channel",
    type: "task",
    amount: 500,
    platform: "telegram",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: "3",
    title: "Daily Check-in",
    type: "daily_check_in",
    amount: 50,
    date: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // 1 day 2h ago
  },
  {
    id: "4",
    title: "Follow on Twitter",
    type: "task",
    amount: 500,
    platform: "twitter",
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
  },
  {
    id: "5",
    title: "Referral Bonus",
    type: "referral",
    amount: 1000,
    date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
  },
];

function getIconForType(item: RewardHistoryItem) {
  if (item.type === "daily_check_in") {
    return <Icon name="solar:fire-bold" size={24} color="#fb923c" />;
  }
  if (item.type === "referral") {
    return <Icon name="solar:users-group-rounded-bold" size={24} color="#a855f7" />;
  }
  if (item.type === "task") {
    switch (item.platform) {
      case "telegram":
        return <Icon name="mdi:telegram" size={24} color="#3b82f6" />;
      case "twitter":
        return <Icon name="mdi:twitter" size={24} color="#0ea5e9" />;
      case "youtube":
        return <Icon name="mdi:youtube" size={24} color="#ef4444" />;
      case "instagram":
        return <Icon name="mdi:instagram" size={24} color="#ec4899" />;
      default:
        return <Icon name="solar:check-square-bold" size={24} color="#22c55e" />;
    }
  }
  return <Icon name="solar:gift-bold" size={24} color="#eab308" />;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours < 24) {
    if (diffHours < 1) return "Just now";
    return `${Math.floor(diffHours)}h ago`;
  }
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function RewardsHistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<RewardHistoryItem[]>([]);

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setHistory(MOCK_HISTORY);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <View className="flex-row items-center px-4 py-4 border-b border-[#222]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/5 items-center justify-center mr-3"
        >
          <Icon name="solar:arrow-left-linear" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Rewards history</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Loader fullScreen={false} />
        </View>
      ) : (
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          {history.length === 0 ? (
            <View className="items-center justify-center py-20 opacity-50">
              <Icon name="solar:clock-circle-linear" size={48} color="#fff" />
              <Text className="text-white mt-4 font-onest-medium">No rewards history yet</Text>
            </View>
          ) : (
            history.map((item, index) => (
              <Animated.View 
                key={item.id}
                entering={FadeInDown.delay(index * 100).duration(400)}
                className="mb-3"
              >
                <Card className="bg-[#111] border-[#222]">
                  <CardContent className="p-4 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
                        {getIconForType(item)}
                      </View>
                      <View>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
                      </View>
                    </View>
                    
                    <View className="px-3 py-1 bg-green-500/10 rounded-lg border border-green-500/20">
                      <Text style={styles.amountText}>+{item.amount} QNTM</Text>
                    </View>
                  </CardContent>
                </Card>
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 20,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  itemDate: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    marginTop: 2,
  },
  amountText: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#22c55e",
  },
});
