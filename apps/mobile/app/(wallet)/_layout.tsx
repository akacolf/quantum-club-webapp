import { Stack } from "expo-router";

export default function WalletLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0A0B1E" },
        headerTintColor: "#FFFFFF",
        contentStyle: { backgroundColor: "#0A0B1E" },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="send" />
      <Stack.Screen name="receive" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="history" />
    </Stack>
  );
}
