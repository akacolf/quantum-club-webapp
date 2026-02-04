import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from '@/components/icons';

interface StakingPool {
  id: string;
  name: string;
  apy: string;
  tvl: string;
  minStake: string;
  lockPeriod: string;
}

const mockPools: StakingPool[] = [
  {
    id: "1",
    name: "TON Flexible",
    apy: "5.2%",
    tvl: "$12.4M",
    minStake: "1 TON",
    lockPeriod: "None",
  },
  {
    id: "2",
    name: "TON 30-Day Lock",
    apy: "8.5%",
    tvl: "$8.2M",
    minStake: "10 TON",
    lockPeriod: "30 days",
  },
  {
    id: "3",
    name: "TON 90-Day Lock",
    apy: "12.0%",
    tvl: "$5.1M",
    minStake: "50 TON",
    lockPeriod: "90 days",
  },
];

function PoolCard({ pool }: { pool: StakingPool }) {
  return (
    <Card style={styles.poolCard}>
      <CardContent style={styles.poolContent}>
        <View style={styles.poolHeader}>
          <View>
            <Text style={styles.poolName}>{pool.name}</Text>
            <Text style={styles.poolTvl}>TVL: {pool.tvl}</Text>
          </View>
          <View style={styles.apyBadge}>
            <Text style={styles.apyText}>{pool.apy} APY</Text>
          </View>
        </View>
        
        <View style={styles.poolDetails}>
          <View style={styles.poolDetailItem}>
            <Icon name="solar:lock-keyhole-linear" size={14} color="#6b7280" />
            <Text style={styles.poolDetailText}>{pool.lockPeriod}</Text>
          </View>
          <Text style={styles.poolDetailText}>Min: {pool.minStake}</Text>
        </View>

        <Pressable style={styles.stakeButton}>
          <Text style={styles.stakeButtonText}>Stake Now</Text>
        </Pressable>
      </CardContent>
    </Card>
  );
}

export default function Staking() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="solar:arrow-left-linear" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Staking</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Stats Overview */}
        <Card style={styles.statsCard}>
          <CardContent style={styles.statsContent}>
            <View style={styles.statItem}>
              <Icon name="solar:graph-new-up-linear" size={24} color="#22c55e" />
              <Text style={styles.statLabel}>Total Staked</Text>
              <Text style={styles.statValue}>0 TON</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="solar:gift-linear" size={24} color="#fb923c" />
              <Text style={styles.statLabel}>Rewards</Text>
              <Text style={styles.statValue}>0 TON</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="solar:clock-circle-linear" size={24} color="#3b82f6" />
              <Text style={styles.statLabel}>Active Stakes</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
          </CardContent>
        </Card>

        {/* Staking Pools */}
        <Text style={styles.sectionTitle}>Available Pools</Text>
        {mockPools.map((pool) => (
          <PoolCard key={pool.id} pool={pool} />
        ))}

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <CardContent style={styles.infoContent}>
            <Icon name="solar:lightbulb-linear" size={20} color="#fb923c" />
            <Text style={styles.infoText}>
              Staking rewards are distributed automatically. Higher lock periods offer better APY rates.
            </Text>
          </CardContent>
        </Card>
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
  statsCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 24,
  },
  statsContent: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
    marginBottom: 12,
  },
  poolCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 12,
  },
  poolContent: {
    padding: 16,
  },
  poolHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  poolName: {
    fontSize: 16,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  poolTvl: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    marginTop: 2,
  },
  apyBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  apyText: {
    fontSize: 14,
    fontFamily: "Onest_700Bold",
    color: "#22c55e",
  },
  poolDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  poolDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  poolDetailText: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
  },
  stakeButton: {
    backgroundColor: "#fb923c",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  stakeButtonText: {
    fontSize: 14,
    fontFamily: "Onest_600SemiBold",
    color: "#000",
  },
  infoCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    marginTop: 12,
  },
  infoContent: {
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    lineHeight: 20,
  },
});
