"use client";

import { useEffect } from "react";
import TelegramAnalytics from "@telegram-apps/analytics";

export default function TelegramAnalyticsInit() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.Telegram &&
      window.Telegram.WebApp
    ) {
      TelegramAnalytics.init({
        token: process.env.NEXT_PUBLIC_TG_ANALYTICS_SDKAUTH || "",
        appName: process.env.NEXT_PUBLIC_TG_ANALYTICS_IDENTIFIER || "",
      });
    }
  }, []);

  return null;
}
