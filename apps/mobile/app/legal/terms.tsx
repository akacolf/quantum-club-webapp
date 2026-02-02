import React from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="document-text-outline" size={32} color="#fb923c" />
        </View>

        <Text style={styles.lastUpdated}>Last updated: January 19, 2026</Text>

        {/* Section 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By accessing or using the Quantum Club application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the App. We reserve the right to modify these Terms at any time. Your continued use of the App following any changes constitutes acceptance of those changes.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Eligibility</Text>
          <Text style={styles.sectionText}>
            You must be at least 18 years old to use this App. By using the App, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms. The App is not available to users in jurisdictions where its use is prohibited by applicable law or regulation, including but not limited to sanctioned countries and regions.
          </Text>
        </View>

        {/* Section 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Description of Services</Text>
          <Text style={styles.sectionText}>
            Quantum Club is a self-custody cryptocurrency wallet and platform that allows users to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Create and manage cryptocurrency wallets</Text>
            <Text style={styles.bulletItem}>• Send and receive digital assets including tokens and NFTs</Text>
            <Text style={styles.bulletItem}>• Swap tokens through integrated decentralized exchanges</Text>
            <Text style={styles.bulletItem}>• Stake assets to earn rewards through third-party staking providers</Text>
            <Text style={styles.bulletItem}>• Provide liquidity to decentralized liquidity pools</Text>
            <Text style={styles.bulletItem}>• View portfolio balances, analytics, and price information</Text>
            <Text style={styles.bulletItem}>• Earn and transfer in-app rewards (QNTM points)</Text>
            <Text style={styles.bulletItem}>• Access AI-powered assistance features</Text>
            <Text style={styles.bulletItem}>• Receive cryptocurrencies on multiple blockchain networks</Text>
            <Text style={styles.bulletItem}>• Create and trade tokens on RocketStart launchpad</Text>
            <Text style={styles.bulletItem}>• Send batch transactions to multiple recipients</Text>
          </View>
        </View>

        {/* Section 4 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Wallet Security and Responsibility</Text>
          <Text style={[styles.sectionText, styles.bold]}>
            You are solely responsible for your wallet security.
          </Text>
          <Text style={styles.sectionText}>
            Quantum Club is a non-custodial wallet, meaning we do not store, have access to, or control your private keys or recovery phrase. You acknowledge that:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Your recovery phrase is the only way to access your wallet</Text>
            <Text style={styles.bulletItem}>• If you lose your recovery phrase, your funds are permanently inaccessible</Text>
            <Text style={styles.bulletItem}>• We cannot recover lost recovery phrases or private keys</Text>
            <Text style={styles.bulletItem}>• You must keep your recovery phrase secure and confidential</Text>
            <Text style={styles.bulletItem}>• You are responsible for all transactions made from your wallet</Text>
          </View>
        </View>

        {/* Section 5 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Token Swaps and Transactions</Text>
          <Text style={styles.sectionText}>
            Token swaps are facilitated through third-party decentralized exchange protocols. You understand and agree that:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Swaps may fail due to price fluctuations, slippage, or insufficient liquidity</Text>
            <Text style={styles.bulletItem}>• Network fees are required for all blockchain transactions</Text>
            <Text style={styles.bulletItem}>• Transaction outcomes depend on blockchain network conditions</Text>
            <Text style={styles.bulletItem}>• Executed transactions are irreversible once confirmed on the blockchain</Text>
            <Text style={styles.bulletItem}>• We are not responsible for losses resulting from swap transactions</Text>
          </View>
        </View>

        {/* Section 6 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Staking and Liquidity Services</Text>
          <Text style={styles.sectionText}>
            Quantum Club provides access to staking and liquidity services through third-party protocols. By using these services, you acknowledge and accept the following:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}><Text style={styles.bold}>Third-Party Protocols:</Text> Staking and liquidity services are provided by external protocols, not Quantum Club</Text>
            <Text style={styles.bulletItem}><Text style={styles.bold}>No Guarantee of Returns:</Text> Staking rewards and APY rates are variable and not guaranteed</Text>
            <Text style={styles.bulletItem}><Text style={styles.bold}>Lock-up Periods:</Text> Some staking options may have lock-up periods during which assets cannot be withdrawn</Text>
            <Text style={styles.bulletItem}><Text style={styles.bold}>Impermanent Loss:</Text> Liquidity provision carries risk of impermanent loss</Text>
            <Text style={styles.bulletItem}><Text style={styles.bold}>Smart Contract Risk:</Text> Third-party protocols carry inherent smart contract risks</Text>
            <Text style={styles.bulletItem}><Text style={styles.bold}>Your Responsibility:</Text> You are solely responsible for your staking and liquidity decisions</Text>
          </View>
        </View>

        {/* Section 7 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Token Trading (RocketStart)</Text>
          <Text style={styles.sectionText}>
            Quantum Club provides access to RocketStart, a token launchpad feature that uses bonding curve mechanics. By using RocketStart, you acknowledge and accept the following risks:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}><Text style={styles.bold}>High Risk:</Text> Tokens on RocketStart are highly speculative and may lose all value</Text>
            <Text style={styles.bulletItem}><Text style={styles.bold}>No Guarantees:</Text> Past performance does not indicate future results</Text>
            <Text style={styles.bulletItem}><Text style={styles.bold}>Bonding Curve:</Text> Prices are determined algorithmically; large trades cause significant slippage</Text>
            <Text style={styles.bulletItem}><Text style={styles.bold}>Irreversible:</Text> All trades are final once executed on the blockchain</Text>
            <Text style={styles.bulletItem}><Text style={styles.bold}>No Refunds:</Text> Quantum Club cannot reverse or refund any trades</Text>
            <Text style={styles.bulletItem}><Text style={styles.bold}>Your Responsibility:</Text> You are solely responsible for your trading decisions</Text>
            <Text style={styles.bulletItem}><Text style={styles.bold}>Not Investment Advice:</Text> Nothing in the App constitutes financial or investment advice</Text>
          </View>
          <Text style={styles.warningText}>
            WARNING: Only trade with funds you can afford to lose entirely. Cryptocurrency and token trading involves substantial risk of loss.
          </Text>
        </View>

        {/* Section 8 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Fees</Text>
          <Text style={styles.sectionText}>
            Quantum Club does not charge service fees for basic wallet functionality. Users are responsible for blockchain network fees (gas fees) required to process transactions. Network fees are determined by the respective blockchain networks and are not controlled by Quantum Club. QNTM point transfers between users are free of charge.
          </Text>
          <Text style={[styles.sectionText, styles.bold, { marginTop: 8 }]}>
            RocketStart Trading Fees:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Token creation: Free (gas fees only)</Text>
            <Text style={styles.bulletItem}>• Trading fee: 1.1% per trade</Text>
            <Text style={styles.bulletItem}>• Graduation to DEX: 2% of liquidity</Text>
          </View>
        </View>

        {/* Section 9 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Prohibited Activities</Text>
          <Text style={styles.sectionText}>You agree not to:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Use the App for any unlawful purpose or in violation of any laws</Text>
            <Text style={styles.bulletItem}>• Attempt to hack, exploit, or compromise the App's security</Text>
            <Text style={styles.bulletItem}>• Use automated bots, scripts, or similar tools to access the App</Text>
            <Text style={styles.bulletItem}>• Impersonate others or create fraudulent accounts</Text>
            <Text style={styles.bulletItem}>• Engage in money laundering or terrorist financing</Text>
            <Text style={styles.bulletItem}>• Circumvent geographic restrictions using VPNs or other tools</Text>
            <Text style={styles.bulletItem}>• Interfere with or disrupt the App's functionality</Text>
          </View>
        </View>

        {/* Section 10 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Third-Party Services</Text>
          <Text style={styles.sectionText}>
            The App integrates with third-party services including blockchain networks, decentralized exchanges, staking protocols, liquidity providers, and price data providers. These services are governed by their own terms and policies. We do not control and are not responsible for the availability, accuracy, or functionality of third-party services.
          </Text>
        </View>

        {/* Section 11 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Disclaimer of Warranties</Text>
          <Text style={styles.sectionText}>
            THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
          </Text>
        </View>

        {/* Section 12 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Limitation of Liability</Text>
          <Text style={styles.sectionText}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, QUANTUM CLUB AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR DIGITAL ASSETS, ARISING FROM YOUR USE OF THE APP. CRYPTOCURRENCY INVESTMENTS CARRY SIGNIFICANT RISK INCLUDING POTENTIAL TOTAL LOSS OF FUNDS.
          </Text>
        </View>

        {/* Section 13 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Indemnification</Text>
          <Text style={styles.sectionText}>
            You agree to indemnify and hold harmless Quantum Club, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the App, violation of these Terms, or infringement of any third-party rights.
          </Text>
        </View>

        {/* Section 14 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Termination</Text>
          <Text style={styles.sectionText}>
            We may suspend or terminate your access to the App at any time, with or without cause, and with or without notice. You may discontinue use of the App at any time. Upon termination, you retain access to your funds through your recovery phrase, as the wallet is non-custodial.
          </Text>
        </View>

        {/* Section 15 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. Changes to Terms</Text>
          <Text style={styles.sectionText}>
            We reserve the right to modify these Terms at any time. Material changes will be communicated through the App. Your continued use of the App after changes take effect constitutes acceptance of the modified Terms.
          </Text>
        </View>

        {/* Section 16 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>16. Governing Law</Text>
          <Text style={styles.sectionText}>
            These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved through binding arbitration.
          </Text>
        </View>

        {/* Section 17 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>17. Contact Information</Text>
          <Text style={styles.sectionText}>
            For questions or concerns about these Terms, please contact us on Telegram: @quantumclubinc
          </Text>
        </View>
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
  warningText: {
    fontSize: 14,
    fontFamily: "Onest_500Medium",
    color: "#ef4444",
    marginTop: 12,
    lineHeight: 22,
  },
});
