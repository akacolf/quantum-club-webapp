import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  SlideInUp,
  SlideOutDown,
  FadeInDown,
  FadeOutUp,
  ZoomIn,
  ZoomOut,
  BounceIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useEffect } from "react";

type AnimationType = 
  | "fade"
  | "slideRight"
  | "slideUp"
  | "fadeUp"
  | "zoom"
  | "bounce"
  | "spring";

interface AnimatedScreenProps {
  children: React.ReactNode;
  animation?: AnimationType;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

// Get entering animation based on type
function getEnteringAnimation(type: AnimationType, duration: number, delay: number) {
  switch (type) {
    case "fade":
      return FadeIn.duration(duration).delay(delay);
    case "slideRight":
      return SlideInRight.duration(duration).delay(delay).springify();
    case "slideUp":
      return SlideInUp.duration(duration).delay(delay).springify();
    case "fadeUp":
      return FadeInDown.duration(duration).delay(delay);
    case "zoom":
      return ZoomIn.duration(duration).delay(delay).springify();
    case "bounce":
      return BounceIn.duration(duration).delay(delay);
    case "spring":
      return FadeIn.duration(duration).delay(delay).springify();
    default:
      return FadeIn.duration(duration).delay(delay);
  }
}

// Get exiting animation based on type
function getExitingAnimation(type: AnimationType, duration: number) {
  switch (type) {
    case "fade":
      return FadeOut.duration(duration);
    case "slideRight":
      return SlideOutLeft.duration(duration);
    case "slideUp":
      return SlideOutDown.duration(duration);
    case "fadeUp":
      return FadeOutUp.duration(duration);
    case "zoom":
      return ZoomOut.duration(duration);
    case "bounce":
      return FadeOut.duration(duration);
    case "spring":
      return FadeOut.duration(duration);
    default:
      return FadeOut.duration(duration);
  }
}

export function AnimatedScreen({
  children,
  animation = "fade",
  delay = 0,
  duration = 350,
  style,
}: AnimatedScreenProps) {
  return (
    <Animated.View
      entering={getEnteringAnimation(animation, duration, delay)}
      exiting={getExitingAnimation(animation, duration)}
      style={[styles.container, style]}
    >
      {children}
    </Animated.View>
  );
}

// Animated card component with staggered entrance
interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  style?: ViewStyle;
}

export function AnimatedCard({ children, index = 0, style }: AnimatedCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(index * 80).springify()}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

// Animated pressable with scale feedback
interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export function AnimatedPressable({ 
  children, 
  onPress, 
  style,
  disabled 
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Animated.View
        onTouchStart={disabled ? undefined : handlePressIn}
        onTouchEnd={disabled ? undefined : handlePressOut}
        onTouchCancel={disabled ? undefined : handlePressOut}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

// Animated list item with slide-in
interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  style?: ViewStyle;
}

export function AnimatedListItem({ children, index, style }: AnimatedListItemProps) {
  return (
    <Animated.View
      entering={SlideInRight.duration(300).delay(index * 50).springify()}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

// Fade in view with configurable parameters
interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

export function FadeInView({ 
  children, 
  delay = 0, 
  duration = 400,
  style 
}: FadeInViewProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration });
      translateY.value = withSpring(0, { damping: 20 });
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

// Shimmer/skeleton loading animation
export function ShimmerView({ style }: { style?: ViewStyle }) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withTiming(1, { duration: 1500 }, () => {
      shimmer.value = 0;
    });
    // Loop
    const interval = setInterval(() => {
      shimmer.value = withTiming(1, { duration: 1500 }, () => {
        shimmer.value = 0;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      shimmer.value,
      [0, 0.5, 1],
      [0.3, 0.6, 0.3],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <Animated.View style={[styles.shimmer, animatedStyle, style]} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  shimmer: {
    backgroundColor: "#333",
    borderRadius: 8,
  },
});
