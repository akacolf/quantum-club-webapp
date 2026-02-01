import { View, TextInput, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { ArrowLeft, Scan, ChevronDown } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Send() {
  const router = useRouter();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground">Send</Text>
        <TouchableOpacity>
          <Scan size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-4">
        {/* Recipient Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-foreground mb-2">Recipient Address</Text>
          <TextInput
            className="bg-secondary rounded-xl p-4 text-base text-foreground border border-border"
            value={recipient}
            onChangeText={setRecipient}
            placeholder="Enter wallet address"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Amount Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-foreground mb-2">Amount</Text>
          <View className="flex-row items-center">
            <TextInput
              className="flex-1 bg-secondary rounded-l-xl p-4 text-base text-foreground border border-border border-r-0"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#6B7280"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity className="bg-secondary/80 p-4 rounded-r-xl border border-border flex-row items-center">
              <Text className="text-base font-semibold text-foreground mr-1">TON</Text>
              <ChevronDown size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-muted-foreground mt-2">Balance: 0.00 TON</Text>
        </View>

        {/* Quick Amount Buttons */}
        <View className="flex-row gap-2 mb-6">
          <TouchableOpacity className="flex-1 bg-secondary py-2 rounded-lg items-center">
            <Text className="text-sm text-foreground">25%</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-secondary py-2 rounded-lg items-center">
            <Text className="text-sm text-foreground">50%</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-secondary py-2 rounded-lg items-center">
            <Text className="text-sm text-foreground">75%</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-primary py-2 rounded-lg items-center">
            <Text className="text-sm text-primary-foreground font-medium">MAX</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction Summary */}
        <Card className="bg-secondary mb-6">
          <CardContent className="p-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-muted-foreground">Network Fee</Text>
              <Text className="text-sm text-foreground">~0.01 TON</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted-foreground">You'll Send</Text>
              <Text className="text-sm font-medium text-foreground">{amount || "0.00"} TON</Text>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* Send Button */}
      <View className="px-4 pb-4">
        <Button
          className={`w-full py-4 rounded-xl ${recipient && amount ? 'bg-green-500' : 'bg-muted'}`}
          disabled={!recipient || !amount}
        >
          <Text className="text-lg font-semibold text-foreground">Send</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
