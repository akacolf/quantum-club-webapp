"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Lottie from "lottie-react";
import sparklesAnimation from "@/public/lottie/sparkles-lottie.json";
import trophyAnimation from "@/public/lottie/trophy-lottie.json";
import { Wallet, Trophy } from "lucide-react";

const TelegramSVG = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    className={className}
  >
    <defs>
      <linearGradient
        id="logosTelegramStory"
        x1="50%"
        x2="50%"
        y1="0%"
        y2="100%"
      >
        <stop offset="0%" stopColor="#2aabee" />
        <stop offset="100%" stopColor="#229ed9" />
      </linearGradient>
    </defs>
    <path
      fill="url(#logosTelegramStory)"
      d="M128 0C94.06 0 61.48 13.494 37.5 37.49A128.04 128.04 0 0 0 0 128c0 33.934 13.5 66.514 37.5 90.51C61.48 242.506 94.06 256 128 256s66.52-13.494 90.5-37.49c24-23.996 37.5-56.576 37.5-90.51s-13.5-66.514-37.5-90.51C194.52 13.494 161.94 0 128 0"
    />
    <path
      fill="#fff"
      d="M57.94 126.648q55.98-24.384 74.64-32.152c35.56-14.786 42.94-17.354 47.76-17.441c1.06-.017 3.42.245 4.96 1.49c1.28 1.05 1.64 2.47 1.82 3.467c.16.996.38 3.266.2 5.038c-1.92 20.24-10.26 69.356-14.5 92.026c-1.78 9.592-5.32 12.808-8.74 13.122c-7.44.684-13.08-4.912-20.28-9.63c-11.26-7.386-17.62-11.982-28.56-19.188c-12.64-8.328-4.44-12.906 2.76-20.386c1.88-1.958 34.64-31.748 35.26-34.45c.08-.338.16-1.598-.6-2.262c-.74-.666-1.84-.438-2.64-.258c-1.14.256-19.12 12.152-54 35.686c-5.1 3.508-9.72 5.218-13.88 5.128c-4.56-.098-13.36-2.584-19.9-4.708c-8-2.606-14.38-3.984-13.82-8.41c.28-2.304 3.46-4.662 9.52-7.072"
    />
  </svg>
);

const StoryContent = () => {
  useTelegramBackButton();
  const router = useRouter();
  const { rank } = useGameContext();
  const [quantValue, setQuantValue] = useState("0");
  const [currentStory, setCurrentStory] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const val = sessionStorage.getItem("firstQuant");
      if (val) setQuantValue(val);
    }
  }, []);

  const stories = [
    {
      id: 1,
      title: "Ecosystem Activity",
      value: `${quantValue} QNTM`,
      sub: "Total Earned",
      icon: <Wallet className="w-8 h-8 text-blue-400" />,
      lottie: sparklesAnimation,
      gradient: "from-blue-600/20 via-blue-900/20 to-black",
      accent: "bg-blue-500",
      textAccent: "text-blue-400"
    },
    {
      id: 2,
      title: "Your Rank",
      value: `${rank}`,
      sub: "Based on Account Age",
      icon: <Trophy className="w-8 h-8 text-purple-400" />,
      lottie: trophyAnimation,
      gradient: "from-purple-600/20 via-purple-900/20 to-black",
      accent: "bg-purple-500",
      textAccent: "text-purple-400"
    }
  ];

  const handleNext = useCallback(() => {
    if (currentStory < stories.length - 1) {
      setCurrentStory(prev => prev + 1);
      setProgress(0);
    } else {
      router.push('/');
    }
  }, [currentStory, stories.length, router]);

  const handlePrev = useCallback(() => {
    if (currentStory > 0) {
      setCurrentStory(prev => prev - 1);
      setProgress(0);
    }
  }, [currentStory]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          return 100;
        }
        return prev + 1; // 5 seconds approx (100 * 50ms = 5000ms)
      });
    }, 50);

    return () => clearInterval(timer);
  }, [currentStory, isPaused]);

  useEffect(() => {
    if (progress >= 100) {
      handleNext();
    }
  }, [progress, handleNext]);

  const current = stories[currentStory];

  return (
    <div className="fixed inset-0 bg-black text-white z-50 flex flex-col">
      {/* Tap Zones - full screen */}
      <div className="absolute inset-0 z-10 flex">
        <div 
          className="w-1/3 h-full" 
          onClick={handlePrev}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onMouseLeave={() => setIsPaused(false)}
        />
        <div 
          className="w-2/3 h-full" 
          onClick={handleNext}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onMouseLeave={() => setIsPaused(false)}
        />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStory}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b ${current.gradient}`}
        >
          {/* Background Effects */}
          <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 ${current.accent} rounded-full blur-[100px] opacity-20`} />

          {/* Inner content */}
          <div className="relative z-0 flex flex-col items-center space-y-8 p-8 text-center">
            <div className="w-32 h-32 flex items-center justify-center rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <Lottie 
                animationData={current.lottie} 
                loop={true} 
                autoplay={true}
                className="w-24 h-24"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-gray-400 uppercase tracking-widest text-xs font-medium">
                {current.icon}
                {current.title}
              </div>
              <h1 className="text-5xl font-bold text-white tracking-tight">
                {current.value}
              </h1>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
                <TelegramSVG className="w-3 h-3" />
                {current.sub}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress Indicator - Circular dots at bottom */}
      <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center items-center gap-3 safe-area-bottom">
        {stories.map((story, index) => (
          <div 
            key={story.id} 
            className="relative"
          >
            {/* Background circle */}
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index <= currentStory ? 'bg-white/30' : 'bg-white/10'
            }`} />
            
            {/* Animated fill for current story */}
            {index === currentStory && (
              <svg 
                className="absolute inset-0 w-3 h-3 -rotate-90"
                viewBox="0 0 12 12"
              >
                <circle
                  cx="6"
                  cy="6"
                  r="5"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeDasharray={`${(progress / 100) * 31.4} 31.4`}
                  className="transition-all duration-100 ease-linear"
                />
              </svg>
            )}
            
            {/* Completed indicator */}
            {index < currentStory && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-white" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoryContent;
