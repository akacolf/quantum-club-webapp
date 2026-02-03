import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Dimensions,
  StyleSheet,
  Image,
  Linking,
} from "react-native";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  interpolate,
  Extrapolation,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_MARGIN = (SCREEN_WIDTH - CARD_WIDTH) / 2;
const AUTO_PLAY_INTERVAL = 7000;

interface CarouselCard {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  buttonText: string;
  route?: string;
  externalUrl?: string;
  disabled?: boolean;
  bgGradient?: string;
}

const carouselCards: CarouselCard[] = [
  {
    id: "ai-trading",
    title: "AI-Powered Trading",
    description: "Experience the future of trading with our AI-driven platform.",
    icon: "diamond",
    iconColor: "#3b82f6",
    buttonText: "Coming Soon",
    disabled: true,
    bgGradient: "blue",
  },
  {
    id: "story",
    title: "The Quantum Era",
    description: "Explore your TG story with us. Watch it unfold.",
    icon: "book",
    iconColor: "#a855f7",
    buttonText: "Explore",
    route: "/story",
  },
  {
    id: "leaderboard",
    title: "The Race is On",
    description: "Check your standings on the global leaderboard.",
    icon: "trophy",
    iconColor: "#eab308",
    buttonText: "Check Rank",
    route: "/leaderboard",
    bgGradient: "yellow",
  },
  {
    id: "telegram",
    title: "The Club of OGs",
    description: "Stay updated with the latest news. Never miss a beat.",
    icon: "paper-plane",
    iconColor: "#0088cc",
    buttonText: "Join Channel",
    externalUrl: "https://t.me/quantumclubchannel",
  },
  {
    id: "roadmap",
    title: "The Progress",
    description: "Building the future. See our roadmap.",
    icon: "trending-up",
    iconColor: "#22c55e",
    buttonText: "View Roadmap",
    route: "/roadmap",
    bgGradient: "green",
  },
];

export function HomeCarousel() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressWidth = useSharedValue(0);

  // Auto-play effect
  useEffect(() => {
    progressWidth.value = 0;
    progressWidth.value = withTiming(1, { duration: AUTO_PLAY_INTERVAL });

    const timer = setInterval(() => {
      const nextIndex = (currentIndex + 1) % carouselCards.length;
      scrollToIndex(nextIndex);
    }, AUTO_PLAY_INTERVAL);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * CARD_WIDTH,
      animated: true,
    });
    setCurrentIndex(index);
    progressWidth.value = 0;
    progressWidth.value = withTiming(1, { duration: AUTO_PLAY_INTERVAL });
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / CARD_WIDTH);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < carouselCards.length) {
      setCurrentIndex(newIndex);
      progressWidth.value = 0;
      progressWidth.value = withTiming(1, { duration: AUTO_PLAY_INTERVAL });
    }
  };

  const handleCardPress = (card: CarouselCard) => {
    if (card.disabled) return;
    
    if (card.route) {
      router.push(card.route as any);
    } else if (card.externalUrl) {
      Linking.openURL(card.externalUrl);
    }
  };

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  return (
    <Animated.View entering={FadeIn.duration(500).delay(200)} style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {carouselCards.map((card, index) => (
          <CarouselCardItem
            key={card.id}
            card={card}
            onPress={() => handleCardPress(card)}
          />
        ))}
      </ScrollView>

      {/* Progress Indicators */}
      <View style={styles.indicators}>
        {carouselCards.map((_, index) => (
          <Pressable
            key={index}
            onPress={() => scrollToIndex(index)}
            style={[
              styles.indicator,
              index === currentIndex && styles.indicatorActive,
            ]}
          >
            {index === currentIndex && (
              <Animated.View style={[styles.indicatorProgress, progressAnimatedStyle]} />
            )}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

function CarouselCardItem({ 
  card, 
  onPress 
}: { 
  card: CarouselCard; 
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!card.disabled) {
      scale.value = withSpring(0.98);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const getBgStyle = () => {
    switch (card.bgGradient) {
      case "blue":
        return { backgroundColor: "rgba(59, 130, 246, 0.1)" };
      case "yellow":
        return { backgroundColor: "rgba(234, 179, 8, 0.1)" };
      case "green":
        return { backgroundColor: "rgba(34, 197, 94, 0.1)" };
      default:
        return {};
    }
  };

  return (
    <Animated.View style={[styles.cardContainer, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={card.disabled}
      >
        <Card style={[styles.card, getBgStyle()]}>
          <CardContent style={styles.cardContent}>
            {/* Background glow effect */}
            {card.bgGradient && (
              <View
                style={[
                  styles.bgGlow,
                  { backgroundColor: card.iconColor, opacity: 0.1 },
                ]}
              />
            )}

            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Ionicons name={card.icon} size={20} color={card.iconColor} />
              </View>
              <Text style={styles.cardDescription}>{card.description}</Text>
            </View>

            {/* Button */}
            <View style={styles.cardFooter}>
              <View
                style={[
                  styles.button,
                  card.disabled && styles.buttonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    card.disabled && styles.buttonTextDisabled,
                  ]}
                >
                  {card.buttonText}
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  scrollContent: {
    paddingHorizontal: CARD_MARGIN,
  },
  cardContainer: {
    width: CARD_WIDTH,
  },
  card: {
    height: 176,
    backgroundColor: "#111",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  bgGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  cardHeader: {
    gap: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  cardDescription: {
    fontSize: 12,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
    lineHeight: 18,
  },
  cardFooter: {
    marginTop: "auto",
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  buttonText: {
    fontSize: 12,
    fontFamily: "Onest_700Bold",
    color: "#000",
  },
  buttonTextDisabled: {
    color: "rgba(255,255,255,0.5)",
  },
  indicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  indicator: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: "#333",
    overflow: "hidden",
  },
  indicatorActive: {
    width: 32,
    backgroundColor: "#333",
  },
  indicatorProgress: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 3,
  },
});
