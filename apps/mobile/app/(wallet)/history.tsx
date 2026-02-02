import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface Transaction {
  id: string;
  type: "send" | "receive" | "swap";
  amount: string;
  token: string;
  address: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "receive",
    amount: "+10.5",
    token: "TON",
    address: "EQDr...PWRA",
    timestamp: "Today, 2:30 PM",
    status: "completed",
  },
  {
    id: "2",
    type: "send",
    amount: "-5.0",
    token: "TON",
    address: "EQAb...X3tK",
    timestamp: "Today, 11:15 AM",
    status: "completed",
  },
  {
    id: "3",
    type: "swap",
    amount: "100",
    token: "USDT → TON",
    address: "",
    timestamp: "Yesterday, 4:45 PM",
    status: "completed",
  },
];

type FilterType = "all" | "send" | "receive" | "swap";

function TransactionItem({ tx }: { tx: Transaction }) {
  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (tx.type) {
      case "send":
        return "arrow-up";
      case "receive":
        return "arrow-down";
      case "swap":
        return "swap-horizontal";
    }
  };

  const getIconColor = () => {
    switch (tx.type) {
      case "send":
        return "#ef4444";
      case "receive":
        return "#22c55e";
      case "swap":
        return "#fb923c";
    }
  };

  const getIconBgColor = () => {
    switch (tx.type) {
      case "send":
        return "rgba(239, 68, 68, 0.1)";
      case "receive":
        return "rgba(34, 197, 94, 0.1)";
      case "swap":
        return "rgba(251, 146, 60, 0.1)";
    }
  };

  return (
    <Pressable style={styles.txItem}>
      <View style={[styles.txIcon, { backgroundColor: getIconBgColor() }]}>
        <Ionicons name={getIcon()} size={20} color={getIconColor()} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txType}>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</Text>
        <Text style={styles.txTime}>{tx.timestamp}</Text>
      </View>
      <View style={styles.txAmountContainer}>
        <Text style={[styles.txAmount, { color: getIconColor() }]}>
          {tx.amount} {tx.token}
        </Text>
        <Text style={styles.txStatus}>{tx.status}</Text>
      </View>
    </Pressable>
  );
}

export default function History() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredTransactions = mockTransactions.filter((tx) => 
    filter === "all" ? true : tx.type === filter
  );

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "send", label: "Sent" },
    { key: "receive", label: "Received" },
    { key: "swap", label: "Swaps" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filters.map((f) => (
            <Pressable
              key={f.key}
              style={[
                styles.filterButton,
                filter === f.key && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Transactions List */}
        {filteredTransactions.length > 0 ? (
          <Card style={styles.txCard}>
            <CardContent style={styles.txCardContent}>
              {filteredTransactions.map((tx, index) => (
                <View key={tx.id}>
                  <TransactionItem tx={tx} />
                  {index < filteredTransactions.length - 1 && (
                    <View style={styles.separator} />
                  )}
                </View>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <CardContent style={styles.emptyContent}>
              <Ionicons name="receipt-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>
                Your transaction history will appear here
              </Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  filterButtonActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  filterText: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#9ca3af",
  },
  filterTextActive: {
    color: "#000",
    fontFamily: "Onest_600SemiBold",
  },
  txCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  txCardContent: {
    padding: 0,
  },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txType: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
    marginBottom: 2,
  },
  txTime: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
  },
  txAmountContainer: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    marginBottom: 2,
  },
  txStatus: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    textTransform: "capitalize",
  },
  separator: {
    height: 1,
    backgroundColor: "#222",
    marginHorizontal: 16,
  },
  emptyCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  emptyContent: {
    padding: 48,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
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
});
