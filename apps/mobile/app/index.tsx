import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useSession } from "~/lib/auth/client";

export default function Home() {
  const { data: session, isPending } = useSession();

  // Show loading state while checking auth
  if (isPending) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // Redirect to auth if not signed in
  if (!session) {
    return <Redirect href="/auth" />;
  }

  // Redirect to home tab if signed in
  return <Redirect href="/(tabs)/home" />;
}
