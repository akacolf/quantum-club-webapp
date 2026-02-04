import React from "react";
import { Tabs } from "expo-router";
import { View, Pressable, Text, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from '@/components/icons';
import { LinearGradient } from "expo-linear-gradient";

type TabItem = {
  name: string;
  title: string;
  icon: string;
  iconActive: string;
};

const tabs: TabItem[] = [
  { name: "home", title: "Home", icon: "solar:home-2-linear", iconActive: "solar:home-2-bold" },
  { name: "earn", title: "Earn", icon: "solar:wad-of-money-linear", iconActive: "solar:wad-of-money-bold" },
  { name: "trade", title: "Trade", icon: "solar:transfer-horizontal-linear", iconActive: "solar:transfer-horizontal-bold" },
  { name: "frens", title: "Frens", icon: "solar:users-group-rounded-linear", iconActive: "solar:users-group-rounded-bold" },
  { name: "wallet", title: "Wallet", icon: "solar:wallet-money-linear", iconActive: "solar:wallet-money-bold" },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" }, // Hide default tab bar
      }}
      tabBar={(props) => <FloatingTabBar {...props} insets={insets} />}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
          }}
        />
      ))}
    </Tabs>
  );
}

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const size = 24;
  const color = focused ? "#fff" : "#9ca3af";

  switch (name) {
    case "home":
      return <Icon name={focused ? "solar:home-2-bold" : "solar:home-2-linear"} size={size} color={color} />;
    case "earn":
      return <Icon name={focused ? "solar:wad-of-money-bold" : "solar:wad-of-money-linear"} size={size} color={color} />;
    case "trade":
      return <Icon name={focused ? "solar:transfer-horizontal-bold" : "solar:transfer-horizontal-linear"} size={size} color={color} />;
    case "frens":
      return <Icon name={focused ? "solar:users-group-rounded-bold" : "solar:users-group-rounded-linear"} size={size} color={color} />;
    case "wallet":
      return <Icon name={focused ? "solar:wallet-money-bold" : "solar:wallet-money-linear"} size={size} color={color} />;
    default:
      return <Icon name="solar:home-2-linear" size={size} color={color} />;
  }
}

function FloatingTabBar({ 
  state, 
  navigation, 
  insets 
}: { 
  state: any; 
  navigation: any;
  insets: { bottom: number };
}) {
  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 24) }]}>
      <BlurView intensity={40} tint="dark" style={styles.blurContainer}>
        {/* Stronger backdrop blur feel with gradient overlay */}
        <LinearGradient
          colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        
        <View style={styles.tabContainer}>
          {tabs.map((tab, index) => {
            const isFocused = state.index === index;
            
            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: state.routes[index].key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(state.routes[index].name);
              }
            };

            return (
              <Pressable
                key={tab.name}
                onPress={onPress}
                style={styles.tabButton}
              >
                <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
                  <TabIcon name={tab.name} focused={isFocused} />
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isFocused ? "#fff" : "#9ca3af" },
                  ]}
                >
                  {tab.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: "4%",
    right: "4%",
    height: 70,
    borderRadius: 35,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    // Android shadow
    elevation: 10,
  },
  blurContainer: {
    flex: 1,
    backgroundColor: Platform.OS === 'android' ? 'rgba(20,20,20,0.85)' : 'rgba(20,20,20,0.5)',
  },
  tabContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Onest_500Medium",
    letterSpacing: 0.2,
  },
});
