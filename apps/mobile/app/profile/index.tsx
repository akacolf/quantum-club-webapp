import React, { useState, useEffect } from "react";
import { View, ScrollView, Pressable, Linking, ActivityIndicator, StyleSheet, Modal, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { useGameContext } from "~/contexts/GameContext";
import { useRouter } from "expo-router";
import { Icon } from '@/components/icons';
import * as Clipboard from "expo-clipboard";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  FadeIn,
  FadeInUp
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

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
  howToUnlock: string;
  icon: string;
  condition: (stats: UserStats) => boolean;
}

const achievements: Achievement[] = [
    {
        id: "first_qntm",
        name: "First Steps",
        description: "You've earned your first QNTM tokens!",
        howToUnlock: "Earn at least 1 QNTM from any activity",
        icon: "solar:bolt-bold",
        condition: (stats) => stats.totalQntm > 0,
    },
    {
        id: "qntm_1k",
        name: "Getting Started",
        description: "You've accumulated 1,000 QNTM tokens!",
        howToUnlock: "Earn a total of 1,000 QNTM",
        icon: "solar:star-bold",
        condition: (stats) => stats.totalQntm >= 1000,
    },
    {
        id: "qntm_10k",
        name: "Rising Star",
        description: "Impressive! You've reached 10,000 QNTM!",
        howToUnlock: "Earn a total of 10,000 QNTM",
        icon: "solar:rocket-bold",
        condition: (stats) => stats.totalQntm >= 10000,
    },
    {
        id: "qntm_100k",
        name: "Quantum Master",
        description: "You're a true Quantum master with 100,000 QNTM!",
        howToUnlock: "Earn a total of 100,000 QNTM",
        icon: "solar:crown-bold",
        condition: (stats) => stats.totalQntm >= 100000,
    },
    {
        id: "first_referral",
        name: "Networker",
        description: "You've invited your first friend to Quantum Club!",
        howToUnlock: "Invite 1 friend using your referral link",
        icon: "solar:users-group-rounded-bold",
        condition: (stats) => stats.referralCount >= 1,
    },
    {
        id: "referrals_5",
        name: "Team Builder",
        description: "Your network is growing! 5 friends joined through you.",
        howToUnlock: "Invite 5 friends using your referral link",
        icon: "solar:target-bold",
        condition: (stats) => stats.referralCount >= 5,
    },
    {
        id: "referrals_10",
        name: "Community Leader",
        description: "You're building a community! 10 friends and counting.",
        howToUnlock: "Invite 10 friends using your referral link",
        icon: "solar:medal-ribbons-star-bold",
        condition: (stats) => stats.referralCount >= 10,
    },
    {
        id: "first_task",
        name: "Task Hunter",
        description: "You've completed your first task!",
        howToUnlock: "Complete any task in the Earn section",
        icon: "solar:diploma-verified-bold",
        condition: (stats) => stats.tasksCompleted >= 1,
    },
    {
        id: "tasks_10",
        name: "Dedicated Player",
        description: "You're dedicated! 10 tasks completed.",
        howToUnlock: "Complete 10 tasks in the Earn section",
        icon: "solar:cup-star-bold",
        condition: (stats) => stats.tasksCompleted >= 10,
    },
    {
        id: "streak_7",
        name: "Consistent",
        description: "You've maintained a 7-day daily login streak!",
        howToUnlock: "Log in for 7 consecutive days",
        icon: "solar:fire-bold",
        condition: (stats) => stats.dailyStreak >= 7,
    },
    {
        id: "wallet_created",
        name: "Wallet Ready",
        description: "Your QC Wallet is set up and ready to use!",
        howToUnlock: "Create your QC Wallet in the Wallet section",
        icon: "solar:wallet-bold",
        condition: (stats) => stats.walletCreated,
    },
];

function AchievementIcon({ id, isUnlocked, size = 24 }: { id: string; isUnlocked: boolean; size?: number }) {
  const color = isUnlocked ? "#eab308" : "#9ca3af";

  if (!isUnlocked) {
    return <Icon name="solar:lock-keyhole-bold" size={size} color={color} />;
  }

  switch (id) {
    case "first_qntm":
      return <Icon name="solar:bolt-bold" size={size} color={color} />;
    case "qntm_1k":
      return <Icon name="solar:star-bold" size={size} color={color} />;
    case "qntm_10k":
      return <Icon name="solar:rocket-bold" size={size} color={color} />;
    case "qntm_100k":
      return <Icon name="solar:crown-bold" size={size} color={color} />;
    case "first_referral":
      return <Icon name="solar:users-group-rounded-bold" size={size} color={color} />;
    case "referrals_5":
      return <Icon name="solar:target-bold" size={size} color={color} />;
    case "referrals_10":
      return <Icon name="solar:medal-ribbons-star-bold" size={size} color={color} />;
    case "first_task":
      return <Icon name="solar:diploma-verified-bold" size={size} color={color} />;
    case "tasks_10":
      return <Icon name="solar:cup-star-bold" size={size} color={color} />;
    case "streak_7":
      return <Icon name="solar:fire-bold" size={size} color={color} />;
    case "wallet_created":
      return <Icon name="solar:wallet-bold" size={size} color={color} />;
    default:
      return <Icon name="solar:star-bold" size={size} color={color} />;
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const { telegramId, username, mainQuantAmount, daily } = useGameContext();

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
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
            <Icon name="solar:alt-arrow-left-linear" size={24} color="#fff" />
          </Pressable>
          <Text style={profileStyles.headerTitle}>Profile</Text>
        </View>

        <View className="p-4 pt-0">
          {/* Profile Header */}
          <View className="items-center mb-6">
            <Avatar className="w-28 h-28 border-2 border-[#222] mb-4">
              <AvatarFallback className="bg-[#111]">
                <Icon name="solar:user-bold" size={48} color="#9ca3af" />
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
              <Icon 
                name={copied ? "solar:check-circle-bold" : "solar:copy-linear"} 
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
                    <Icon name="solar:wallet-linear" size={16} color="#9ca3af" />
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
                    <Icon name="solar:users-group-rounded-linear" size={16} color="#9ca3af" />
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
                    <Icon name="solar:check-square-linear" size={16} color="#9ca3af" />
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
                    <Icon name="solar:fire-linear" size={16} color="#9ca3af" />
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
              <Icon name="solar:cup-star-bold" size={20} color="#eab308" />
              <Text style={profileStyles.sectionTitle}>Achievements</Text>
              <Text style={profileStyles.achievementCount}>
                ({achievements.filter(a => a.condition(stats)).length}/{achievements.length})
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-3">
              {achievements.map((achievement) => {
                const isUnlocked = achievement.condition(stats);
                return (
                  <Pressable
                    key={achievement.id}
                    onPress={() => setSelectedAchievement(achievement)}
                    style={[
                      profileStyles.achievementCard,
                      isUnlocked 
                        ? { backgroundColor: "rgba(234, 179, 8, 0.1)", borderColor: "rgba(234, 179, 8, 0.3)" }
                        : { backgroundColor: "#111", borderColor: "#222", opacity: 0.6 }
                    ]}
                  >
                    <AchievementIcon id={achievement.id} isUnlocked={isUnlocked} size={24} />
                    <Text style={isUnlocked ? profileStyles.achievementName : profileStyles.lockedAchievementName} numberOfLines={2}>
                      {achievement.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Legal Links */}
          <View className="mb-4">
            <Card className="bg-[#111] border-[#222] overflow-hidden">
              <CardContent className="p-0">
                <Pressable
                  onPress={() => router.push("/legal/terms" as never)}
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-blue-500/10 rounded-full items-center justify-center">
                      <Icon name="solar:document-text-linear" size={20} color="#3b82f6" />
                    </View>
                    <View>
                      <Text style={profileStyles.linkTitle}>Terms of Service</Text>
                      <Text style={profileStyles.linkSubtitle}>
                        Read our terms and conditions
                      </Text>
                    </View>
                  </View>
                  <Icon name="solar:alt-arrow-right-linear" size={20} color="#9ca3af" />
                </Pressable>

                <View className="border-t border-[#222]" />

                <Pressable
                  onPress={() => router.push("/legal/privacy" as never)}
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-purple-500/10 rounded-full items-center justify-center">
                      <Icon name="solar:shield-check-linear" size={20} color="#a855f7" />
                    </View>
                    <View>
                      <Text style={profileStyles.linkTitle}>Privacy Policy</Text>
                      <Text style={profileStyles.linkSubtitle}>
                        How we handle your data
                      </Text>
                    </View>
                  </View>
                  <Icon name="solar:alt-arrow-right-linear" size={20} color="#9ca3af" />
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
                      <Icon name="solar:headset-linear" size={20} color="#fff" />
                    </View>
                    <View>
                      <Text style={profileStyles.linkTitle}>Get Support</Text>
                      <Text style={profileStyles.linkSubtitle}>
                        Contact our support team
                      </Text>
                    </View>
                  </View>
                  <Icon name="solar:link-circle-linear" size={20} color="#9ca3af" />
                </Pressable>

                <View className="border-t border-[#222]" />

                <Pressable
                  onPress={() => handleOpenLink("https://t.me/quantumclubinc")}
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-cyan-500/10 rounded-full items-center justify-center">
                      <Icon name="solar:users-group-rounded-linear" size={20} color="#06b6d4" />
                    </View>
                    <View>
                      <Text style={profileStyles.linkTitle}>Community</Text>
                      <Text style={profileStyles.linkSubtitle}>
                        Join announcements & updates
                      </Text>
                    </View>
                  </View>
                  <Icon name="solar:link-circle-linear" size={20} color="#9ca3af" />
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

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <AchievementModal
          achievement={selectedAchievement}
          isUnlocked={selectedAchievement.condition(stats)}
          onClose={() => setSelectedAchievement(null)}
        />
      )}
    </SafeAreaView>
  );
}

function AchievementModal({ 
  achievement, 
  isUnlocked, 
  onClose 
}: { 
  achievement: Achievement; 
  isUnlocked: boolean;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <Animated.View 
            entering={FadeInUp.springify()} 
            style={{ width: "100%", maxWidth: 320 }}
          >
            <Card className="bg-[#111] border-[#333]">
              <CardContent className="p-6 items-center">
                <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${isUnlocked ? "bg-yellow-500/10" : "bg-zinc-800"}`}>
                  <AchievementIcon id={achievement.id} isUnlocked={isUnlocked} size={40} />
                </View>
                
                <Text style={profileStyles.modalTitle}>{achievement.name}</Text>
                <Text style={profileStyles.modalDescription}>{achievement.description}</Text>
                
                <View className="w-full h-px bg-[#333] my-4" />
                
                <View className="items-center">
                  <Text style={profileStyles.modalSubtitle}>How to unlock:</Text>
                  <Text style={profileStyles.modalInstruction}>{achievement.howToUnlock}</Text>
                </View>
                
                <Pressable
                  onPress={onClose}
                  className="mt-6 px-6 py-2 bg-white rounded-full"
                >
                  <Text style={profileStyles.closeButtonText}>Close</Text>
                </Pressable>
              </CardContent>
            </Card>
          </Animated.View>
        </View>
      </View>
    </Modal>
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
  achievementCard: {
    width: "30%", 
    aspectRatio: 1, 
    borderRadius: 12, 
    borderWidth: 1, 
    padding: 8, 
    alignItems: "center", 
    justifyContent: "center",
  },
  achievementName: {
    fontSize: 10,
    fontFamily: "Onest_500Medium",
    color: "#fff",
    textAlign: "center",
    marginTop: 8,
  },
  lockedAchievementName: {
    fontSize: 10,
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
  modalTitle: {
    fontSize: 20,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#ccc",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: "Onest_700Bold",
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  modalInstruction: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#fff",
    textAlign: "center",
  },
  closeButtonText: {
    fontSize: 14,
    fontFamily: "Onest_600SemiBold",
    color: "#000",
  },
});
