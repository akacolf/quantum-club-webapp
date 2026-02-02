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

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  type: "p2p" | "group";
  participants: string[];
  participantNames: string[];
  groupName?: string;
  lastMessage?: Message;
}

// Format time helper
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } else if (days === 1) {
    return "Yesterday";
  } else if (days < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

// Chat Item Component
function ChatItem({
  chat,
  telegramId,
  onPress,
}: {
  chat: Chat;
  telegramId: string;
  onPress: () => void;
}) {
  const participantName =
    chat.type === "group"
      ? chat.groupName || "Group"
      : chat.participantNames.find((_, i) => chat.participants[i] !== telegramId) || "Unknown";

  const isOwnMessage = chat.lastMessage?.senderId === telegramId;

  return (
    <Pressable onPress={onPress}>
      <Card className="bg-[#111] border-[#222] mb-2">
        <CardContent className="p-4 flex-row items-center gap-3">
          <Avatar className="w-12 h-12 border border-[#222]">
            {chat.type === "group" ? (
              <AvatarFallback className="bg-[#1a1a1a]">
                <Ionicons name="people" size={20} color="#9ca3af" />
              </AvatarFallback>
            ) : (
              <>
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${participantName}`}
                />
                <AvatarFallback className="bg-[#1a1a1a]">
                  <Text style={styles.avatarText}>
                    {participantName.charAt(0).toUpperCase()}
                  </Text>
                </AvatarFallback>
              </>
            )}
          </Avatar>

          <View className="flex-1">
            <View className="flex-row items-baseline justify-between">
              <Text style={styles.chatName} numberOfLines={1}>
                {participantName}
              </Text>
              {chat.lastMessage && (
                <Text style={styles.timestamp}>
                  {formatTime(chat.lastMessage.timestamp)}
                </Text>
              )}
            </View>

            {chat.lastMessage && (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {isOwnMessage && "You: "}
                {chat.lastMessage.text}
              </Text>
            )}
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { telegramId } = useGameContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);

  const fetchChats = useCallback(async () => {
    try {
      // In a real implementation, fetch chats from Firebase
      // For now, show empty state
      setChats([]);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChats();
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
          <View className="flex-row items-center gap-3 mb-2">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
            <View>
              <Text style={styles.header}>Messages</Text>
              <Text style={styles.subheader}>Chat with your community</Text>
            </View>
          </View>

          {/* Chats List */}
          {chats.length === 0 ? (
            <View className="items-center justify-center py-16">
              <View className="w-16 h-16 rounded-full bg-white/5 items-center justify-center mb-4">
                <Ionicons name="chatbubble-ellipses-outline" size={32} color="#6b7280" />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Start a chat from a group member's profile
              </Text>
            </View>
          ) : (
            <View className="mt-4">
              {chats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  telegramId={telegramId || ""}
                  onPress={() => router.push(`/chat/${chat.id}` as never)}
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
  avatarText: {
    fontSize: 16,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  chatName: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
    maxWidth: "70%",
  },
  timestamp: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
    marginTop: 2,
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
});
