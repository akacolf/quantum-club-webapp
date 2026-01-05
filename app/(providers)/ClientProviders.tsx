"use client";
import { useEffect, Suspense, lazy } from "react";
import dynamic from "next/dynamic";
import { GameProvider } from "../(contexts)/MiningContext";
import { WalletProvider } from "../wallet/WalletContext";
import { ThemeProvider } from "./ThemeProvider";
import { initTelegramAnalytics, analyticsEvents } from "@/lib/telegramAnalytics";

// Lazy load non-critical providers to reduce initial bundle
const LeaderboardProvider = lazy(() => import("../(contexts)/LeaderboardContext").then(m => ({ default: m.LeaderboardProvider })));
const FrensProvider = lazy(() => import("../(contexts)/FrensContext").then(m => ({ default: m.FrensProvider })));
const ChatProvider = lazy(() => import("../(contexts)/ChatContext").then(m => ({ default: m.ChatProvider })));
const GroupsProvider = lazy(() => import("../(contexts)/GroupsContext").then(m => ({ default: m.GroupsProvider })));
const TradingProvider = lazy(() => import("../(contexts)/TradingContext").then(m => ({ default: m.TradingProvider })));

// Lazy load AI Chat Drawer - it's hidden by default and not needed for initial render
const AIChatDrawer = dynamic(() => import("../(components)/AIChatDrawer"), {
  ssr: false,
  loading: () => null,
});

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
        <WalletProvider>
          <Suspense fallback={null}>
            <LeaderboardProvider>
              <FrensProvider>
                <ChatProvider>
                  <GroupsProvider>
                    <TradingProvider>
                      {children}
                      <AIChatDrawer />
                    </TradingProvider>
                  </GroupsProvider>
                </ChatProvider>
              </FrensProvider>
            </LeaderboardProvider>
          </Suspense>
        </WalletProvider>
      </GameProvider>
    </ThemeProvider>
  );
}