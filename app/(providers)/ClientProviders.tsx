"use client";
import { useEffect } from "react";
import { GameProvider } from "../(contexts)/MiningContext";
import { LeaderboardProvider } from "../(contexts)/LeaderboardContext";
import { FrensProvider } from "../(contexts)/FrensContext";
import { ChatProvider } from "../(contexts)/ChatContext";
import { GroupsProvider } from "../(contexts)/GroupsContext";
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
          <FrensProvider>
            <ChatProvider>
              <GroupsProvider>
                {children}
              </GroupsProvider>
            </ChatProvider>
          </FrensProvider>
        </LeaderboardProvider>
      </GameProvider>
    </ThemeProvider>
  );
}