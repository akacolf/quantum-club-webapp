"use client";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./ThemeProvider";
import { useUserHydration } from "@/stores/user-store";
import { hydrateLeaderboardFromSession } from "@/stores/leaderboard-store";
import { hydrateFrensFromSession } from "@/stores/frens-store";

// Shared QueryClient instance — available to all providers and hooks
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            staleTime: 60_000,
            refetchOnWindowFocus: false,
        },
    },
});

// Lazy load non-critical providers to reduce initial bundle
const WalletProvider = dynamic(() => import("../wallet/WalletContext").then(m => ({ default: m.WalletProvider })));
const ChatProvider = dynamic(() => import("../(contexts)/ChatContext").then(m => ({ default: m.ChatProvider })));
const GroupsProvider = dynamic(() => import("../(contexts)/GroupsContext").then(m => ({ default: m.GroupsProvider })));
const TradingProvider = dynamic(() => import("../(contexts)/TradingContext").then(m => ({ default: m.TradingProvider })));
const OmnistonClientProvider = dynamic(() => import("./OmnistonProvider").then(m => ({ default: m.OmnistonClientProvider })), { ssr: false });
const CallProvider = dynamic(() => import("../(contexts)/CallContext").then(m => ({ default: m.CallProvider })), { ssr: false });

// Lazy-init analytics after first paint
if (typeof window !== "undefined") {
  const initAnalytics = () => import("@/lib/telegramAnalytics").then(m => {
    m.initTelegramAnalytics();
    m.analyticsEvents.appInit();
  });
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(initAnalytics);
  } else {
    setTimeout(initAnalytics, 2000);
  }
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  // Firestore listener for real-time QuantAmount updates
  useUserHydration();

  // Hydrate session-only stores from sessionStorage on mount
  useEffect(() => {
    hydrateLeaderboardFromSession();
    hydrateFrensFromSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" attribute="class" enableSystem>
        <WalletProvider>
          <ChatProvider>
            <GroupsProvider>
              <TradingProvider>
                <OmnistonClientProvider>
                  <CallProvider>
                    {children}
                  </CallProvider>
                </OmnistonClientProvider>
              </TradingProvider>
            </GroupsProvider>
          </ChatProvider>
        </WalletProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
