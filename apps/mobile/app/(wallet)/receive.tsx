import { View, TouchableOpacity } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { ArrowLeft, Copy, Check, Share2 } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "~/lib/theme";

export default function Receive() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const walletAddress = "EQDrLq-X6jKZNHAScgghh0h1iog3StK71zn8dcmrOj8jPWRA"; // Placeholder
  const { isDark } = useTheme();
  const iconColor = isDark ? "#fff" : "#1f2937";

  const handleCopy = async () => {
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={iconColor} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground">Receive</Text>
        <TouchableOpacity>
          <Share2 size={24} color={iconColor} />
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-4 items-center">
        {/* QR Code Placeholder */}
        <View className="mt-8 mb-8">
          <View className="w-52 h-52 bg-white rounded-2xl justify-center items-center p-4">
            <View className="w-full h-full bg-gray-100 rounded-lg justify-center items-center">
              <Text className="text-6xl">📱</Text>
              <Text className="text-sm text-gray-500 mt-2">QR Code</Text>
            </View>
          </View>
        </View>

        {/* Address Card */}
        <Card className="w-full bg-secondary mb-4">
          <CardContent className="p-4">
            <Text className="text-xs text-muted-foreground text-center mb-3">Your TON Address</Text>
            <Text className="text-sm font-mono text-foreground text-center" numberOfLines={1}>
              {shortenAddress(walletAddress)}
            </Text>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <View className="flex-row gap-3 w-full">
          <Button
            className="flex-1 bg-primary py-3 flex-row items-center justify-center gap-2"
            onPress={handleCopy}
          >
            {copied ? (
              <Check size={20} color="#0A0B1E" />
            ) : (
              <Copy size={20} color="#0A0B1E" />
            )}
            <Text className="text-base font-medium text-primary-foreground">
              {copied ? "Copied!" : "Copy"}
            </Text>
          </Button>
          <Button className="flex-1 bg-secondary py-3 flex-row items-center justify-center gap-2">
            <Share2 size={20} color="#fff" />
            <Text className="text-base font-medium text-foreground">Share</Text>
          </Button>
        </View>

        {/* Info */}
        <View className="mt-8 px-6">
          <Text className="text-sm text-muted-foreground text-center leading-5">
            Share this address to receive TON or other supported tokens on the TON blockchain.
          </Text>
        </View>

        {/* Supported Tokens */}
        <Card className="w-full bg-secondary mt-6">
          <CardContent className="p-4">
            <Text className="text-xs text-muted-foreground text-center mb-3">Supported tokens</Text>
            <View className="flex-row justify-center gap-4">
              <View className="items-center">
                <View className="w-10 h-10 rounded-full bg-blue-500 justify-center items-center mb-1">
                  <Text className="text-lg">💎</Text>
                </View>
                <Text className="text-xs text-foreground">TON</Text>
              </View>
              <View className="items-center">
                <View className="w-10 h-10 rounded-full bg-yellow-500 justify-center items-center mb-1">
                  <Text className="text-lg">🪙</Text>
                </View>
                <Text className="text-xs text-foreground">USDT</Text>
              </View>
              <View className="items-center">
                <View className="w-10 h-10 rounded-full bg-purple-500 justify-center items-center mb-1">
                  <Text className="text-lg">⚡</Text>
                </View>
                <Text className="text-xs text-foreground">Jettons</Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>
    </SafeAreaView>
  );
}
