'use client';

import TelegramAnalytics from "@telegram-apps/analytics";
import { useEffect } from 'react';

export default function TelegramAnalyticsInit() {
  useEffect(() => {
    async function initAnalytics() {
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
        try {
          await TelegramAnalytics.init({
            token: "eyJhcHBfbmFtZSI6InF1YW50dW1fY2x1YiIsImFwcF91cmwiOiJodHRwczovL3QubWUvUXVhbnR1bUNsdWJCb3QiLCJhcHBfZG9tYWluIjoiaHR0cHM6Ly93d3cucXVhbnR1bWNzdWIuc3BhY2UvIn0=!wCjJY3ya2Il4HWQI21u7rOBSQpz/oFIrPNqdY986AS0=",
            appName: "quantum_club",
            env: "PROD",
          });

          await TelegramAnalytics.init({
            token: "eyJhcHBfbmFtZSI6InF1YW50dW1fY2x1YiIsImFwcF91cmwiOiJodHRwczovL3QubWUvUXVhbnR1bUNsdWJCb3QiLCJhcHBfZG9tYWluIjoiaHR0cHM6Ly93d3cucXVhbnR1bWNsdWIuc3BhY2UvIn0=!FgwCNe2iIgQQQecDuoDLVWNKsUu61sTpwqpfIK+BtfM=",
            appName: "quantum_club",
            env: "PROD",
          })
        } catch {
          console.error("Telegram Analytics was not initialized")
        }
      }
    }
    initAnalytics();
  }, []);
  return null;
};