"use client"
import { useEffect } from "react";
import LoginScreen from "./login/page";
import TelegramAnalytics from "@telegram-apps/analytics";

export default function Page() {
    useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
      TelegramAnalytics.init({
        token: process.env.NEXT_PUBLIC_TG1!,
        appName: process.env.NEXT_PUBLIC_TGAPPNAME!,
      });
    }
  }, []);
  return (
  <>
    <LoginScreen />
  </>
  );
}
