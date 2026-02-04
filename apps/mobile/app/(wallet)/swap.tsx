import { View, ScrollView, Pressable, TextInput, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from '@/components/icons';

interface Token {
  symbol: string;
  name: string;
  balance: string;
  icon: string;
  color: string;
}

const tokens: Token[] = [
  { symbol: "TON", name: "Toncoin", balance: "100.00", icon: "solar:diamond-bold", color: "#3b82f6" },
  { symbol: "USDT", name: "Tether USD", balance: "250.00", icon: "solar:dollar-bold", color: "#22c55e" },
  { symbol: "QNTM", name: "Quantum", balance: "1000.00", icon: "solar:bolt-bold", color: "#a855f7" },
];

export default function Swap() {
  const router = useRouter();
  
  const [fromToken, setFromToken] = useState<Token>(tokens[0]);
  const [toToken, setToToken] = useState<Token>(tokens[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // Simulate rate calculation
  const calculateToAmount = (amount: string) => {
    const value = parseFloat(amount) || 0;
    const rate = 2.5; // Mock rate
    return (value * rate).toFixed(2);
  };

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    setToAmount(calculateToAmount(value));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="solar:arrow-left-linear" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Swap</Text>
        <Pressable style={styles.headerButton}>
          <Icon name="solar:settings-linear" size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* From Token */}
        <Card style={styles.tokenCard}>
          <CardContent style={styles.tokenContent}>
            <Text style={styles.tokenLabel}>From</Text>
            <View style={styles.tokenRow}>
              <Pressable style={styles.tokenSelector}>
                <View style={[styles.tokenIconBg, { backgroundColor: fromToken.color }]}>
                  <Icon name={fromToken.icon} size={16} color="#fff" />
                </View>
                <Text style={styles.tokenSymbol}>{fromToken.symbol}</Text>
                <Icon name="solar:alt-arrow-down-linear" size={16} color="#6b7280" />
              </Pressable>
              <TextInput
                style={styles.amountInput}
                placeholder="0.0"
                placeholderTextColor="#6b7280"
                keyboardType="decimal-pad"
                value={fromAmount}
                onChangeText={handleFromAmountChange}
              />
            </View>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceText}>
                Balance: {fromToken.balance} {fromToken.symbol}
              </Text>
              <Pressable onPress={() => handleFromAmountChange(fromToken.balance)}>
                <Text style={styles.maxButton}>MAX</Text>
              </Pressable>
            </View>
          </CardContent>
        </Card>

        {/* Swap Button */}
        <View style={styles.swapButtonContainer}>
          <Pressable style={styles.swapButton} onPress={handleSwapTokens}>
            <Icon name="solar:transfer-vertical-linear" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* To Token */}
        <Card style={styles.tokenCard}>
          <CardContent style={styles.tokenContent}>
            <Text style={styles.tokenLabel}>To</Text>
            <View style={styles.tokenRow}>
              <Pressable style={styles.tokenSelector}>
                <View style={[styles.tokenIconBg, { backgroundColor: toToken.color }]}>
                  <Icon name={toToken.icon} size={16} color="#fff" />
                </View>
                <Text style={styles.tokenSymbol}>{toToken.symbol}</Text>
                <Icon name="solar:alt-arrow-down-linear" size={16} color="#6b7280" />
              </Pressable>
              <TextInput
                style={styles.amountInput}
                placeholder="0.0"
                placeholderTextColor="#6b7280"
                keyboardType="decimal-pad"
                value={toAmount}
                editable={false}
              />
            </View>
            <Text style={styles.balanceText}>
              Balance: {toToken.balance} {toToken.symbol}
            </Text>
          </CardContent>
        </Card>

        {/* Swap Details */}
        <Card style={styles.detailsCard}>
          <CardContent style={styles.detailsContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rate</Text>
              <Text style={styles.detailValue}>
                1 {fromToken.symbol} ≈ 2.5 {toToken.symbol}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fee</Text>
              <Text style={styles.detailValue}>0.3%</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Slippage</Text>
              <Text style={styles.detailValue}>0.5%</Text>
            </View>
          </CardContent>
        </Card>

        {/* Swap Action Button */}
        <Pressable
          style={[
            styles.actionButton,
            !fromAmount && styles.actionButtonDisabled,
          ]}
          disabled={!fromAmount}
        >
          <Icon 
            name="solar:transfer-horizontal-linear" 
            size={20} 
            color={fromAmount ? "#000" : "#6b7280"} 
          />
          <Text style={[
            styles.actionButtonText,
            !fromAmount && styles.actionButtonTextDisabled,
          ]}>
            {fromAmount ? "Swap" : "Enter an amount"}
          </Text>
        </Pressable>
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
    paddingBottom: 32,
  },
  tokenCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  tokenContent: {
    padding: 16,
  },
  tokenLabel: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    marginBottom: 12,
  },
  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tokenSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  tokenIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenSymbol: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    textAlign: "right",
    marginLeft: 16,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  balanceText: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    marginTop: 12,
  },
  maxButton: {
    fontSize: 12,
    fontFamily: "Onest_700Bold",
    color: "#fb923c",
  },
  swapButtonContainer: {
    alignItems: "center",
    marginVertical: -16,
    zIndex: 10,
  },
  swapButton: {
    width: 48,
    height: 48,
    backgroundColor: "#fb923c",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#000",
  },
  detailsCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    marginTop: 16,
  },
  detailsContent: {
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#fff",
  },
  actionButton: {
    height: 56,
    backgroundColor: "#fb923c",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  actionButtonDisabled: {
    backgroundColor: "#111",
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  actionButtonTextDisabled: {
    color: "#6b7280",
  },
});
