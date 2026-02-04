import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "~/components/ui/text";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { useGameContext } from "~/contexts/GameContext";
import { Icon } from '@/components/icons';
import { useRouter } from "expo-router";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";

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
        {/* Glow Effects */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Top Right Purple Glow */}
          <View style={{ position: 'absolute', top: -40, right: -40 }}>
            <Svg height="128" width="128">
              <Defs>
                <RadialGradient id="purpleGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#a855f7" stopOpacity="0.15" />
                  <Stop offset="1" stopColor="#a855f7" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="64" cy="64" r="64" fill="url(#purpleGlow)" />
            </Svg>
          </View>
          
          {/* Bottom Left Blue Glow */}
          <View style={{ position: 'absolute', bottom: -40, left: -40 }}>
            <Svg height="128" width="128">
              <Defs>
                <RadialGradient id="blueGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#3b82f6" stopOpacity="0.15" />
                  <Stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="64" cy="64" r="64" fill="url(#blueGlow)" />
            </Svg>
          </View>
        </View>

        <View className="flex-row items-center justify-between gap-3">
          {/* Left: Avatar & Info */}
          <View className="flex-row items-center gap-3 flex-1">
            <Avatar size="md" className="border border-[#333]">
              <AvatarFallback className="bg-zinc-800">
                <Icon name="solar:user-bold" size={20} color="#71717A" />
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
            <Icon name="solar:alt-arrow-right-linear" size={20} color="#71717A" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
