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
  // Track app init event on mount
  useEffect(() => {
    analyticsEvents.appInit();
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