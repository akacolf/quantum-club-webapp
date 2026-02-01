import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";

export default function Receive() {
  const [copied, setCopied] = useState(false);
  const walletAddress = "EQ...your-address"; // Placeholder

  const handleCopy = async () => {
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      {/* QR Code Placeholder */}
      <View style={styles.qrContainer}>
        <View style={styles.qrPlaceholder}>
          <Text style={styles.qrText}>📱</Text>
          <Text style={styles.qrLabel}>QR Code</Text>
        </View>
      </View>

      {/* Address Display */}
      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>Your Wallet Address</Text>
        <View style={styles.addressBox}>
          <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
            {walletAddress}
          </Text>
        </View>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
          <Text style={styles.copyButtonText}>
            {copied ? "✓ Copied!" : "Copy Address"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Share this address to receive TON or other supported tokens.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B1E",
    padding: 16,
    alignItems: "center",
  },
  qrContainer: {
    marginTop: 32,
    marginBottom: 32,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  qrText: {
    fontSize: 64,
  },
  qrLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
  addressContainer: {
    width: "100%",
    alignItems: "center",
  },
  addressLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 12,
  },
  addressBox: {
    backgroundColor: "#1E1F3B",
    padding: 16,
    borderRadius: 12,
    width: "100%",
    marginBottom: 16,
  },
  addressText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontFamily: "monospace",
    textAlign: "center",
  },
  copyButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  infoContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  infoText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
