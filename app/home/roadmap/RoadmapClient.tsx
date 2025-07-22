"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RoadmapClient() {
  const router = useRouter();
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      const handleBackButtonClick = () => {
        router.replace("/home");
      };
      tg.BackButton.show();
      tg.BackButton.onClick(handleBackButtonClick);
      return () => {
        tg.BackButton.offClick(handleBackButtonClick);
      };
    } else {
      console.error("Telegram WebApp not available");
    }
  }, [router]);

  return null;
}
