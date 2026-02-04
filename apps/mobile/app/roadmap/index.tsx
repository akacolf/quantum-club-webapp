import React, { useEffect, useRef } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { useRouter } from "expo-router";
import { Icon } from '@/components/icons';
import Animated, { FadeInDown, FadeInLeft } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

interface RoadmapItem {
  id: string;
  quarter: string;
  title: string;
  status: "completed" | "current" | "upcoming";
  description?: string;
}

const roadmapData: RoadmapItem[] = [
  {
    id: "1",
    quarter: "February 2025",
    title: "Leaderboard",
    status: "completed",
    description: "The leaderboard has been introduced.",
  },
  {
    id: "2",
    quarter: "February 2025",
    title: "Daily Check-ins",
    status: "completed",
    description: "Introduced daily check-ins to provide more QNTM earning opportunities.",
  },
  {
    id: "3",
    quarter: "March 2025",
    title: "Solve-to-Earn",
    status: "completed",
    description: "Solve-to-Earn was introduced as part of a unique model in GameFi.",
  },
  {
    id: "4",
    quarter: "March 2025",
    title: "TON Connect",
    status: "completed",
    description: "Wallet connection was made available to users.",
  },
  {
    id: "5",
    quarter: "Q1 2026",
    title: "QC Wallet (Beta)",
    status: "completed",
    description: "A secure and powerful self-custody Web3 wallet with multi-chain support, staking, swaps, liquidity provision, and batch transactions.",
  },
  {
    id: "6",
    quarter: "Q1 2026",
    title: "QC AI",
    status: "completed",
    description: "AI-powered assistant for portfolio analysis, token insights, and intelligent transaction support.",
  },
  {
    id: "7",
    quarter: "Q1 2026",
    title: "Yield Aggregator",
    status: "completed",
    description: "Multi-protocol yield optimization with staking, liquidity pools, and LP farming. Find the best APY automatically.",
  },
  {
    id: "8",
    quarter: "Q1 2026",
    title: "NFT Marketplace (Beta)",
    status: "completed",
    description: "Discover, buy, sell, and manage NFTs directly within the wallet. Browse collections, view floor prices, and trade seamlessly.",
  },
  {
    id: "9",
    quarter: "Q1 2026",
    title: "AI-powered Trading Platform",
    status: "current",
    description: "A powerful trading platform for seamless crypto trading with AI insights and smart alerts.",
  },
  {
    id: "10",
    quarter: "Q2 2026",
    title: "QC Pay",
    status: "upcoming",
    description: "P2P payments with QR codes, payment links, and recurring payments for everyday crypto transactions.",
  },
  {
    id: "11",
    quarter: "Q3 2026",
    title: "Copy Trading",
    status: "upcoming",
    description: "Follow and auto-copy successful traders. Learn while you earn.",
  },
  {
    id: "12",
    quarter: "Q4 2026",
    title: "QC SDK & API",
    status: "upcoming",
    description: "Developer tools and APIs to build on the Quantum Club platform.",
  },
  {
    id: "13",
    quarter: "Q4 2026",
    title: "Establishment of Quantum Club Labs",
    status: "upcoming",
    description: "Research and development arm for blockchain innovation.",
  },
  {
    id: "14",
    quarter: "Q1 2027",
    title: "QC Token",
    status: "upcoming",
    description: "Native utility token with real utility for fees, governance, and staking rewards.",
  },
  {
    id: "15",
    quarter: "Q2 2027",
    title: "Establishment of the Quantum Club Chain",
    status: "upcoming",
    description: "Our own blockchain infrastructure for the Quantum Club ecosystem.",
  },
  {
    id: "16",
    quarter: "Q2 2027",
    title: "iOS & Android Apps",
    status: "upcoming",
    description: "Native mobile applications for iOS and Android, bringing the full Quantum Club experience to your pocket.",
  },
];

export default function RoadmapScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="solar:arrow-left-linear" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Roadmap</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introContainer}>
          <Text style={styles.introTitle}>Building the Future</Text>
          <Text style={styles.introText}>
            Our journey to revolutionize the TON ecosystem.
          </Text>
        </View>

        <View style={styles.timeline}>
          {/* Vertical Line */}
          <View style={styles.verticalLine} />

          {roadmapData.map((item, index) => (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay(index * 100).duration(500)}
              style={styles.timelineItem}
            >
              {/* Dot Indicator */}
              <View style={[
                styles.dot, 
                item.status === "completed" && styles.dotCompleted,
                item.status === "current" && styles.dotCurrent,
                item.status === "upcoming" && styles.dotUpcoming
              ]}>
                {item.status === "completed" && (
                  <Icon name="solar:check-circle-bold" size={12} color="#000" />
                )}
                {item.status === "current" && (
                  <View style={styles.dotInnerCurrent} />
                )}
              </View>

              {/* Content Card */}
              <View style={[
                styles.card,
                item.status === "current" && styles.cardCurrent
              ]}>
                <View style={styles.quarterBadge}>
                  <Text style={[
                    styles.quarterText,
                    item.status === "current" && styles.quarterTextCurrent
                  ]}>{item.quarter}</Text>
                </View>
                <Text style={[
                  styles.itemTitle,
                  item.status === "current" && styles.itemTitleCurrent
                ]}>{item.title}</Text>
                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}
              </View>
            </Animated.View>
          ))}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  introContainer: {
    marginBottom: 32,
    paddingVertical: 10, // Added padding to prevent clipping
  },
  introTitle: {
    fontSize: 32,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    marginBottom: 8,
    lineHeight: 40, // Added line height to prevent clipping
  },
  introText: {
    fontSize: 16,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
  },
  timeline: {
    position: "relative",
    paddingLeft: 16,
  },
  verticalLine: {
    position: "absolute",
    left: 23,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#222",
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 32,
    alignItems: "flex-start",
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#222",
    marginRight: 24,
    marginTop: 6, // Align with card top
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  dotCompleted: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  dotCurrent: {
    backgroundColor: "#000",
    borderColor: "#eab308",
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -2, // Adjust for size difference
    marginRight: 22,
  },
  dotUpcoming: {
    backgroundColor: "#333",
    borderColor: "#000",
  },
  dotInnerCurrent: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#eab308",
  },
  card: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  cardCurrent: {
    borderColor: "#eab308",
    backgroundColor: "rgba(234, 179, 8, 0.05)",
  },
  quarterBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  quarterText: {
    fontSize: 12,
    fontFamily: "Onest_600SemiBold",
    color: "#9ca3af",
  },
  quarterTextCurrent: {
    color: "#eab308",
  },
  itemTitle: {
    fontSize: 18,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  itemTitleCurrent: {
    color: "#fff",
  },
  itemDescription: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
    lineHeight: 20,
  },
});