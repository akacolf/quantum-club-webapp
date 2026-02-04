import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Dimensions,
  StyleSheet,
  Linking,
} from "react-native";
import { Text } from "~/components/ui/text";
import { Card, CardContent } from "~/components/ui/card";
import { useRouter } from "expo-router";
import { Icon } from '@/components/icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import LottieView from "lottie-react-native";
import Svg, { Defs, RadialGradient, Stop, Circle, Path, G } from "react-native-svg";

// SVG Backgrounds
import CarouselBg from "~/assets/svg/carousel-bg.svg";
import CarouselBgJoinTG from "~/assets/svg/carousel-bg-join-tg.svg";
import BgTgeProgressCard from "~/assets/svg/bg-tge-progress-card.svg";

// Lotties
const diamondLottie = require("~/assets/lottie/diamond-lottie.json");
const storyLottie = require("~/assets/lottie/story-lottie.json");
const goldMedalLottie = require("~/assets/lottie/gold-medal-lottie.json");

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_MARGIN = (SCREEN_WIDTH - CARD_WIDTH) / 2;
const CARD_SPACING = 12;
const AUTO_PLAY_INTERVAL = 7000;

interface CarouselCard {
  id: string;
  title: string;
  description: string;
  lottie?: any;
  icon?: React.ReactNode;
  buttonText: string;
  route?: string;
  externalUrl?: string;
  disabled?: boolean;
  bgComponent?: React.FC<any>;
  bgGlowColor?: string;
}

// Telegram Icon Component
const TelegramIcon = () => (
  <Icon name="ri:telegram-fill" size={24} color="#60a5fa" />
);

// Progress Icon Component
const ProgressIcon = () => (
  <Icon name="solar:graph-new-up-linear" size={20} color="#4ade80" />
);

const carouselCards: CarouselCard[] = [
  {
    id: "ai-trading",
    title: "AI-Powered Trading",
    description: "Experience the future of trading with our AI-driven platform.",
    lottie: diamondLottie,
    buttonText: "Coming Soon",
    disabled: true,
    bgGlowColor: "#3b82f6",
  },
  {
    id: "story",
    title: "The Quantum Era",
    description: "Explore your TG story with us. Watch it unfold.",
    lottie: storyLottie,
    buttonText: "Explore",
    route: "/story",
    bgComponent: CarouselBg,
  },
  {
    id: "leaderboard",
    title: "The Race is On",
    description: "Check your standings on the global leaderboard.",
    lottie: goldMedalLottie,
    buttonText: "Check Rank",
    route: "/leaderboard",
    bgGlowColor: "#eab308",
  },
  {
    id: "telegram",
    title: "The Club of OGs",
    description: "Stay updated with the latest news. Never miss a beat.",
    icon: <TelegramIcon />,
    buttonText: "Join Channel",
    externalUrl: "https://t.me/quantumclubinc",
    bgComponent: CarouselBgJoinTG,
  },
  {
    id: "roadmap",
    title: "The Progress",
    description: "Building the future. See our roadmap.",
    icon: <ProgressIcon />,
    buttonText: "View Roadmap",
    route: "/roadmap",
    bgComponent: BgTgeProgressCard,
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
      x: index * (CARD_WIDTH + CARD_SPACING),
      animated: true,
    });
    setCurrentIndex(index);
    progressWidth.value = 0;
    progressWidth.value = withTiming(1, { duration: AUTO_PLAY_INTERVAL });
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
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
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {carouselCards.map((card, index) => (
          <CarouselCardItem
            key={card.id}
            card={card}
            isLast={index === carouselCards.length - 1}
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
  onPress,
  isLast
}: { 
  card: CarouselCard; 
  onPress: () => void;
  isLast: boolean;
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

  return (
    <Animated.View style={[styles.cardContainer, animatedStyle, { marginRight: isLast ? 0 : CARD_SPACING }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={card.disabled}
      >
        <Card style={styles.card}>
          {/* Background SVG or Glow */}
          <View style={StyleSheet.absoluteFill}>
            {card.bgComponent ? (
              <>
                <card.bgComponent width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
              </>
            ) : card.bgGlowColor ? (
              <View style={{ position: 'absolute', top: -40, right: -40 }}>
                <Svg height="200" width="200">
                  <Defs>
                    <RadialGradient id={`glow-${card.id}`} cx="50%" cy="50%" r="50%">
                      <Stop offset="0" stopColor={card.bgGlowColor} stopOpacity="0.15" />
                      <Stop offset="1" stopColor={card.bgGlowColor} stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  <Circle cx="100" cy="100" r="100" fill={`url(#glow-${card.id})`} />
                </Svg>
              </View>
            ) : null}
          </View>

          <CardContent style={styles.cardContent}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                {card.lottie ? (
                  <View style={{ width: 24, height: 24 }}>
                    <LottieView
                      source={card.lottie}
                      autoPlay
                      loop
                      style={{ width: "100%", height: "100%" }}
                    />
                  </View>
                ) : (
                  card.icon
                )}
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
    position: 'relative',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28, // Pushed down content slightly
    paddingBottom: 20,
    justifyContent: "center",
    gap: 20, // Increased gap to push button lower
    zIndex: 10,
  },
  cardHeader: {
    gap: 8,
    marginTop: 0, // Removed top margin
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
    maxWidth: "90%",
  },
  cardFooter: {
    marginTop: 0, // Removed auto margin
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
