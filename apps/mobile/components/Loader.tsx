import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

interface LoaderProps {
  size?: "small" | "medium" | "large";
  color?: string;
  fullScreen?: boolean;
}

export function Loader({ 
  size = "medium", 
  color = "#fff",
  fullScreen = true 
}: LoaderProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const sizeMap = {
    small: 24,
    medium: 40,
    large: 56,
  };

  const spinnerSize = sizeMap[size];

  const spinner = (
    <Animated.View
      style={[
        styles.spinner,
        animatedStyle,
        {
          width: spinnerSize,
          height: spinnerSize,
          borderWidth: size === "small" ? 2 : 3,
          borderColor: "rgba(255,255,255,0.2)",
          borderTopColor: color,
        },
      ]}
    />
  );

  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        {spinner}
      </View>
    );
  }

  return spinner;
}

// Simple loading screen for route transitions
export function LoadingScreen() {
  return (
    <View style={styles.fullScreen}>
      <Loader size="large" />
    </View>
  );
}

// Inline loader for buttons and small areas
export function InlineLoader({ color = "#000" }: { color?: string }) {
  return <ActivityIndicator size="small" color={color} />;
}

const styles = StyleSheet.create({
  fullScreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    zIndex: 9999,
  },
  spinner: {
    borderRadius: 999,
  },
});
