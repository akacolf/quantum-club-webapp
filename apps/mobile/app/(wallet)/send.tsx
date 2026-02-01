import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useState } from "react";

export default function Send() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        {/* Recipient Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recipient Address</Text>
          <TextInput
            style={styles.input}
            value={recipient}
            onChangeText={setRecipient}
            placeholder="Enter wallet address"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountContainer}>
            <TextInput
              style={[styles.input, styles.amountInput]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#6B7280"
              keyboardType="decimal-pad"
            />
            <View style={styles.tokenBadge}>
              <Text style={styles.tokenText}>TON</Text>
            </View>
          </View>
          <Text style={styles.balanceText}>Balance: 0.00 TON</Text>
        </View>

        {/* Max Button */}
        <TouchableOpacity style={styles.maxButton}>
          <Text style={styles.maxButtonText}>Use Max</Text>
        </TouchableOpacity>
      </View>

      {/* Send Button */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          (!recipient || !amount) && styles.sendButtonDisabled,
        ]}
        disabled={!recipient || !amount}
      >
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B1E",
    padding: 16,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#E5E7EB",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1E1F3B",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#374151",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  tokenBadge: {
    backgroundColor: "#374151",
    padding: 16,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    borderLeftWidth: 0,
  },
  tokenText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  balanceText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
  },
  maxButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#6366F1",
    borderRadius: 8,
  },
  maxButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  sendButton: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#374151",
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
