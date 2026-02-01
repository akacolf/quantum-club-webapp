import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
import { ThemeProvider, useTheme } from "~/lib/theme";

function RootLayoutContent() {
  const { isDark, colorScheme } = useTheme();
  
  return (
    <View className={`flex-1 ${isDark ? 'dark' : ''}`}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: isDark ? "#0A0B1E" : "#FFFFFF" },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(wallet)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
