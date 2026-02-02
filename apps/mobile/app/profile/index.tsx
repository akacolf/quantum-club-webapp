import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Pressable, Linking, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { useGameContext } from "~/contexts/GameContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

const APP_VERSION = "1.0.0";

interface UserStats {
  totalQntm: number;
  referralCount: number;
  tasksCompleted: number;
  dailyStreak: number;
  walletCreated: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  condition: (stats: UserStats) => boolean;
  howToUnlock: string;
}

const achievements: Achievement[] = [
  {
    id: "first_login",
    name: "Welcome",
    description: "Started your Quantum journey",
    icon: "trophy",
    condition: () => true,
    howToUnlock: "Login to Quantum Club",
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "7 day login streak",
    icon: "flame",
    condition: (stats) => stats.dailyStreak >= 7,
    howToUnlock: "Login for 7 consecutive days",
  },
  {
    id: "streak_30",
    name: "Monthly Master",
    description: "30 day login streak",
    icon: "flame",
    condition: (stats) => stats.dailyStreak >= 30,
    howToUnlock: "Login for 30 consecutive days",
  },
  {
    id: "referral_1",
    name: "Networker",
    description: "Invited your first friend",
    icon: "people",
    condition: (stats) => stats.referralCount >= 1,
    howToUnlock: "Invite 1 friend to Quantum Club",
  },
  {
    id: "referral_10",
    name: "Influencer",
    description: "Invited 10 friends",
    icon: "people",
    condition: (stats) => stats.referralCount >= 10,
    howToUnlock: "Invite 10 friends to Quantum Club",
  },
  {
    id: "tasks_5",
    name: "Task Hunter",
    description: "Completed 5 tasks",
    icon: "checkbox",
    condition: (stats) => stats.tasksCompleted >= 5,
    howToUnlock: "Complete 5 tasks in the Earn section",
  },
  {
    id: "wallet_created",
    name: "Self Custody",
    description: "Created your first wallet",
    icon: "wallet",
    condition: (stats) => stats.walletCreated,
    howToUnlock: "Create a wallet in the Wallet section",
  },
  {
    id: "qntm_1000",
    name: "Thousandaire",
    description: "Earned 1,000 QNTM",
    icon: "trophy",
    condition: (stats) => stats.totalQntm >= 1000,
    howToUnlock: "Accumulate 1,000 QNTM tokens",
  },
  {
    id: "qntm_10000",
    name: "QNTM Whale",
    description: "Earned 10,000 QNTM",
    icon: "trophy",
    condition: (stats) => stats.totalQntm >= 10000,
    howToUnlock: "Accumulate 10,000 QNTM tokens",
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { telegramId, username, mainQuantAmount, daily } = useGameContext();

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    totalQntm: 0,
    referralCount: 0,
    tasksCompleted: 0,
    dailyStreak: 0,
    walletCreated: false,
  });

  const displayName = username || "Quantum User";

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      // In a real implementation, fetch from API
      const totalQntm = parseFloat(mainQuantAmount) || 0;
      
      setStats({
        totalQntm,
        referralCount: 0, // Would fetch from API
        tasksCompleted: 0, // Would fetch from API
        dailyStreak: daily || 0,
        walletCreated: false, // Would check AsyncStorage
      });
      
      setLoading(false);
    };

    fetchStats();
  }, [mainQuantAmount, daily]);

  const handleCopyId = async () => {
    if (!telegramId) return;
    await Clipboard.setStringAsync(telegramId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unlockedAchievements = achievements.filter((a) => a.condition(stats));
  const lockedAchievements = achievements.filter((a) => !a.condition(stats));

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Error opening link:", error);
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
      >
        {/* Header with Back Button */}
        <View className="flex-row items-center px-4 pt-4 mb-4">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 items-center justify-center mr-3"
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={profileStyles.headerTitle}>Profile</Text>
        </View>

        <View className="p-4 pt-0">
          {/* Profile Header */}
          <View className="items-center mb-6">
            <Avatar className="w-28 h-28 border-2 border-[#222] mb-4">
              <AvatarFallback className="bg-[#111]">
                <Ionicons name="person" size={48} color="#9ca3af" />
              </AvatarFallback>
            </Avatar>

            <Text style={profileStyles.displayName}>{displayName}</Text>

            {/* QC ID */}
            <Pressable
              onPress={handleCopyId}
              className="flex-row items-center gap-2 px-4 py-2 bg-[#111] border border-[#222] rounded-xl"
            >
              <Text style={profileStyles.idLabel}>QC ID:</Text>
              <Text style={profileStyles.idValue}>{telegramId}</Text>
              <Ionicons 
                name={copied ? "checkmark" : "copy-outline"} 
                size={16} 
                color={copied ? "#22c55e" : "#9ca3af"} 
              />
            </Pressable>
          </View>

          {/* Stats Grid */}
          <View className="flex-row flex-wrap gap-3 mb-6">
            <View className="flex-1 min-w-[45%]">
              <Card className="bg-[#111] border-[#222]">
                <CardContent className="p-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Ionicons name="wallet-outline" size={16} color="#9ca3af" />
                    <Text style={profileStyles.statLabel}>Total QNTM</Text>
                  </View>
                  <Text style={profileStyles.statValue}>{mainQuantAmount || "0"}</Text>
                </CardContent>
              </Card>
            </View>
            <View className="flex-1 min-w-[45%]">
              <Card className="bg-[#111] border-[#222]">
                <CardContent className="p-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Ionicons name="people-outline" size={16} color="#9ca3af" />
                    <Text style={profileStyles.statLabel}>Referrals</Text>
                  </View>
                  <Text style={profileStyles.statValue}>{stats.referralCount}</Text>
                </CardContent>
              </Card>
            </View>
            <View className="flex-1 min-w-[45%]">
              <Card className="bg-[#111] border-[#222]">
                <CardContent className="p-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Ionicons name="checkbox-outline" size={16} color="#9ca3af" />
                    <Text style={profileStyles.statLabel}>Tasks Done</Text>
                  </View>
                  <Text style={profileStyles.statValue}>{stats.tasksCompleted}</Text>
                </CardContent>
              </Card>
            </View>
            <View className="flex-1 min-w-[45%]">
              <Card className="bg-[#111] border-[#222]">
                <CardContent className="p-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Ionicons name="flame-outline" size={16} color="#9ca3af" />
                    <Text style={profileStyles.statLabel}>Daily Streak</Text>
                  </View>
                  <Text style={profileStyles.statValue}>
                    {stats.dailyStreak} day{stats.dailyStreak !== 1 ? "s" : ""}
                  </Text>
                </CardContent>
              </Card>
            </View>
          </View>

          {/* Achievements Section */}
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-4">
              <Ionicons name="trophy" size={20} color="#eab308" />
              <Text style={profileStyles.sectionTitle}>Achievements</Text>
              <Text style={profileStyles.achievementCount}>
                ({unlockedAchievements.length}/{achievements.length})
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-3">
              {/* Unlocked Achievements */}
              {unlockedAchievements.map((achievement) => (
                <View
                  key={achievement.id}
                  className="w-[30%] bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 items-center"
                >
                  <Ionicons name={achievement.icon} size={24} color="#eab308" />
                  <Text style={profileStyles.achievementName}>{achievement.name}</Text>
                </View>
              ))}

              {/* Locked Achievements */}
              {lockedAchievements.map((achievement) => (
                <View
                  key={achievement.id}
                  className="w-[30%] bg-[#111] border border-[#222] rounded-xl p-3 items-center opacity-60"
                >
                  <Ionicons name="lock-closed" size={24} color="#9ca3af" />
                  <Text style={profileStyles.lockedAchievementName}>{achievement.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Legal Links */}
          <View className="mb-4">
            <Card className="bg-[#111] border-[#222] overflow-hidden">
              <CardContent className="p-0">
                <Pressable
                  onPress={() => handleOpenLink("https://quantumclub.ai/terms")}
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-blue-500/10 rounded-full items-center justify-center">
                      <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
                    </View>
                    <View>
                      <Text style={profileStyles.linkTitle}>Terms of Service</Text>
                      <Text style={profileStyles.linkSubtitle}>
                        Read our terms and conditions
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="open-outline" size={20} color="#9ca3af" />
                </Pressable>

                <View className="border-t border-[#222]" />

                <Pressable
                  onPress={() => handleOpenLink("https://quantumclub.ai/privacy")}
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-purple-500/10 rounded-full items-center justify-center">
                      <Ionicons name="shield-checkmark-outline" size={20} color="#a855f7" />
                    </View>
                    <View>
                      <Text style={profileStyles.linkTitle}>Privacy Policy</Text>
                      <Text style={profileStyles.linkSubtitle}>
                        How we handle your data
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="open-outline" size={20} color="#9ca3af" />
                </Pressable>
              </CardContent>
            </Card>
          </View>

          {/* Support & Community */}
          <View className="mb-6">
            <Card className="bg-[#111] border-[#222] overflow-hidden">
              <CardContent className="p-0">
                <Pressable
                  onPress={() => handleOpenLink("https://t.me/QCSupportBot")}
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-white/5 rounded-full items-center justify-center">
                      <Ionicons name="headset-outline" size={20} color="#fff" />
                    </View>
                    <View>
                      <Text style={profileStyles.linkTitle}>Get Support</Text>
                      <Text style={profileStyles.linkSubtitle}>
                        Contact our support team
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="open-outline" size={20} color="#9ca3af" />
                </Pressable>

                <View className="border-t border-[#222]" />

                <Pressable
                  onPress={() => handleOpenLink("https://t.me/quantumclubinc")}
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-cyan-500/10 rounded-full items-center justify-center">
                      <Ionicons name="people-outline" size={20} color="#06b6d4" />
                    </View>
                    <View>
                      <Text style={profileStyles.linkTitle}>Community</Text>
                      <Text style={profileStyles.linkSubtitle}>
                        Join announcements & updates
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="open-outline" size={20} color="#9ca3af" />
                </Pressable>
              </CardContent>
            </Card>
          </View>

          {/* App Version */}
          <View className="items-center">
            <Text style={profileStyles.version}>Quantum Club v{APP_VERSION}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const profileStyles = StyleSheet.create({
  headerTitle: {
    fontSize: 20,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  displayName: {
    fontSize: 24,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    marginBottom: 8,
  },
  idLabel: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  idValue: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#fff",
  },
  statLabel: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  achievementCount: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  achievementName: {
    fontSize: 12,
    fontFamily: "Onest_500Medium",
    color: "#fff",
    textAlign: "center",
    marginTop: 8,
  },
  lockedAchievementName: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
  },
  linkTitle: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#fff",
  },
  linkSubtitle: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  version: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
  },
});
