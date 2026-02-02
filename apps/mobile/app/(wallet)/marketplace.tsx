import { View, ScrollView, Pressable, StyleSheet, Linking, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const categories = [
  { name: "Art", icon: "color-palette", color: "#a855f7" },
  { name: "Gaming", icon: "game-controller", color: "#3b82f6" },
  { name: "Collectibles", icon: "diamond", color: "#22c55e" },
  { name: "Music", icon: "musical-notes", color: "#f43f5e" },
  { name: "Photography", icon: "camera", color: "#fb923c" },
  { name: "Sports", icon: "football", color: "#14b8a6" },
];

export default function Marketplace() {
  const router = useRouter();

  const handleTelegram = () => {
    Linking.openURL("https://t.me/quantumclubinc");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>NFT Marketplace</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Coming Soon Card */}
        <Card style={styles.comingSoonCard}>
          <CardContent style={styles.comingSoonContent}>
            <View style={styles.comingSoonIcon}>
              <Ionicons name="color-palette" size={48} color="#a855f7" />
            </View>
            <Text style={styles.comingSoonTitle}>Collections are coming soon!</Text>
            <Text style={styles.comingSoonSubtitle}>
              Make sure to follow our Telegram channel for updates.
            </Text>
            <Pressable style={styles.telegramButton} onPress={handleTelegram}>
              <Ionicons name="paper-plane" size={18} color="#fff" />
              <Text style={styles.telegramButtonText}>t.me/quantumclubinc</Text>
            </Pressable>
          </CardContent>
        </Card>

        {/* NFT Categories */}
        <Text style={styles.sectionTitle}>Browse by Category</Text>
        <View style={styles.categoriesGrid}>
          {categories.map((category) => (
            <Pressable key={category.name} style={styles.categoryCard}>
              <Card style={styles.categoryCardInner}>
                <CardContent style={styles.categoryContent}>
                  <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
                    <Ionicons 
                      name={category.icon as keyof typeof Ionicons.glyphMap} 
                      size={28} 
                      color={category.color} 
                    />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </CardContent>
              </Card>
            </Pressable>
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
  comingSoonCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 24,
  },
  comingSoonContent: {
    padding: 24,
    alignItems: "center",
  },
  comingSoonIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(168, 85, 247, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontFamily: "Onest_700Bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  comingSoonSubtitle: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  telegramButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0088cc",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  telegramButtonText: {
    fontSize: 14,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCard: {
    width: CARD_WIDTH,
    marginBottom: 12,
  },
  categoryCardInner: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  categoryContent: {
    padding: 20,
    alignItems: "center",
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
  },
});
