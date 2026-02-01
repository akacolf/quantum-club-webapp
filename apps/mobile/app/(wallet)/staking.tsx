import { View, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, TrendingUp, Lock, Clock, Percent } from "lucide-react-native";
import { useTheme } from "~/lib/theme";

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
  const { isDark } = useTheme();
  const iconColor = isDark ? "#fff" : "#1f2937";
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <Text className="text-base font-semibold text-foreground">{pool.name}</Text>
            <Text className="text-xs text-muted-foreground">TVL: {pool.tvl}</Text>
          </View>
          <View className="bg-green-500/20 px-2 py-1 rounded-full">
            <Text className="text-sm font-bold text-green-500">{pool.apy} APY</Text>
          </View>
        </View>
        
        <View className="flex-row justify-between mt-2">
          <View className="flex-row items-center">
            <Lock size={14} color={mutedColor} />
            <Text className="text-xs text-muted-foreground ml-1">{pool.lockPeriod}</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-xs text-muted-foreground">Min: {pool.minStake}</Text>
          </View>
        </View>

        <TouchableOpacity className="bg-primary mt-4 py-2 rounded-lg items-center">
          <Text className="text-primary-foreground font-medium">Stake Now</Text>
        </TouchableOpacity>
      </CardContent>
    </Card>
  );
}

export default function Staking() {
  const router = useRouter();
  const { isDark } = useTheme();
  const iconColor = isDark ? "#fff" : "#1f2937";

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={iconColor} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground ml-4">Staking</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Stats Overview */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <TrendingUp size={24} color="#10b981" />
                <Text className="text-xs text-muted-foreground mt-1">Total Staked</Text>
                <Text className="text-lg font-bold text-foreground">0 TON</Text>
              </View>
              <View className="items-center flex-1">
                <Percent size={24} color="#6366f1" />
                <Text className="text-xs text-muted-foreground mt-1">Rewards</Text>
                <Text className="text-lg font-bold text-foreground">0 TON</Text>
              </View>
              <View className="items-center flex-1">
                <Clock size={24} color="#f59e0b" />
                <Text className="text-xs text-muted-foreground mt-1">Active Stakes</Text>
                <Text className="text-lg font-bold text-foreground">0</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Staking Pools */}
        <Text className="text-lg font-semibold text-foreground mb-3">Available Pools</Text>
        {mockPools.map((pool) => (
          <PoolCard key={pool.id} pool={pool} />
        ))}

        {/* Info Card */}
        <Card className="mt-4 mb-8">
          <CardContent className="p-4">
            <Text className="text-sm text-muted-foreground">
              💡 Staking rewards are distributed automatically. Higher lock periods offer better APY rates.
            </Text>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
