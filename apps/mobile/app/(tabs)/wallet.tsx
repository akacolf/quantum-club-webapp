import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, RefreshControl, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useGameContext } from "~/contexts/GameContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle, G, Rect, Defs, ClipPath } from "react-native-svg";
import * as Clipboard from "expo-clipboard";

// Format USD value
const formatUsd = (value: number | string): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return "$0.00";
  return `$${num.toFixed(2)}`;
};

// QNTM Icon
function QntmIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path
        fill="#fff"
        d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667"
      />
    </Svg>
  );
}

// TON Icon
function TonIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#0098EA"
        d="M12 2L2 9.5l10 12.5 10-12.5L12 2zm0 3.5l5.5 4.5-5.5 6.5-5.5-6.5L12 5.5z"
      />
    </Svg>
  );
}

interface ActionButton {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function WalletScreen() {
  const router = useRouter();
  const { mainQuantAmount, telegramId } = useGameContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tonBalance, setTonBalance] = useState("0.00");
  const [tonUsdValue, setTonUsdValue] = useState("0.00");
  const [totalUsdBalance, setTotalUsdBalance] = useState("0.00");
  const [copied, setCopied] = useState(false);

  // Check if user has a wallet
  useEffect(() => {
    const checkWallet = async () => {
      // In a real implementation, check AsyncStorage or API for wallet
      // For now, we'll show the "Create Wallet" flow
      setLoading(false);
      setHasWallet(false);
    };
    checkWallet();
  }, [telegramId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refresh wallet balances
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleHideBalance = () => {
    setHideBalance(!hideBalance);
  };

  const handleCreateWallet = () => {
    router.push("/wallet/create" as never);
  };

  const handleImportWallet = () => {
    router.push("/wallet/import" as never);
  };

  const actionButtons: ActionButton[] = [
    {
      icon: "arrow-up",
      label: "Send",
      onPress: () => router.push("/wallet/send" as never),
      disabled: !hasWallet,
    },
    {
      icon: "arrow-down",
      label: "Receive",
      onPress: () => router.push("/wallet/receive" as never),
      disabled: !hasWallet,
    },
    {
      icon: "time-outline",
      label: "History",
      onPress: () => router.push("/wallet/history" as never),
      disabled: !hasWallet,
    },
    {
      icon: "pie-chart-outline",
      label: "Portfolio",
      onPress: () => router.push("/wallet/analytics" as never),
      disabled: !hasWallet,
    },
  ];

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  // No wallet - show create/import screen
  if (!hasWallet) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="p-4">
            <Text style={walletStyles.header}>Wallet</Text>
            <Text style={walletStyles.subheader}>
              Create or import your self-custody wallet
            </Text>

            {/* QNTM Balance Card (always visible) */}
            <Card className="mb-6 border-orange-500/20 bg-[#111] rounded-2xl">
              <CardContent className="p-4">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 bg-black rounded-full items-center justify-center border border-orange-500/30">
                      <QntmIcon size={28} />
                    </View>
                    <View>
                      <Text style={walletStyles.qntmLabel}>QNTM</Text>
                      <Text style={walletStyles.qntmSubLabel}>In-app currency</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text style={walletStyles.qntmBalance}>
                      {hideBalance ? "••••••" : mainQuantAmount}
                    </Text>
                    <Text style={walletStyles.qntmPoints}>QC Points</Text>
                  </View>
                </View>
                <Pressable
                  style={walletStyles.sendButton}
                  onPress={() => router.push("/wallet/send-qntm" as never)}
                >
                  <Ionicons name="arrow-up" size={16} color="#000" />
                  <Text style={walletStyles.sendButtonText}>Send QNTM</Text>
                </Pressable>
              </CardContent>
            </Card>

            {/* Create Wallet Section */}
            <Card className="mb-4 border-[#222] bg-[#111]">
              <CardContent className="p-6 items-center">
                <View className="w-20 h-20 rounded-full bg-white/5 items-center justify-center mb-4">
                  <Ionicons name="add" size={40} color="#fff" />
                </View>
                <Text style={walletStyles.createTitle}>Create New Wallet</Text>
                <Text style={walletStyles.createSubtitle}>
                  Create a new self-custody wallet secured by your own keys
                </Text>
                <Pressable onPress={handleCreateWallet} style={walletStyles.createButton}>
                  <Text style={walletStyles.createButtonText}>Create Wallet</Text>
                </Pressable>
              </CardContent>
            </Card>

            {/* Import Wallet */}
            <Pressable
              onPress={handleImportWallet}
              className="flex-row items-center justify-center gap-2 py-4"
            >
              <Text style={walletStyles.importHint}>Already have a wallet?</Text>
              <Text style={walletStyles.importLink}>Import</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </Pressable>

            {/* Features Preview */}
            <View className="mt-8">
              <Text style={walletStyles.sectionTitle}>Features</Text>
              
              {/* Earn & Stake Card */}
              <Pressable
                className="h-32 p-5 rounded-2xl bg-[#111] border border-[#222] flex-row items-center justify-between mb-3"
                disabled
              >
                <View className="flex-1">
                  <Text style={walletStyles.featureTitle}>Earn & Stake</Text>
                  <Text style={walletStyles.featureSubtitle}>Up to 5.0% APY</Text>
                  <Text style={walletStyles.comingSoon}>Coming soon</Text>
                </View>
                <View className="w-16 h-16 rounded-2xl bg-white/5 items-center justify-center">
                  <Ionicons name="trending-up" size={32} color="#6b7280" />
                </View>
              </Pressable>

              {/* NFT Marketplace Card */}
              <Pressable
                className="h-32 p-5 rounded-2xl bg-[#111] border border-[#222] flex-row items-center justify-between"
                disabled
              >
                <View className="flex-1">
                  <Text style={walletStyles.featureTitle}>NFT Marketplace</Text>
                  <Text style={walletStyles.featureSubtitle}>Discover & collect unique NFTs</Text>
                  <Text style={walletStyles.comingSoon}>Coming soon</Text>
                </View>
                <View className="w-16 h-16 rounded-2xl bg-white/5 items-center justify-center">
                  <Ionicons name="image-outline" size={32} color="#6b7280" />
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Has wallet - show main wallet view
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
            <Text style={walletStyles.header}>Wallet</Text>
            <Pressable
              onPress={toggleHideBalance}
              className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
            >
              <Ionicons 
                name={hideBalance ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#9ca3af" 
              />
            </Pressable>
          </View>

          {/* Main Balance Card */}
          <Card className="mb-6 border-[#222] bg-[#111]">
            <CardContent className="p-6">
              {/* Address Row */}
              {walletAddress && (
                <Pressable
                  onPress={handleCopyAddress}
                  className="flex-row items-center gap-2 mb-4"
                >
                  <Text style={walletStyles.addressText} numberOfLines={1}>
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                  </Text>
                  <Ionicons 
                    name={copied ? "checkmark" : "copy-outline"} 
                    size={14} 
                    color={copied ? "#22c55e" : "#9ca3af"} 
                  />
                </Pressable>
              )}

              {/* Total Balance */}
              <View className="mb-2">
                <Text style={walletStyles.balanceLabel}>Total Balance</Text>
                <Text style={walletStyles.balanceValue}>
                  {hideBalance ? "••••••" : formatUsd(totalUsdBalance)}
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3 mt-6">
                {actionButtons.map((action, i) => (
                  <Pressable
                    key={i}
                    onPress={action.onPress}
                    disabled={action.disabled}
                    style={{ flex: 1, alignItems: "center", gap: 8, opacity: action.disabled ? 0.5 : 1 }}
                  >
                    <View className="w-12 h-12 rounded-2xl bg-[#1a1a1a] items-center justify-center">
                      <Ionicons name={action.icon} size={20} color="#9ca3af" />
                    </View>
                    <Text style={walletStyles.actionLabel}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            </CardContent>
          </Card>

          {/* QNTM Balance Card */}
          <View className="mb-3">
            <Text style={walletStyles.sectionTitle}>QNTM Balance</Text>
            <Card className="border-orange-500/20 bg-[#111] rounded-2xl">
              <CardContent className="p-4">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 bg-black rounded-full items-center justify-center border border-orange-500/30">
                      <QntmIcon size={28} />
                    </View>
                    <View>
                      <Text style={walletStyles.qntmLabel}>QNTM</Text>
                      <Text style={walletStyles.qntmSubLabel}>In-app currency</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text style={walletStyles.qntmBalance}>
                      {hideBalance ? "••••••" : mainQuantAmount}
                    </Text>
                    <Text style={walletStyles.qntmPoints}>QC Points</Text>
                  </View>
                </View>
                <Pressable style={walletStyles.sendButton} onPress={() => router.push("/wallet/send-qntm" as never)}>
                  <Ionicons name="arrow-up" size={16} color="#000" />
                  <Text style={walletStyles.sendButtonText}>Send QNTM</Text>
                </Pressable>
              </CardContent>
            </Card>
          </View>

          {/* Assets Section */}
          <View className="mt-6">
            <Text style={walletStyles.sectionTitle}>Assets</Text>
            
            {/* TON Asset */}
            <Card className="mb-3 border-[#222] bg-[#111]">
              <CardContent className="p-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-[#0098EA] items-center justify-center">
                    <Text style={walletStyles.tonLabel}>TON</Text>
                  </View>
                  <View>
                    <Text style={walletStyles.assetName}>Toncoin</Text>
                    <Text style={walletStyles.assetSymbol}>TON</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text style={walletStyles.assetBalance}>{hideBalance ? "••••" : tonBalance}</Text>
                  <Text style={walletStyles.assetUsd}>{hideBalance ? "••••" : formatUsd(tonUsdValue)}</Text>
                </View>
              </CardContent>
            </Card>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const walletStyles = StyleSheet.create({
  header: {
    fontSize: 30,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  subheader: {
    fontSize: 16,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
    marginBottom: 32,
    marginTop: 8,
  },
  qntmLabel: {
    fontSize: 18,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  qntmSubLabel: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  qntmBalance: {
    fontSize: 20,
    fontFamily: "Onest_700Bold",
    color: "#fb923c",
  },
  qntmPoints: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
  },
  sendButton: {
    height: 48,
    backgroundColor: "#fb923c",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  sendButtonText: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  createTitle: {
    fontSize: 20,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    marginBottom: 8,
  },
  createSubtitle: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 24,
  },
  createButton: {
    height: 48,
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  importHint: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  importLink: {
    fontSize: 14,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  featureSubtitle: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  comingSoon: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#6b7280",
    marginTop: 12,
  },
  addressText: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 36,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    letterSpacing: -1,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: "Onest_500Medium",
    color: "#6b7280",
  },
  tonLabel: {
    fontSize: 12,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  assetName: {
    fontSize: 14,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  assetSymbol: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  assetBalance: {
    fontSize: 14,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  assetUsd: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
});
