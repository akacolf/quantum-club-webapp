import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  Dimensions,
  Animated,
  StyleSheet,
} from "react-native";
import { Text } from "~/components/ui/text";
import { useRouter } from "expo-router";
import { Icon } from '@/components/icons';
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDE_DURATION = 5000; // 5 seconds per slide
const NUM_SLIDES = 2;

interface SlideData {
  id: number;
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  gradientColors: readonly [string, string, ...string[]];
  iconBgColor: string;
}

export default function StoryScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressAnims = useRef<Animated.Value[]>(
    Array.from({ length: NUM_SLIDES }, () => new Animated.Value(0))
  ).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Mock data - in production, these would come from context/API
  const qntmAmount = 1250;
  const userRank = "Pioneer";

  // Slides data
  const slides: SlideData[] = [
    {
      id: 0,
      title: "Total QNTM Earned",
      value: qntmAmount.toLocaleString(),
      subtitle: "Your ecosystem activity",
      icon: "solar:wallet-bold",
      gradientColors: ["#1e3a8a", "#3b82f6", "#0ea5e9"],
      iconBgColor: "rgba(59, 130, 246, 0.2)",
    },
    {
      id: 1,
      title: "Your Rank",
      value: userRank,
      subtitle: "Based on your account activity",
      icon: "solar:cup-star-bold",
      gradientColors: ["#581c87", "#7c3aed", "#a855f7"],
      iconBgColor: "rgba(168, 85, 247, 0.2)",
    },
  ];

  // Animate progress bars
  useEffect(() => {
    if (isPaused) {
      animationRef.current?.stop();
      return;
    }

    const runAnimation = () => {
      // Reset current progress
      progressAnims[currentSlide].setValue(0);

      animationRef.current = Animated.timing(progressAnims[currentSlide], {
        toValue: 1,
        duration: SLIDE_DURATION,
        useNativeDriver: false,
      });

      animationRef.current.start(({ finished }) => {
        if (finished && !isPaused) {
          if (currentSlide < NUM_SLIDES - 1) {
            setCurrentSlide((prev) => prev + 1);
          } else {
            // End of story
            router.back();
          }
        }
      });
    };

    runAnimation();

    return () => {
      animationRef.current?.stop();
    };
  }, [currentSlide, isPaused]);

  // Handle tap navigation
  const handleTap = (locationX: number) => {
    const isLeftSide = locationX < SCREEN_WIDTH / 3;

    if (isLeftSide) {
      // Go to previous slide
      if (currentSlide > 0) {
        progressAnims[currentSlide].setValue(0);
        setCurrentSlide((prev) => prev - 1);
      }
    } else {
      // Go to next slide
      if (currentSlide < NUM_SLIDES - 1) {
        progressAnims[currentSlide].setValue(1);
        setCurrentSlide((prev) => prev + 1);
      } else {
        router.back();
      }
    }
  };

  const handlePressIn = () => setIsPaused(true);
  const handlePressOut = () => setIsPaused(false);

  const currentSlideData = slides[currentSlide];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={currentSlideData.gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Progress Bars */}
        <View style={styles.progressContainer}>
          {progressAnims.map((anim, index) => (
            <View key={index} style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                    opacity: index < currentSlide ? 1 : index === currentSlide ? 1 : 0.3,
                  },
                ]}
              />
              {index < currentSlide && <View style={styles.progressBarFull} />}
            </View>
          ))}
        </View>

        {/* Slide Content */}
        <Pressable
          style={styles.slideContent}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={(e) => handleTap(e.nativeEvent.locationX)}
        >
          <View style={styles.contentWrapper}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: currentSlideData.iconBgColor }]}>
              <Icon name={currentSlideData.icon} size={48} color="#fff" />
            </View>

            {/* Title */}
            <Text style={styles.slideTitle}>{currentSlideData.title}</Text>

            {/* Value */}
            <Text style={styles.slideValue}>{currentSlideData.value}</Text>

            {/* Subtitle */}
            <Text style={styles.slideSubtitle}>{currentSlideData.subtitle}</Text>
          </View>
        </Pressable>

        {/* Navigation Hint */}
        <View style={styles.navigationHint}>
          <View style={styles.hintDots}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.hintDot,
                  index === currentSlide && styles.hintDotActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.hintText}>Tap to continue</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  gradient: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 60,
    gap: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  progressBarFull: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  slideContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16, // Reduced padding
  },
  contentWrapper: {
    alignItems: "center",
    justifyContent: "center", // Changed to center
    gap: 16, // Reduced gap
    flex: 1,
    paddingVertical: 20,
    width: "100%", // Ensure full width for centering
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20, // Reduced margin
  },
  slideTitle: {
    fontSize: 18,
    fontFamily: "Onest_500Medium",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8, // Reduced margin
    textAlign: "center",
  },
  slideValue: {
    fontSize: 48, // Reduced from 56
    lineHeight: 56, // Added line height
    fontFamily: "Onest_700Bold",
    color: "#fff",
    marginBottom: 12, // Reduced margin
    textAlign: "center",
  },
  slideSubtitle: {
    fontSize: 16,
    fontFamily: "Onest_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  navigationHint: {
    alignItems: "center",
    paddingBottom: 60,
  },
  hintDots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  hintDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  hintDotActive: {
    backgroundColor: "#fff",
    width: 24,
  },
  hintText: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "rgba(255,255,255,0.5)",
  },
});