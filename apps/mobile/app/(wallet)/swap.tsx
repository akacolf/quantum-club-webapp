import { View, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ArrowDownUp, ChevronDown, Settings } from "lucide-react-native";
import { useTheme } from "~/lib/theme";

interface Token {
  symbol: string;
  name: string;
  balance: string;
  icon: string;
}

const tokens: Token[] = [
  { symbol: "TON", name: "Toncoin", balance: "100.00", icon: "💎" },
  { symbol: "USDT", name: "Tether USD", balance: "250.00", icon: "💵" },
  { symbol: "JETTON", name: "Jetton", balance: "1000.00", icon: "🪙" },
];

export default function Swap() {
  const router = useRouter();
  const { isDark } = useTheme();
  const iconColor = isDark ? "#fff" : "#1f2937";
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";
  
  const [fromToken, setFromToken] = useState<Token>(tokens[0]);
  const [toToken, setToToken] = useState<Token>(tokens[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={iconColor} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground">Swap</Text>
        <TouchableOpacity>
          <Settings size={24} color={iconColor} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* From Token */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <Text className="text-xs text-muted-foreground mb-2">From</Text>
            <View className="flex-row items-center justify-between">
              <TouchableOpacity className="flex-row items-center bg-muted px-3 py-2 rounded-lg">
                <Text className="text-xl mr-2">{fromToken.icon}</Text>
                <Text className="text-base font-medium text-foreground">{fromToken.symbol}</Text>
                <ChevronDown size={16} color={mutedColor} className="ml-1" />
              </TouchableOpacity>
              <TextInput
                className="flex-1 text-right text-2xl font-bold text-foreground ml-4"
                placeholder="0.0"
                placeholderTextColor={mutedColor}
                keyboardType="decimal-pad"
                value={fromAmount}
                onChangeText={setFromAmount}
              />
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-muted-foreground">
                Balance: {fromToken.balance} {fromToken.symbol}
              </Text>
              <TouchableOpacity onPress={() => setFromAmount(fromToken.balance)}>
                <Text className="text-xs text-primary font-medium">MAX</Text>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>

        {/* Swap Button */}
        <View className="items-center -my-3 z-10">
          <TouchableOpacity
            className="w-12 h-12 bg-primary rounded-full items-center justify-center shadow-lg"
            onPress={handleSwapTokens}
          >
            <ArrowDownUp size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* To Token */}
        <Card>
          <CardContent className="p-4">
            <Text className="text-xs text-muted-foreground mb-2">To</Text>
            <View className="flex-row items-center justify-between">
              <TouchableOpacity className="flex-row items-center bg-muted px-3 py-2 rounded-lg">
                <Text className="text-xl mr-2">{toToken.icon}</Text>
                <Text className="text-base font-medium text-foreground">{toToken.symbol}</Text>
                <ChevronDown size={16} color={mutedColor} className="ml-1" />
              </TouchableOpacity>
              <TextInput
                className="flex-1 text-right text-2xl font-bold text-foreground ml-4"
                placeholder="0.0"
                placeholderTextColor={mutedColor}
                keyboardType="decimal-pad"
                value={toAmount}
                onChangeText={setToAmount}
                editable={false}
              />
            </View>
            <Text className="text-xs text-muted-foreground mt-2">
              Balance: {toToken.balance} {toToken.symbol}
            </Text>
          </CardContent>
        </Card>

        {/* Swap Details */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-muted-foreground">Rate</Text>
              <Text className="text-sm text-foreground">1 {fromToken.symbol} ≈ 2.5 {toToken.symbol}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-muted-foreground">Fee</Text>
              <Text className="text-sm text-foreground">0.3%</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted-foreground">Slippage</Text>
              <Text className="text-sm text-foreground">0.5%</Text>
            </View>
          </CardContent>
        </Card>

        {/* Swap Button */}
        <TouchableOpacity
          className="bg-primary py-4 rounded-xl mt-6 mb-8 items-center"
          disabled={!fromAmount}
        >
          <Text className="text-lg font-semibold text-primary-foreground">
            {fromAmount ? "Swap" : "Enter an amount"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
