import React from "react";
import { Tabs } from "expo-router";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type TabItem = {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const tabs: TabItem[] = [
  { name: "home", title: "Home", icon: "home-outline", iconActive: "home" },
  { name: "earn", title: "Earn", icon: "gift-outline", iconActive: "gift" },
  { name: "frens", title: "Frens", icon: "people-outline", iconActive: "people" },
  { name: "wallet", title: "Wallet", icon: "wallet-outline", iconActive: "wallet" },
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
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 16) }]}>
      <BlurView intensity={50} tint="systemMaterialDark" style={styles.blurContainer}>
        <View style={styles.innerBorder}>
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
                <Ionicons
                  name={isFocused ? tab.iconActive : tab.icon}
                  size={24}
                  color={isFocused ? "#F97316" : "rgba(255,255,255,0.5)"}
                  style={isFocused ? styles.activeIcon : undefined}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isFocused ? "#F97316" : "rgba(255,255,255,0.5)" },
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
    // iOS shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    // Android shadow
    elevation: 12,
  },
  blurContainer: {
    flex: 1,
    backgroundColor: "rgba(28,28,30,0.85)",
  },
  innerBorder: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 35,
    borderCurve: "continuous",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Onest_500Medium",
    letterSpacing: 0.3,
  },
  activeIcon: {
    transform: [{ scale: 1.1 }],
  },
});
