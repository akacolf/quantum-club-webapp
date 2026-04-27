"use client";

import { useSyncExternalStore } from "react";
import { useUserContext } from "@/app/(contexts)/UserContext";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function LeaderboardHeader() {
  const { username } = useUserContext();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const tgFirstName = mounted
    ? window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || username || "Quantum User"
    : "Quantum User";

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold text-white tracking-tight">Here&apos;s your leaderboard, {tgFirstName}.</h1>
      <p className="text-sm text-neutral-400 mt-1">
        You can view your own personal ranking and everyone else&apos;s.
      </p>
    </div>
  )
}
