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

  // Clean up any legacy Service Workers or caches left from previous PWA attempts
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      if ("caches" in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
    }
  }, []);

  // Global Telegram Mini App initialization — colors, fullscreen, swipe behavior
  useEffect(() => {
    const applyFullscreen = (WebApp: NonNullable<typeof window.Telegram>["WebApp"]) => {
      try {
        if (typeof WebApp.requestFullscreen === "function" && (!WebApp.isVersionAtLeast || WebApp.isVersionAtLeast("8.0"))) {
          WebApp.requestFullscreen();
        } else {
          WebApp.expand?.();
        }
      } catch (err) {
        console.warn("[Telegram.WebApp] requestFullscreen failed, falling back to expand:", err);
        WebApp.expand?.();
      }
    };

    const handleFullscreenFailed = () => {
      const WebApp = window.Telegram?.WebApp;
      try {
        WebApp?.expand?.();
      } catch {}
    };

    const initTelegramWebApp = () => {
      const WebApp = window.Telegram?.WebApp;
      if (!WebApp) return false;

      try {
        WebApp.ready?.();
        WebApp.expand?.();

        try {
          WebApp.setHeaderColor?.("#000000");
        } catch {}

        try {
          WebApp.setBackgroundColor?.("#000000");
        } catch {}

        try {
          WebApp.setBottomBarColor?.("#000000");
        } catch {}

        try {
          WebApp.disableVerticalSwipes?.();
        } catch {}

        applyFullscreen(WebApp);

        WebApp.onEvent?.("fullscreenFailed", handleFullscreenFailed);
        return true;
      } catch (err) {
        console.error("[Telegram.WebApp] Initialization error:", err);
        return true;
      }
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (!initTelegramWebApp()) {
      intervalId = setInterval(() => {
        if (initTelegramWebApp() && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 50);

      timeoutId = setTimeout(() => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 3000);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const WebApp = window.Telegram?.WebApp;
        if (!WebApp) return;
        if (!WebApp.isFullscreen) {
          applyFullscreen(WebApp);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      try {
        window.Telegram?.WebApp?.offEvent?.("fullscreenFailed", handleFullscreenFailed);
      } catch {}
    };
  }, []);

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <TradingProvider>
            <OmnistonClientProvider>
              <CallProvider>
                {children}
              </CallProvider>
            </OmnistonClientProvider>
          </TradingProvider>
        </WalletProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
