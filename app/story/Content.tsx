"use client";

import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import StoryHeader from "./(components)/Header";
import StoryStats from "./(components)/Stats";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const StoryContent = () => {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mp = sessionStorage.getItem("maintenance");
    if (mp === "true") {
      router.replace("/maintenance");
      return;
    }
  }, [router]);

  useTelegramBackButton();

  return (
    <div className="mt-6 flex flex-col space-y-4">
      <StoryHeader />
      <StoryStats />
    </div>
  );
};

export default StoryContent;
