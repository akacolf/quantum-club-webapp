import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Send() {
  const router = useRouter();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const handleQuickAmount = (percentage: number) => {
    // TODO: Calculate based on actual balance
    const mockBalance = 100;
    setAmount((mockBalance * percentage / 100).toFixed(2));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Send</Text>
        <Pressable style={styles.headerButton}>
          <Ionicons name="scan-outline" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Recipient Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Recipient Address</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="wallet-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={recipient}
              onChangeText={setRecipient}
              placeholder="Enter wallet address"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#6b7280"
                keyboardType="decimal-pad"
              />
            </View>
            <Pressable style={styles.tokenSelector}>
              <Text style={styles.tokenText}>TON</Text>
              <Ionicons name="chevron-down" size={16} color="#9ca3af" />
            </Pressable>
          </View>
          <Text style={styles.balanceText}>Balance: 0.00 TON</Text>
        </View>

        {/* Quick Amount Buttons */}
        <View style={styles.quickAmounts}>
          {[25, 50, 75].map((pct) => (
            <Pressable
              key={pct}
              style={styles.quickButton}
              onPress={() => handleQuickAmount(pct)}
            >
              <Text style={styles.quickButtonText}>{pct}%</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.quickButton, styles.maxButton]}
            onPress={() => handleQuickAmount(100)}
          >
            <Text style={styles.maxButtonText}>MAX</Text>
          </Pressable>
        </View>

        {/* Transaction Summary */}
        <Card style={styles.summaryCard}>
          <CardContent style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Network Fee</Text>
              <Text style={styles.summaryValue}>~0.01 TON</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>You'll Send</Text>
              <Text style={styles.summaryValueBold}>{amount || "0.00"} TON</Text>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* Send Button */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.sendButton,
            (!recipient || !amount) && styles.sendButtonDisabled,
          ]}
          disabled={!recipient || !amount}
        >
          <Ionicons name="paper-plane" size={20} color={recipient && amount ? "#000" : "#6b7280"} />
          <Text style={[
            styles.sendButtonText,
            (!recipient || !amount) && styles.sendButtonTextDisabled,
          ]}>
            Send
          </Text>
        </Pressable>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#9ca3af",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Onest_400Regular",
    color: "#fff",
  },
  amountRow: {
    flexDirection: "row",
    gap: 12,
  },
  tokenSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 16,
    height: 56,
    gap: 8,
  },
  tokenText: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  balanceText: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    marginTop: 8,
  },
  quickAmounts: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  quickButton: {
    flex: 1,
    height: 40,
    backgroundColor: "#111",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  quickButtonText: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#9ca3af",
  },
  maxButton: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  maxButtonText: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  summaryCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  summaryContent: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#fff",
  },
  summaryValueBold: {
    fontSize: 14,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  sendButton: {
    height: 56,
    backgroundColor: "#22c55e",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#111",
  },
  sendButtonText: {
    fontSize: 16,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  sendButtonTextDisabled: {
    color: "#6b7280",
  },
});
