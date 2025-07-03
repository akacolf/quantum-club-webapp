'use client';

import TelegramAnalytics from "@telegram-apps/analytics";
import { useEffect } from 'react';

export default function TelegramAnalyticsInit() {
  useEffect(() => {
    async function initAnalytics() {
      if (window.Telegram?.WebApp && window.Telegram?.WebApp?.initData) {
        window.Telegram?.WebApp?.ready?.();
        console.log("Initializing Telegram Analytics...");
        try {
          await TelegramAnalytics.init({
            token: "eyJhcHBfbmFtZSI6InF1YW50dW1fY2x1YiIsImFwcF91cmwiOiJodHRwczovL3QubWUvUXVhbnR1bUNsdWJCb3QiLCJhcHBfZG9tYWluIjoiaHR0cHM6Ly93d3cucXVhbnR1bWNzdWIuc3BhY2UvIn0=!wCjJY3ya2Il4HWQI21u7rOBSQpz/oFIrPNqdY986AS0=",
            appName: "quantum_club",
            env: "PROD", // or "STG" if you want staging
          });
          console.log("Telegram Analytics initialized successfully.");
        } catch (err) {
          console.error("Telegram Analytics initialization failed:", err);
        }
      } else {
        console.warn("Telegram WebApp context not found or initData missing.");
      }
    }
    initAnalytics();
  }, []);
  return null;
};