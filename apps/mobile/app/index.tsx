import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>⚡</Text>
          <Text style={styles.title}>Quantum Club</Text>
          <Text style={styles.subtitle}>Self-Custody Wallet</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem icon="💎" text="Multi-chain support (TON, ETH, SOL, BTC)" />
          <FeatureItem icon="🖼️" text="NFT Marketplace" />
          <FeatureItem icon="🔄" text="Token Swaps & Staking" />
          <FeatureItem icon="🤖" text="AI-powered insights" />
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/(wallet)")}
        >
          <Text style={styles.buttonText}>Enter Wallet</Text>
        </TouchableOpacity>

        <Text style={styles.version}>v1.0.0 • Mobile Preview</Text>
      </View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B1E",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoText: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  features: {
    width: "100%",
    marginBottom: 48,
    gap: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1F3B",
    padding: 16,
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: "#E5E7EB",
    flex: 1,
  },
  button: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  version: {
    marginTop: 24,
    fontSize: 12,
    color: "#6B7280",
  },
});
