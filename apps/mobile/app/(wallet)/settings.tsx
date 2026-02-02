import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  onPress?: () => void;
  danger?: boolean;
  rightElement?: React.ReactNode;
}

function SettingItem({ icon, label, description, onPress, danger, rightElement }: SettingItemProps) {
  return (
    <Pressable style={styles.settingItem} onPress={onPress}>
      <View style={[
        styles.settingIcon, 
        { backgroundColor: danger ? "rgba(239,68,68,0.1)" : "#1a1a1a" }
      ]}>
        <Ionicons name={icon} size={20} color={danger ? "#ef4444" : "#fff"} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>
          {label}
        </Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
      {rightElement ?? <Ionicons name="chevron-forward" size={20} color="#6b7280" />}
    </Pressable>
  );
}

function ThemeSelector() {
  // For now, fixed dark theme - can add theme switching later
  const theme = "dark";
  
  return (
    <View style={styles.themeSection}>
      <View style={styles.themeLabelRow}>
        <View style={styles.settingIcon}>
          <Ionicons name="color-palette-outline" size={20} color="#fff" />
        </View>
        <Text style={styles.settingLabel}>Appearance</Text>
      </View>
      <View style={styles.themeOptions}>
        <Pressable style={[styles.themeOption, theme === "light" && styles.themeOptionActive]}>
          <Ionicons name="sunny-outline" size={16} color={theme === "light" ? "#000" : "#fff"} />
          <Text style={[styles.themeOptionText, theme === "light" && styles.themeOptionTextActive]}>
            Light
          </Text>
        </Pressable>
        <Pressable style={[styles.themeOption, theme === "dark" && styles.themeOptionActive]}>
          <Ionicons name="moon-outline" size={16} color={theme === "dark" ? "#000" : "#fff"} />
          <Text style={[styles.themeOptionText, theme === "dark" && styles.themeOptionTextActive]}>
            Dark
          </Text>
        </Pressable>
        <Pressable style={[styles.themeOption, theme === "system" && styles.themeOptionActive]}>
          <Ionicons name="phone-portrait-outline" size={16} color={theme === "system" ? "#000" : "#fff"} />
          <Text style={[styles.themeOptionText, theme === "system" && styles.themeOptionTextActive]}>
            Auto
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function Settings() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <Card style={styles.profileCard}>
          <CardContent style={styles.profileContent}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={32} color="#fff" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Quantum User</Text>
              <Text style={styles.profileSubtitle}>Connected via Telegram</Text>
            </View>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Text style={styles.sectionTitle}>Security</Text>
        <Card style={styles.sectionCard}>
          <CardContent style={styles.sectionContent}>
            <SettingItem
              icon="key-outline"
              label="Recovery Phrase"
              description="Backup your wallet"
              onPress={() => {}}
            />
            <SettingItem
              icon="shield-outline"
              label="Security Settings"
              description="PIN, biometrics"
              onPress={() => {}}
            />
            <SettingItem
              icon="phone-portrait-outline"
              label="Connected Apps"
              description="Manage dApp connections"
              onPress={() => {}}
            />
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <Card style={styles.sectionCard}>
          <CardContent style={styles.sectionContent}>
            <SettingItem
              icon="notifications-outline"
              label="Notifications"
              description="Price alerts, transactions"
              onPress={() => {}}
            />
            <ThemeSelector />
            <SettingItem
              icon="globe-outline"
              label="Language"
              description="English"
              onPress={() => {}}
            />
          </CardContent>
        </Card>

        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support</Text>
        <Card style={styles.sectionCard}>
          <CardContent style={styles.sectionContent}>
            <SettingItem
              icon="help-circle-outline"
              label="Help Center"
              onPress={() => {}}
            />
            <SettingItem
              icon="document-text-outline"
              label="Terms of Service"
              onPress={() => {}}
            />
          </CardContent>
        </Card>

        {/* Logout */}
        <Card style={styles.sectionCard}>
          <CardContent style={styles.sectionContent}>
            <SettingItem
              icon="log-out-outline"
              label="Log Out"
              danger
              onPress={() => {}}
            />
          </CardContent>
        </Card>

        {/* Version */}
        <Text style={styles.versionText}>Quantum Club v1.0.0</Text>
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
  profileCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 24,
  },
  profileContent: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fb923c",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: "Onest_600SemiBold",
    color: "#fff",
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Onest_600SemiBold",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 1,
  },
  sectionCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 24,
  },
  sectionContent: {
    padding: 0,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: "Onest_500Medium",
    color: "#fff",
  },
  settingLabelDanger: {
    color: "#ef4444",
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    marginTop: 2,
  },
  themeSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  themeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  themeOptions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 52,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    gap: 6,
  },
  themeOptionActive: {
    backgroundColor: "#fff",
  },
  themeOptionText: {
    fontSize: 12,
    fontFamily: "Onest_500Medium",
    color: "#fff",
  },
  themeOptionTextActive: {
    color: "#000",
  },
  versionText: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    textAlign: "center",
  },
});
