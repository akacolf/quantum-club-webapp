"use client";
import { useEffect } from "react";
import { GameProvider } from "../(contexts)/MiningContext";
import { LeaderboardProvider } from "../(contexts)/LeaderboardContext";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { FrensProvider } from "../(contexts)/FrensContext";
import { ThemeProvider } from "./ThemeProvider";
import { initTelegramAnalytics, analyticsEvents } from "@/lib/telegramAnalytics";

// Initialize analytics before render
if (typeof window !== "undefined") {
  initTelegramAnalytics();
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  // Track app init event on mount, with delay to ensure Telegram WebApp is ready
  useEffect(() => {
    const sendAppInit = () => {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser?.id) {
        analyticsEvents.appInit();
      } else {
        // Retry after a short delay if user data isn't ready yet
        setTimeout(sendAppInit, 500);
      }
    };
    // Initial delay to let Telegram WebApp initialize
    setTimeout(sendAppInit, 100);
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" attribute="class" enableSystem>
      <GameProvider>
        <LeaderboardProvider>
          <TonConnectUIProvider manifestUrl="https://cdn.quantumclub.space/tonconnect-manifest.json">
            <FrensProvider>
              {children}
            </FrensProvider>
          </TonConnectUIProvider>
        </LeaderboardProvider>
      </GameProvider>
    </ThemeProvider>
  );
};