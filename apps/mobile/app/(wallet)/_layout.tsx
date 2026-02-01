import { Stack } from "expo-router";

export default function WalletLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0A0B1E" },
        headerTintColor: "#FFFFFF",
        contentStyle: { backgroundColor: "#0A0B1E" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Wallet",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="send"
        options={{
          title: "Send",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="receive"
        options={{
          title: "Receive",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
