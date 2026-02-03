import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "~/components/ui/text";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { useGameContext } from "~/contexts/GameContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export function PersonalizedGreeting() {
  const { username } = useGameContext();
  const router = useRouter();

  const displayName = username || "Quantum User";

  return (
    <Pressable
      onPress={() => router.push("/profile" as never)}
      className="mx-4 mt-4 mb-2"
    >
      <View className="relative overflow-hidden rounded-3xl border border-[#222] bg-[#111] p-4" style={{ borderRadius: 20, borderCurve: 'continuous' }}>
        <View className="flex-row items-center justify-between gap-3">
          {/* Left: Avatar & Info */}
          <View className="flex-row items-center gap-3 flex-1">
            <Avatar size="md" className="border border-[#333]">
              <AvatarFallback className="bg-zinc-800">
                <Ionicons name="person" size={20} color="#71717A" />
              </AvatarFallback>
            </Avatar>

            {/* Text Info */}
            <View className="flex-1">
              <Text style={{ fontFamily: "Onest_600SemiBold" }} className="text-base">
                <Text className="text-white">Hi, </Text>
                <Text className="text-orange-400">{displayName}</Text>
              </Text>
            </View>
          </View>

          {/* Right: Action Icon */}
          <View className="w-8 h-8 rounded-full bg-white/5 items-center justify-center">
            <Ionicons name="chevron-forward" size={20} color="#71717A" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
