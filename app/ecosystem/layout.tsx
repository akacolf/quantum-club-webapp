"use client";

import { useEffect, useSyncExternalStore } from "react";
import EcosystemNavigation from "./(navigation)/EcosystemNavigation";
import Loader from "@/app/(components)/Loader";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useAuth } from "@/app/(contexts)/auth";
import { usePresence } from "@/app/(hooks)/usePresence";

// Track client-side mount without triggering effect lint warnings
const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function EcosystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { telegramId } = useUserContext();
  const authCtx = useAuth();
  const isMounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);

  // Track user presence (online/offline) — only after Firebase auth is ready
  usePresence(authCtx?.currentUser ? telegramId : null);

  // Show back button — each child page registers its own onClick handler
  // via useTelegramBackButton. We only show/hide here so the button is
  // visible as soon as the layout mounts.
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.BackButton.show();
  }, []);

  if (!isMounted) return <Loader />;

  return (
    <div className="ecosystem-app">
      {children}
      <EcosystemNavigation />
    </div>
  );
}
