import { View, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react-native";
import { useTheme } from "~/lib/theme";

interface Transaction {
  id: string;
  type: "send" | "receive" | "swap";
  amount: string;
  token: string;
  address: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "receive",
    amount: "+10.5",
    token: "TON",
    address: "EQDr...PWRA",
    timestamp: "Today, 2:30 PM",
    status: "completed",
  },
  {
    id: "2",
    type: "send",
    amount: "-5.0",
    token: "TON",
    address: "EQAb...X3tK",
    timestamp: "Today, 11:15 AM",
    status: "completed",
  },
  {
    id: "3",
    type: "swap",
    amount: "100",
    token: "USDT → TON",
    address: "",
    timestamp: "Yesterday, 4:45 PM",
    status: "completed",
  },
];

function TransactionItem({ tx }: { tx: Transaction }) {
  const getIcon = () => {
    switch (tx.type) {
      case "send":
        return <ArrowUpRight size={20} color="#EF4444" />;
      case "receive":
        return <ArrowDownLeft size={20} color="#10B981" />;
      case "swap":
        return <RefreshCw size={20} color="#6366F1" />;
    }
  };

  const getBgColor = () => {
    switch (tx.type) {
      case "send":
        return "bg-red-500/20";
      case "receive":
        return "bg-green-500/20";
      case "swap":
        return "bg-indigo-500/20";
    }
  };

  const getAmountColor = () => {
    switch (tx.type) {
      case "send":
        return "text-red-500";
      case "receive":
        return "text-green-500";
      case "swap":
        return "text-foreground";
    }
  };

  return (
    <TouchableOpacity className="flex-row items-center py-4 border-b border-border">
      <View className={`w-10 h-10 rounded-full ${getBgColor()} justify-center items-center mr-3`}>
        {getIcon()}
      </View>
      <View className="flex-1">
        <Text className="text-base text-foreground capitalize">{tx.type}</Text>
        <Text className="text-xs text-muted-foreground">{tx.timestamp}</Text>
      </View>
      <View className="items-end">
        <Text className={`text-base font-medium ${getAmountColor()}`}>
          {tx.amount} {tx.token}
        </Text>
        <Text className="text-xs text-muted-foreground capitalize">{tx.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function History() {
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
        <Text className="text-lg font-semibold text-foreground ml-4">Transaction History</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Filter Tabs */}
        <View className="flex-row gap-2 mb-4">
          <TouchableOpacity className="px-4 py-2 bg-primary rounded-full">
            <Text className="text-sm font-medium text-primary-foreground">All</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-4 py-2 bg-secondary rounded-full">
            <Text className="text-sm text-foreground">Sent</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-4 py-2 bg-secondary rounded-full">
            <Text className="text-sm text-foreground">Received</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-4 py-2 bg-secondary rounded-full">
            <Text className="text-sm text-foreground">Swaps</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions List */}
        <Card className="bg-secondary">
          <CardContent className="px-4 py-0">
            {mockTransactions.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
          </CardContent>
        </Card>

        {/* Empty State (hidden when there are transactions) */}
        {mockTransactions.length === 0 && (
          <Card className="bg-secondary">
            <CardContent className="p-8 items-center">
              <Text className="text-4xl mb-4">📭</Text>
              <Text className="text-base font-medium text-foreground mb-2">No transactions yet</Text>
              <Text className="text-sm text-muted-foreground text-center">
                Your transaction history will appear here
              </Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
