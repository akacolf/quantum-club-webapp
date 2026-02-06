"use client";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { UserDataProvider } from "../(contexts)/UserContext";
import { WalletProvider } from "../wallet/WalletContext";
import { ThemeProvider } from "./ThemeProvider";
import { initTelegramAnalytics, analyticsEvents } from "@/lib/telegramAnalytics";

// Lazy load non-critical providers to reduce initial bundle
const LeaderboardProvider = dynamic(() => import("../(contexts)/LeaderboardContext").then(m => ({ default: m.LeaderboardProvider })));
const FrensProvider = dynamic(() => import("../(contexts)/FrensContext").then(m => ({ default: m.FrensProvider })));
const ChatProvider = dynamic(() => import("../(contexts)/ChatContext").then(m => ({ default: m.ChatProvider })));
const GroupsProvider = dynamic(() => import("../(contexts)/GroupsContext").then(m => ({ default: m.GroupsProvider })));
const TradingProvider = dynamic(() => import("../(contexts)/TradingContext").then(m => ({ default: m.TradingProvider })));
const OmnistonClientProvider = dynamic(() => import("./OmnistonProvider").then(m => ({ default: m.OmnistonClientProvider })), { ssr: false });

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
      <UserDataProvider>
        <WalletProvider>
          <LeaderboardProvider>
            <FrensProvider>
              <ChatProvider>
                <GroupsProvider>
                  <TradingProvider>
                    <OmnistonClientProvider>
                      {children}
                      <AIChatDrawer />
                    </OmnistonClientProvider>
                  </TradingProvider>
                </GroupsProvider>
              </ChatProvider>
            </FrensProvider>
          </LeaderboardProvider>
        </WalletProvider>
      </UserDataProvider>
    </ThemeProvider>
  );
}