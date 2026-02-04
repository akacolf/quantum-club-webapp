import React from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { useRouter } from "expo-router";
import { Icon } from '@/components/icons';
import Animated, { FadeInDown } from "react-native-reanimated";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View 
        entering={FadeInDown.duration(500).springify()} 
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Icon name="solar:arrow-left-linear" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Icon name="solar:shield-check-linear" size={32} color="#fb923c" />
        </View>

        <Text style={styles.lastUpdated}>Last updated: January 19, 2026</Text>

        {/* Section 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.sectionText}>
            Quantum Club ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our Telegram mini app and wallet services.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>

          <Text style={styles.subSectionTitle}>2.1 Information from Telegram</Text>
          <Text style={styles.sectionText}>
            When you use our App through Telegram, we receive:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Your Telegram user ID (encrypted for privacy)</Text>
            <Text style={styles.bulletItem}>• Your Telegram username and display name</Text>
            <Text style={styles.bulletItem}>• Your profile photo (if public)</Text>
          </View>

          <Text style={styles.subSectionTitle}>2.2 Wallet Information</Text>
          <Text style={[styles.sectionText, styles.bold]}>
            Your private keys and recovery phrase are stored locally on your device only.
          </Text>
          <Text style={styles.sectionText}>
            We never receive, store, or have access to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Your wallet's private keys</Text>
            <Text style={styles.bulletItem}>• Your 24-word recovery phrase</Text>
            <Text style={styles.bulletItem}>• Your PIN or biometric data</Text>
          </View>

          <Text style={styles.subSectionTitle}>2.3 Transaction and Activity Data</Text>
          <Text style={styles.sectionText}>
            We collect limited data for platform functionality:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Your public wallet address</Text>
            <Text style={styles.bulletItem}>• QNTM balance and transfer history within the platform</Text>
            <Text style={styles.bulletItem}>• Task completion and referral data</Text>
            <Text style={styles.bulletItem}>• Token creation and trading activity on RocketStart</Text>
            <Text style={styles.bulletItem}>• Staking and liquidity provision activity</Text>
            <Text style={styles.bulletItem}>• Chat messages in token communities</Text>
          </View>
        </View>

        {/* Section 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.sectionText}>We use collected information to:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Provide and maintain our services</Text>
            <Text style={styles.bulletItem}>• Process QNTM transfers between users</Text>
            <Text style={styles.bulletItem}>• Track task completion and distribute rewards</Text>
            <Text style={styles.bulletItem}>• Maintain leaderboards and referral systems</Text>
            <Text style={styles.bulletItem}>• Display portfolio analytics and performance data</Text>
            <Text style={styles.bulletItem}>• Provide AI-powered assistance features</Text>
            <Text style={styles.bulletItem}>• Prevent fraud and ensure platform security</Text>
            <Text style={styles.bulletItem}>• Comply with legal obligations</Text>
          </View>
        </View>

        {/* Section 4 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Storage & Security</Text>
          <Text style={styles.sectionText}>
            Your sensitive wallet data (private keys, recovery phrase, PIN) is encrypted and stored locally on your device only. We implement industry-standard security measures to protect platform data stored on our servers. Your Telegram ID is encrypted before being used as an identifier.
          </Text>
        </View>

        {/* Section 5 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Sharing</Text>
          <Text style={styles.sectionText}>
            We do not sell your personal information. We may share data with:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Service providers necessary for platform operation</Text>
            <Text style={styles.bulletItem}>• Third-party staking and liquidity protocols (public wallet address only)</Text>
            <Text style={styles.bulletItem}>• Law enforcement when legally required</Text>
            <Text style={styles.bulletItem}>• Blockchain networks (public transaction data only)</Text>
          </View>
        </View>

        {/* Section 6 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Blockchain Transactions</Text>
          <Text style={styles.sectionText}>
            Transactions on supported blockchain networks are public and immutable. Your wallet address and transaction details are visible on the public blockchain. This is inherent to blockchain technology and cannot be changed.
          </Text>
        </View>

        {/* Section 7 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Third-Party Services</Text>
          <Text style={styles.sectionText}>
            We integrate with third-party services including staking providers, decentralized exchanges, and liquidity protocols. These services have their own privacy policies and data practices. We encourage you to review those policies when using third-party services through our App.
          </Text>
        </View>

        {/* Section 8 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Your Rights</Text>
          <Text style={styles.sectionText}>
            Depending on your jurisdiction, you may have the right to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Access your personal data</Text>
            <Text style={styles.bulletItem}>• Request correction of inaccurate data</Text>
            <Text style={styles.bulletItem}>• Request deletion of your data (where legally permissible)</Text>
            <Text style={styles.bulletItem}>• Object to or restrict processing of your data</Text>
            <Text style={styles.bulletItem}>• Data portability</Text>
          </View>
        </View>

        {/* Section 9 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
          <Text style={styles.sectionText}>
            Our services are not intended for users under 18 years of age. We do not knowingly collect personal information from children.
          </Text>
        </View>

        {/* Section 10 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. International Transfers</Text>
          <Text style={styles.sectionText}>
            Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers.
          </Text>
        </View>

        {/* Section 11 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
          <Text style={styles.sectionText}>
            We may update this Privacy Policy from time to time. We will notify you of any material changes through the App or other means. Continued use of the App after changes constitutes acceptance of the updated policy.
          </Text>
        </View>

        {/* Section 12 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Us</Text>
          <Text style={styles.sectionText}>
            For questions about this Privacy Policy or to exercise your rights, please contact us through our Telegram channel: @quantumclubinc
          </Text>
        </View>
      </ScrollView>
      </Animated.View>
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 100,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(251, 146, 60, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  lastUpdated: {
    fontSize: 13,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#d1d5db",
    marginTop: 12,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
    lineHeight: 22,
  },
  bold: {
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  bulletList: {
    marginTop: 8,
    gap: 4,
  },
  bulletItem: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
    lineHeight: 22,
    paddingLeft: 4,
  },
});
