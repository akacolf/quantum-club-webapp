import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function WalletHome() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>$0.00</Text>
        <Text style={styles.balanceSubtext}>≈ 0.00 TON</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <ActionButton
          icon="↑"
          label="Send"
          onPress={() => router.push("/(wallet)/send")}
        />
        <ActionButton
          icon="↓"
          label="Receive"
          onPress={() => router.push("/(wallet)/receive")}
        />
        <ActionButton icon="🔄" label="Swap" onPress={() => {}} />
        <ActionButton icon="📈" label="Stake" onPress={() => {}} />
      </View>

      {/* Assets Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assets</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💎</Text>
          <Text style={styles.emptyText}>No assets yet</Text>
          <Text style={styles.emptySubtext}>
            Connect your wallet or receive tokens to get started
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Text style={styles.actionIconText}>{icon}</Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B1E",
  },
  content: {
    padding: 16,
  },
  balanceCard: {
    backgroundColor: "#1E1F3B",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  balanceSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 32,
  },
  actionButton: {
    alignItems: "center",
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionIconText: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  actionLabel: {
    fontSize: 12,
    color: "#E5E7EB",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: "#1E1F3B",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
