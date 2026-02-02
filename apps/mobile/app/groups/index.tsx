import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { useGameContext } from "~/contexts/GameContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface Group {
  id: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  createdBy: string;
}

// Group Item Component
function GroupItem({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card className="bg-[#111] border-[#222] mb-3">
        <CardContent className="p-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Avatar className="w-12 h-12 border border-[#222]">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${group.name}`}
              />
              <AvatarFallback className="bg-[#1a1a1a]">
                <Text style={styles.avatarText}>
                  {group.name.charAt(0).toUpperCase()}
                </Text>
              </AvatarFallback>
            </Avatar>
            <View>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.memberCount}>
                {group.memberCount} / {group.maxMembers} members
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </CardContent>
      </Card>
    </Pressable>
  );
}

export default function GroupsScreen() {
  const router = useRouter();
  const { telegramId } = useGameContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  const fetchGroups = useCallback(async () => {
    try {
      // In a real implementation, fetch groups from Firebase
      // For now, show empty state
      setGroups([]);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
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
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </Pressable>
              <View>
                <Text style={styles.header}>Groups</Text>
                <Text style={styles.subheader}>Connect with your community</Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push("/groups/create" as never)}
              className="h-10 px-4 rounded-xl bg-white flex-row items-center gap-2"
            >
              <Ionicons name="add" size={18} color="#000" />
              <Text style={styles.createButtonText}>Create</Text>
            </Pressable>
          </View>

          {/* Groups List */}
          {groups.length === 0 ? (
            <View className="items-center justify-center py-16">
              <View className="w-16 h-16 rounded-full bg-white/5 items-center justify-center mb-4">
                <Ionicons name="people-outline" size={32} color="#6b7280" />
              </View>
              <Text style={styles.emptyTitle}>No groups yet</Text>
              <Text style={styles.emptySubtitle}>
                You haven't joined any groups yet
              </Text>
              <Pressable
                onPress={() => router.push("/groups/create" as never)}
                className="mt-4 h-10 px-6 rounded-xl bg-white/10 border border-[#222] items-center justify-center"
              >
                <Text style={styles.createFirstText}>Create your first group</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              {groups.map((group) => (
                <GroupItem
                  key={group.id}
                  group={group}
                  onPress={() => router.push(`/groups/${group.id}` as never)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  subheader: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
  },
  createButtonText: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  groupName: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  memberCount: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#9ca3af",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    textAlign: "center",
  },
  createFirstText: {
    fontSize: 14,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
});
