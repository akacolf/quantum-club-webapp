"use client";

import { useRef } from "react";
import { useTelegramBackButton } from "@/app/hooks/useBackButton";
import StoryHeader from "./components/StoryHeader";
import { LottieRefCurrentProps } from "lottie-react";
import StoryStats from "./components/StoryStats";

const StoryContent = () => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  useTelegramBackButton();

  return (
    <div className="mt-6 flex flex-col space-y-4">
      <StoryHeader lottieRef={lottieRef} />
      <StoryStats />
    </div>
  );
};

export default StoryContent;
