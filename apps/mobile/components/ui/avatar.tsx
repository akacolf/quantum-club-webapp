import * as React from "react";
import { View, Image, type ViewProps, type ImageProps } from "react-native";
import { cn } from "~/lib/utils";
import { Text } from "~/components/ui/text";

interface AvatarProps extends ViewProps {
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const Avatar = React.forwardRef<React.ElementRef<typeof View>, AvatarProps>(
  ({ className, size = "md", ...props }, ref) => (
    <View
      ref={ref}
      className={cn(
        "relative rounded-full overflow-hidden bg-muted",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Avatar.displayName = "Avatar";

interface AvatarImageProps extends Omit<ImageProps, "source" | "src"> {
  src?: string | null | undefined;
}

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof Image>,
  AvatarImageProps
>(({ className, src, ...props }, ref) => {
  if (!src) return null;

  return (
    <Image
      ref={ref}
      source={{ uri: src }}
      className={cn("absolute inset-0 w-full h-full", className)}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

interface AvatarFallbackProps extends ViewProps {
  children?: React.ReactNode;
}

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof View>,
  AvatarFallbackProps
>(({ className, children, ...props }, ref) => (
  <View
    ref={ref}
    className={cn(
      "absolute inset-0 w-full h-full items-center justify-center bg-muted",
      className
    )}
    {...props}
  >
    {typeof children === "string" ? (
      <Text className="text-muted-foreground font-medium">{children}</Text>
    ) : (
      children
    )}
  </View>
));
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
export type { AvatarProps, AvatarImageProps, AvatarFallbackProps };
