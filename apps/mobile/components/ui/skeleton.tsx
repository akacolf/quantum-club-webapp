import * as React from "react";
import { View, type ViewProps, Animated, Easing, type StyleProp, type ViewStyle } from "react-native";
import { cn } from "~/lib/utils";

interface SkeletonProps extends ViewProps {
  /** Width of the skeleton (number or "100%") */
  width?: number | `${number}%`;
  /** Height of the skeleton (number or "100%") */
  height?: number | `${number}%`;
}

const Skeleton = React.forwardRef<React.ElementRef<typeof View>, SkeletonProps>(
  ({ className, width, height, style, ...props }, ref) => {
    const opacity = React.useRef(new Animated.Value(0.4)).current;

    React.useEffect(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 750,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 750,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }, [opacity]);

    return (
      <Animated.View
        ref={ref}
        style={[{ opacity, width, height }, style]}
        className={cn("rounded-md bg-muted", className)}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
export type { SkeletonProps };
