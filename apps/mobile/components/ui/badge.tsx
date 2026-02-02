import * as React from "react";
import { View, type ViewProps } from "react-native";
import { cn } from "~/lib/utils";

interface BadgeProps extends ViewProps {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

const badgeVariants = {
  default: "bg-primary",
  secondary: "bg-secondary",
  destructive: "bg-destructive",
  outline: "border border-border bg-transparent",
};

const Badge = React.forwardRef<React.ElementRef<typeof View>, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <View
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-2 py-0.5",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };
export type { BadgeProps };
