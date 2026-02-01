import { View, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Send } from "lucide-react-native";
import { useTheme } from "~/lib/theme";

export default function Marketplace() {
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
        <Text className="text-lg font-semibold text-foreground ml-4">NFT Marketplace</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Coming Soon Card */}
        <Card className="mt-4">
          <CardContent className="p-6 items-center">
            <Text className="text-5xl mb-4">🎨</Text>
            <Text className="text-xl font-bold text-foreground text-center mb-2">
              Collections are coming soon!
            </Text>
            <Text className="text-sm text-muted-foreground text-center mb-4">
              Make sure to follow our Telegram channel for updates.
            </Text>
            <TouchableOpacity className="flex-row items-center bg-primary px-4 py-2 rounded-full">
              <Send size={16} color="#fff" className="mr-2" />
              <Text className="text-primary-foreground font-medium ml-2">
                t.me/quantumclubinc
              </Text>
            </TouchableOpacity>
          </CardContent>
        </Card>

        {/* NFT Categories */}
        <Text className="text-lg font-semibold text-foreground mt-6 mb-4">Browse by Category</Text>
        <View className="flex-row flex-wrap justify-between">
          {["Art", "Gaming", "Collectibles", "Music", "Photography", "Sports"].map((category) => (
            <TouchableOpacity
              key={category}
              className="w-[48%] mb-3"
            >
              <Card>
                <CardContent className="p-4 items-center">
                  <Text className="text-2xl mb-2">
                    {category === "Art" && "🎨"}
                    {category === "Gaming" && "🎮"}
                    {category === "Collectibles" && "💎"}
                    {category === "Music" && "🎵"}
                    {category === "Photography" && "📷"}
                    {category === "Sports" && "⚽"}
                  </Text>
                  <Text className="text-sm font-medium text-foreground">{category}</Text>
                </CardContent>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
