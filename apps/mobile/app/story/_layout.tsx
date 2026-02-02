import { Stack } from "expo-router";

export default function StoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        presentation: "fullScreenModal",
      }}
    />
  );
}
