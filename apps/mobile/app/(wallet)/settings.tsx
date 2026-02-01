import { View, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  Palette,
  Globe,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Key,
  Smartphone,
  LucideIcon,
} from "lucide-react-native";

interface SettingItemProps {
  Icon: LucideIcon;
  label: string;
  description?: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingItem({ Icon, label, description, onPress, danger }: SettingItemProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-4 border-b border-border"
      onPress={onPress}
    >
      <View className={`w-10 h-10 rounded-full ${danger ? 'bg-red-500/20' : 'bg-secondary'} justify-center items-center mr-3`}>
        <Icon size={20} color={danger ? "#EF4444" : "#fff"} />
      </View>
      <View className="flex-1">
        <Text className={`text-base ${danger ? 'text-red-500' : 'text-foreground'}`}>{label}</Text>
        {description && (
          <Text className="text-xs text-muted-foreground mt-0.5">{description}</Text>
        )}
      </View>
      <ChevronRight size={20} color="#6B7280" />
    </TouchableOpacity>
  );
}

export default function Settings() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground ml-4">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Profile Section */}
        <Card className="bg-secondary mb-6">
          <CardContent className="p-4">
            <View className="flex-row items-center">
              <View className="w-16 h-16 rounded-full bg-primary justify-center items-center mr-4">
                <Text className="text-2xl">👤</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-foreground">Quantum User</Text>
                <Text className="text-sm text-muted-foreground">Connected via Telegram</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Text className="text-sm font-medium text-muted-foreground mb-3 uppercase">Security</Text>
        <Card className="bg-secondary mb-6">
          <CardContent className="px-4 py-0">
            <SettingItem
              Icon={Key}
              label="Recovery Phrase"
              description="Backup your wallet"
              onPress={() => {}}
            />
            <SettingItem
              Icon={Shield}
              label="Security Settings"
              description="PIN, biometrics"
              onPress={() => {}}
            />
            <SettingItem
              Icon={Smartphone}
              label="Connected Apps"
              description="Manage dApp connections"
              onPress={() => {}}
            />
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Text className="text-sm font-medium text-muted-foreground mb-3 uppercase">Preferences</Text>
        <Card className="bg-secondary mb-6">
          <CardContent className="px-4 py-0">
            <SettingItem
              Icon={Bell}
              label="Notifications"
              description="Price alerts, transactions"
              onPress={() => {}}
            />
            <SettingItem
              Icon={Palette}
              label="Appearance"
              description="Dark mode, themes"
              onPress={() => {}}
            />
            <SettingItem
              Icon={Globe}
              label="Language"
              description="English"
              onPress={() => {}}
            />
          </CardContent>
        </Card>

        {/* Support Section */}
        <Text className="text-sm font-medium text-muted-foreground mb-3 uppercase">Support</Text>
        <Card className="bg-secondary mb-6">
          <CardContent className="px-4 py-0">
            <SettingItem
              Icon={HelpCircle}
              label="Help Center"
              onPress={() => {}}
            />
            <SettingItem
              Icon={FileText}
              label="Terms of Service"
              onPress={() => {}}
            />
          </CardContent>
        </Card>

        {/* Logout */}
        <Card className="bg-secondary mb-8">
          <CardContent className="px-4 py-0">
            <SettingItem
              Icon={LogOut}
              label="Log Out"
              danger
              onPress={() => {}}
            />
          </CardContent>
        </Card>

        {/* Version */}
        <Text className="text-xs text-muted-foreground text-center mb-8">
          Quantum Club v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
