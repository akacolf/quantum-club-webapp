import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

export default function WalletHome() {
  const router = useRouter();
  const [hideBalance, setHideBalance] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Ionicons name="diamond" size={20} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Quantum Club</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable 
            style={styles.headerButton}
            onPress={() => router.push("/(wallet)/history")}
          >
            <Ionicons name="time-outline" size={20} color="#fff" />
          </Pressable>
          <Pressable 
            style={styles.headerButton}
            onPress={() => router.push("/(wallet)/settings")}
          >
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <CardContent style={styles.balanceContent}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Pressable onPress={() => setHideBalance(!hideBalance)}>
                <Ionicons 
                  name={hideBalance ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#6b7280" 
                />
              </Pressable>
            </View>
            <Text style={styles.balanceValue}>
              {hideBalance ? "••••••" : "$0.00"}
            </Text>
            <Text style={styles.balanceSubtext}>
              {hideBalance ? "••••" : "≈ 0.00 TON"}
            </Text>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <ActionButton
            icon="paper-plane"
            label="Send"
            onPress={() => router.push("/(wallet)/send")}
          />
          <ActionButton
            icon="download"
            label="Receive"
            onPress={() => router.push("/(wallet)/receive")}
          />
          <ActionButton 
            icon="swap-horizontal" 
            label="Swap" 
            onPress={() => router.push("/(wallet)/swap")} 
          />
          <ActionButton 
            icon="trending-up" 
            label="Stake" 
            onPress={() => router.push("/(wallet)/staking")} 
          />
        </View>

        {/* Assets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Assets</Text>
            <Pressable>
              <Text style={styles.sectionLink}>Manage</Text>
            </Pressable>
          </View>
          <Card style={styles.emptyCard}>
            <CardContent style={styles.emptyContent}>
              <Ionicons name="wallet-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyTitle}>No assets yet</Text>
              <Text style={styles.emptySubtitle}>
                Connect your wallet or receive tokens to get started
              </Text>
            </CardContent>
          </Card>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable onPress={() => router.push("/(wallet)/history")}>
              <Text style={styles.sectionLink}>View all</Text>
            </Pressable>
          </View>
          <Card style={styles.emptyCard}>
            <CardContent style={styles.emptyContentSmall}>
              <Text style={styles.emptySubtitle}>No transactions yet</Text>
            </CardContent>
          </Card>
        </View>

        {/* NFT Marketplace Banner */}
        <Pressable onPress={() => router.push("/(wallet)/marketplace")}>
          <Card style={styles.marketplaceCard}>
            <CardContent style={styles.marketplaceContent}>
              <View style={styles.marketplaceLeft}>
                <View style={styles.marketplaceIcon}>
                  <Ionicons name="storefront" size={24} color="#fff" />
                </View>
                <View>
                  <Text style={styles.marketplaceTitle}>NFT Marketplace</Text>
                  <Text style={styles.marketplaceSubtitle}>Browse collections</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </CardContent>
          </Card>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <View style={styles.actionButtonIcon}>
        <Ionicons name={icon} size={24} color="#000" />
      </View>
      <Text style={styles.actionButtonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fb923c",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  balanceCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 24,
  },
  balanceContent: {
    padding: 24,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
  },
  balanceValue: {
    fontSize: 40,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  balanceSubtext: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 32,
  },
  actionButton: {
    alignItems: "center",
  },
  actionButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionButtonLabel: {
    fontSize: 12,
    fontFamily: "Onest_500Medium",
    color: "#fff",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  sectionLink: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#fb923c",
  },
  emptyCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  emptyContent: {
    padding: 32,
    alignItems: "center",
  },
  emptyContentSmall: {
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    textAlign: "center",
  },
  marketplaceCard: {
    backgroundColor: "#fb923c",
    borderRadius: 20,
    marginBottom: 16,
  },
  marketplaceContent: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  marketplaceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  marketplaceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  marketplaceTitle: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#000",
  },
  marketplaceSubtitle: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "rgba(0,0,0,0.6)",
  },
});
