"use client";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { queryClient } from "@/lib/query-client";
import { useUserHydration } from "@/stores/user-store";
import { hydrateLeaderboardFromSession } from "@/stores/leaderboard-store";
import { hydrateFrensFromSession } from "@/stores/frens-store";
import { useTgUsernameSync } from "@/app/(hooks)/useTgUsernameSync";

// Lazy load non-critical providers to reduce initial bundle
const WalletProvider = dynamic(() => import("../wallet/WalletContext").then(m => ({ default: m.WalletProvider })));
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

  // Sync TG username if it changed between sessions
  useTgUsernameSync();

  // Hydrate session-only stores from sessionStorage on mount
  useEffect(() => {
    hydrateLeaderboardFromSession();
    hydrateFrensFromSession();
  }, []);

  // Global Telegram Mini App initialization — colors, fullscreen, swipe behavior
  useEffect(() => {
    const WebApp = window.Telegram?.WebApp;
    if (!WebApp) return;

    WebApp.ready();
    WebApp.setHeaderColor("#000000");
    WebApp.setBackgroundColor("#000000");
    WebApp.disableVerticalSwipes();

    // Request fullscreen on mobile platforms only
    const platform = WebApp.platform;
    if (platform === "android" || platform === "ios") {
      WebApp.requestFullscreen();
    }

    // Re-apply colors when returning from background to prevent grey gap
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        WebApp.setHeaderColor("#000000");
        WebApp.setBackgroundColor("#000000");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <GroupsProvider>
            <TradingProvider>
              <OmnistonClientProvider>
                <CallProvider>
                  {children}
                </CallProvider>
              </OmnistonClientProvider>
            </TradingProvider>
          </GroupsProvider>
        </WalletProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
