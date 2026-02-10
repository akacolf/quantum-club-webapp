"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import EcosystemNavigation from "./(navigation)/EcosystemNavigation";
import Loader from "@/app/(components)/Loader";

// Track client-side mount without triggering effect lint warnings
const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function EcosystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isMounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);

  // Telegram back button navigates to home
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.BackButton.show();

    const handleBack = () => router.push("/home");
    tg?.BackButton.onClick(handleBack);

    return () => {
      tg?.BackButton.offClick(handleBack);
      tg?.BackButton.hide();
    };
  }, [router]);

  if (!isMounted) return <Loader />;

  return (
    <div className="ecosystem-app">
      {children}
      <EcosystemNavigation />
    </div>
  );
}
