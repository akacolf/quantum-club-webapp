import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
import {
  useFonts,
  Onest_400Regular,
  Onest_500Medium,
  Onest_600SemiBold,
  Onest_700Bold,
} from "@expo-google-fonts/onest";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GameProvider } from "~/contexts/GameContext";

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GameProvider>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#000" },
              animation: "fade_from_bottom",
              animationDuration: 250,
            }}
          >
            <Stack.Screen 
              name="index" 
              options={{ animation: "fade" }}
            />
            <Stack.Screen 
              name="(tabs)" 
              options={{ 
                headerShown: false,
                animation: "fade",
              }} 
            />
            <Stack.Screen 
              name="(wallet)" 
              options={{ 
                headerShown: false,
                animation: "slide_from_right",
                animationDuration: 300,
              }} 
            />
            <Stack.Screen 
              name="auth" 
              options={{ 
                animation: "fade",
                animationDuration: 400,
              }} 
            />
            <Stack.Screen 
              name="profile" 
              options={{ 
                headerShown: false,
                animation: "slide_from_bottom",
                animationDuration: 300,
                presentation: "modal",
              }} 
            />
            <Stack.Screen 
              name="story" 
              options={{ 
                animation: "fade",
                animationDuration: 300,
                presentation: "fullScreenModal",
              }} 
            />
            <Stack.Screen 
              name="legal" 
              options={{ 
                animation: "slide_from_right",
              }} 
            />
            <Stack.Screen 
              name="leaderboard" 
              options={{ 
                animation: "slide_from_right",
              }} 
            />
            <Stack.Screen 
              name="chat" 
              options={{ 
                animation: "slide_from_right",
              }} 
            />
            <Stack.Screen 
              name="trade" 
              options={{ 
                animation: "slide_from_bottom",
                presentation: "modal",
              }} 
            />
          </Stack>
          <StatusBar style="light" />
        </View>
      </GameProvider>
    </SafeAreaProvider>
  );
}
