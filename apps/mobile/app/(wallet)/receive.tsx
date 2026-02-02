import { View, Pressable, StyleSheet, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";

export default function Receive() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const walletAddress = "EQDrLq-X6jKZNHAScgghh0h1iog3StK71zn8dcmrOj8jPWRA"; // Placeholder

  const handleCopy = async () => {
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: walletAddress,
        title: "My TON Address",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Receive</Text>
        <Pressable onPress={handleShare} style={styles.headerButton}>
          <Ionicons name="share-outline" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={walletAddress}
              size={200}
              backgroundColor="#fff"
              color="#000"
            />
          </View>
        </View>

        {/* Address Card */}
        <Card style={styles.addressCard}>
          <CardContent style={styles.addressContent}>
            <Text style={styles.addressLabel}>Your TON Address</Text>
            <Text style={styles.addressText} numberOfLines={1}>
              {shortenAddress(walletAddress)}
            </Text>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable style={styles.copyButton} onPress={handleCopy}>
            <Ionicons 
              name={copied ? "checkmark" : "copy-outline"} 
              size={20} 
              color="#000" 
            />
            <Text style={styles.copyButtonText}>
              {copied ? "Copied!" : "Copy"}
            </Text>
          </Pressable>
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Share</Text>
          </Pressable>
        </View>

        {/* Info */}
        <Text style={styles.infoText}>
          Share this address to receive TON or other supported tokens on the TON blockchain.
        </Text>

        {/* Supported Tokens */}
        <Card style={styles.tokensCard}>
          <CardContent style={styles.tokensContent}>
            <Text style={styles.tokensLabel}>Supported tokens</Text>
            <View style={styles.tokensRow}>
              <View style={styles.tokenItem}>
                <View style={[styles.tokenIcon, { backgroundColor: "#3b82f6" }]}>
                  <Ionicons name="diamond" size={20} color="#fff" />
                </View>
                <Text style={styles.tokenName}>TON</Text>
              </View>
              <View style={styles.tokenItem}>
                <View style={[styles.tokenIcon, { backgroundColor: "#22c55e" }]}>
                  <Ionicons name="logo-usd" size={20} color="#fff" />
                </View>
                <Text style={styles.tokenName}>USDT</Text>
              </View>
              <View style={styles.tokenItem}>
                <View style={[styles.tokenIcon, { backgroundColor: "#a855f7" }]}>
                  <Ionicons name="flash" size={20} color="#fff" />
                </View>
                <Text style={styles.tokenName}>Jettons</Text>
              </View>
            </View>
          </CardContent>
        </Card>
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
    alignItems: "center",
    paddingTop: 32,
  },
  qrContainer: {
    marginBottom: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 24,
  },
  addressCard: {
    width: "100%",
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 16,
  },
  addressContent: {
    padding: 16,
    alignItems: "center",
  },
  addressLabel: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#fff",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginBottom: 24,
  },
  copyButton: {
    flex: 1,
    height: 52,
    backgroundColor: "#fff",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  copyButtonText: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#000",
  },
  shareButton: {
    flex: 1,
    height: 52,
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  infoText: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  tokensCard: {
    width: "100%",
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  tokensContent: {
    padding: 16,
  },
  tokensLabel: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  tokensRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
  },
  tokenItem: {
    alignItems: "center",
  },
  tokenIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tokenName: {
    fontSize: 12,
    fontFamily: "Onest_500Medium",
    color: "#fff",
  },
});
