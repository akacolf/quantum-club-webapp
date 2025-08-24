"use client";

import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import StoryHeader from "./components/Header";
import StoryStats from "./components/Stats";

const StoryContent = () => {
  useTelegramBackButton();

  return (
    <div className="mt-6 flex flex-col space-y-4">
      <StoryHeader />
      <StoryStats />
    </div>
  );
};

export default StoryContent;
