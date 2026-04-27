"use client";

import { useState, useEffect, useCallback } from "react";
import { useDrag } from "@use-gesture/react";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useStoryQuantQuery } from "@/app/(hooks)/queries/use-story-quant";
import Scene from "./Scene";

const TelegramSVG = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    className={className}
  >
    <path
      fill="#fff"
      d="M128 0C94.06 0 61.48 13.494 37.5 37.49A128.04 128.04 0 0 0 0 128c0 33.934 13.5 66.514 37.5 90.51C61.48 242.506 94.06 256 128 256s66.52-13.494 90.5-37.49c24-23.996 37.5-56.576 37.5-90.51s-13.5-66.514-37.5-90.51C194.52 13.494 161.94 0 128 0"
    />
    <path
      fill="#000"
      d="M57.94 126.648q55.98-24.384 74.64-32.152c35.56-14.786 42.94-17.354 47.76-17.441c1.06-.017 3.42.245 4.96 1.49c1.28 1.05 1.64 2.47 1.82 3.467c.16.996.38 3.266.2 5.038c-1.92 20.24-10.26 69.356-14.5 92.026c-1.78 9.592-5.32 12.808-8.74 13.122c-7.44.684-13.08-4.912-20.28-9.63c-11.26-7.386-17.62-11.982-28.56-19.188c-12.64-8.328-4.44-12.906 2.76-20.386c1.88-1.958 34.64-31.748 35.26-34.45c.08-.338.16-1.598-.6-2.262c-.74-.666-1.84-.438-2.64-.258c-1.14.256-19.12 12.152-54 35.686c-5.1 3.508-9.72 5.218-13.88 5.128c-4.56-.098-13.36-2.584-19.9-4.708c-8-2.606-14.38-3.984-13.82-8.41c.28-2.304 3.46-4.662 9.52-7.072"
    />
  </svg>
);

const STORY_COUNT = 2;

const StoryContent = () => {
  useTelegramBackButton();
  const router = useRouter();
  const { rank, telegramId } = useUserContext();
  const { data: quantValue = "0" } = useStoryQuantQuery(telegramId);

  const [currentStory, setCurrentStory] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Prefetch home route so navigation is instant
  useEffect(() => {
    router.prefetch("/home");
  }, [router]);

  const stories = [
    {
      id: 1,
      title: "Your ecosystem activity",
      value: `${quantValue} QNTM`,
      sub: "Total earned",
      icon: <Icon icon="lucide:wallet" className="w-5 h-5 text-white" />,
    },
    {
      id: 2,
      title: "Your rank",
      value: `${rank}`,
      sub: "Based on account age",
      icon: <Icon icon="lucide:trophy" className="w-5 h-5 text-white" />,
    }
  ];

  const closeStories = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setIsPaused(true);
    // Navigate after the fade-out animation completes
    setTimeout(() => {
      router.replace("/home");
    }, 250);
  }, [isExiting, router]);

  const handleNext = useCallback(() => {
    if (isExiting) return;
    
    if (currentStory >= STORY_COUNT - 1) {
      closeStories();
    } else {
      setProgress(0);
      setCurrentStory(currentStory + 1);
    }
  }, [isExiting, currentStory, closeStories]);

  const handlePrev = useCallback(() => {
    if (isExiting) return;
    if (currentStory > 0) {
      setProgress(0);
      setCurrentStory(currentStory - 1);
    }
  }, [isExiting, currentStory]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          // Use queueMicrotask to avoid synchronous setState within the updater
          queueMicrotask(() => handleNext());
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [currentStory, isPaused, handleNext]);

  const safeStoryIndex = Math.min(currentStory, stories.length - 1);
  const current = stories[safeStoryIndex];

  // Pause logic handled via pointer events on the overlay divs

  return (
    <motion.div
      className="fixed inset-0 bg-black text-white z-50 flex flex-col overflow-hidden"
      animate={{ opacity: isExiting ? 0 : 1, scale: isExiting ? 0.95 : 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="absolute inset-0 z-20 flex">
        <div
          className="w-1/3 h-full touch-none"
          onClick={handlePrev}
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerLeave={() => setIsPaused(false)}
          onPointerCancel={() => setIsPaused(false)}
        />
        <div
          className="w-2/3 h-full touch-none"
          onClick={handleNext}
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerLeave={() => setIsPaused(false)}
          onPointerCancel={() => setIsPaused(false)}
        />
      </div>

      {/* The 3D Scene stays constant in the background, only changing its prop */}
      <Scene currentStory={currentStory} />

      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentStory}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none"
        >
          <div className="relative flex flex-col items-center space-y-4 p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-neutral-400 text-sm font-medium">
              {current.icon}
              {current.title}
            </div>
            
            <h1 className="text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
              {current.value}
            </h1>
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#111]/80 backdrop-blur-md border-none text-xs font-medium text-neutral-300 shadow-xl">
              <TelegramSVG className="w-3.5 h-3.5" />
              {current.sub}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute top-20 left-0 right-0 z-30 flex justify-center items-center gap-2 px-4 pt-safe-top">
        {stories.map((story, index) => (
          <div 
            key={story.id} 
            className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden"
          >
            <div 
              className={`h-full bg-white transition-all ease-linear ${
                index < currentStory ? 'w-full duration-0' : 
                index === currentStory ? 'duration-100' : 'w-0 duration-0'
              }`}
              style={{ 
                width: index === currentStory ? `${progress}%` : undefined 
              }}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default StoryContent;
