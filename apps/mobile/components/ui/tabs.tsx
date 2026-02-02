import * as React from "react";
import { View, Pressable, type ViewProps, type PressableProps } from "react-native";
import { cn } from "~/lib/utils";
import { TextClassContext } from "~/components/ui/text";

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | null>(null);

function useTabs() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
}

interface TabsProps extends ViewProps {
  value: string;
  onValueChange: (value: string) => void;
}

const Tabs = React.forwardRef<React.ElementRef<typeof View>, TabsProps>(
  ({ className, value, onValueChange, ...props }, ref) => (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <View ref={ref} className={cn("flex-1", className)} {...props} />
    </TabsContext.Provider>
  )
);
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
  React.ElementRef<typeof View>,
  ViewProps
>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn(
      "flex-row items-center justify-center rounded-lg bg-muted p-1",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

interface TabsTriggerProps extends PressableProps {
  value: string;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  TabsTriggerProps
>(({ className, value, children, ...props }, ref) => {
  const { value: selectedValue, onValueChange } = useTabs();
  const isSelected = selectedValue === value;

  return (
    <TextClassContext.Provider
      value={cn(
        "text-sm font-medium",
        isSelected ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <Pressable
        ref={ref}
        onPress={() => onValueChange(value)}
        className={cn(
          "flex-1 items-center justify-center rounded-md py-2 px-3",
          isSelected && "bg-background shadow-sm",
          className
        )}
        {...props}
      >
        {children}
      </Pressable>
    </TextClassContext.Provider>
  );
});
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends ViewProps {
  value: string;
}

const TabsContent = React.forwardRef<
  React.ElementRef<typeof View>,
  TabsContentProps
>(({ className, value, ...props }, ref) => {
  const { value: selectedValue } = useTabs();

  if (selectedValue !== value) {
    return null;
  }

  return (
    <View ref={ref} className={cn("flex-1 mt-2", className)} {...props} />
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type { TabsProps, TabsTriggerProps, TabsContentProps };
