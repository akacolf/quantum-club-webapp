import { View, ScrollView, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Send, ArrowDownLeft, RefreshCw, TrendingUp, Wallet, ChevronRight, Settings, History, Eye, EyeOff, LucideIcon, Store } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTheme } from "~/lib/theme";

const TON_ICON = "https://ton.org/download/ton_symbol.svg";

export default function WalletHome() {
  const router = useRouter();
  const [hideBalance, setHideBalance] = useState(false);
  const { isDark } = useTheme();
  const iconColor = isDark ? "#fff" : "#1f2937";

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-primary justify-center items-center mr-3">
            <Text className="text-lg">💎</Text>
          </View>
          <Text className="text-lg font-bold text-foreground">Quantum Club</Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity 
            className="w-10 h-10 rounded-full bg-muted justify-center items-center"
            onPress={() => router.push("/(wallet)/history")}
          >
            <History size={20} color={iconColor} />
          </TouchableOpacity>
          <TouchableOpacity 
            className="w-10 h-10 rounded-full bg-muted justify-center items-center"
            onPress={() => router.push("/(wallet)/settings")}
          >
            <Settings size={20} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Balance Card */}
        <Card className="mb-6 bg-card border border-border">
          <CardContent className="p-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm text-muted-foreground">Total Balance</Text>
              <TouchableOpacity onPress={() => setHideBalance(!hideBalance)}>
                {hideBalance ? (
                  <EyeOff size={18} color="#6B7280" />
                ) : (
                  <Eye size={18} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>
            <Text className="text-4xl font-bold text-foreground text-center">
              {hideBalance ? "••••••" : "$0.00"}
            </Text>
            <Text className="text-sm text-muted-foreground text-center mt-1">
              {hideBalance ? "••••" : "≈ 0.00 TON"}
            </Text>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <View className="flex-row justify-around mb-8">
          <ActionButton
            Icon={Send}
            label="Send"
            onPress={() => router.push("/(wallet)/send")}
          />
          <ActionButton
            Icon={ArrowDownLeft}
            label="Receive"
            onPress={() => router.push("/(wallet)/receive")}
          />
          <ActionButton Icon={RefreshCw} label="Swap" onPress={() => router.push("/(wallet)/swap")} />
          <ActionButton Icon={TrendingUp} label="Stake" onPress={() => router.push("/(wallet)/staking")} />
        </View>

        {/* Assets Section */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-foreground">Assets</Text>
            <TouchableOpacity>
              <Text className="text-sm text-primary">Manage</Text>
            </TouchableOpacity>
          </View>
          <Card className="bg-card border border-border">
            <CardContent className="p-8 items-center">
              <Wallet size={48} color="#6B7280" />
              <Text className="text-base font-medium text-foreground mt-4 mb-2">No assets yet</Text>
              <Text className="text-sm text-muted-foreground text-center">
                Connect your wallet or receive tokens to get started
              </Text>
            </CardContent>
          </Card>
        </View>

        {/* Recent Activity */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-foreground">Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push("/(wallet)/history")}>
              <Text className="text-sm text-primary">View all</Text>
            </TouchableOpacity>
          </View>
          <Card className="bg-card border border-border">
            <CardContent className="p-8 items-center">
              <Text className="text-sm text-muted-foreground text-center">
                No transactions yet
              </Text>
            </CardContent>
          </Card>
        </View>

        {/* NFT Marketplace Banner */}
        <TouchableOpacity onPress={() => router.push("/(wallet)/marketplace")}>
          <Card className="mb-6 bg-gradient-to-r from-primary to-primary/80">
            <CardContent className="p-4 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-white/20 justify-center items-center mr-3">
                  <Store size={24} color="#fff" />
                </View>
                <View>
                  <Text className="text-base font-semibold text-foreground">NFT Marketplace</Text>
                  <Text className="text-xs text-muted-foreground">Browse collections</Text>
                </View>
              </View>
              <ChevronRight size={20} color={iconColor} />
            </CardContent>
          </Card>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({
  Icon,
  label,
  onPress,
}: {
  Icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity className="items-center" onPress={onPress}>
      <View className="w-14 h-14 rounded-full bg-primary justify-center items-center mb-2">
        <Icon size={24} color="#0A0B1E" />
      </View>
      <Text className="text-xs text-foreground">{label}</Text>
    </TouchableOpacity>
  );
}
