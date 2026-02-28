"use client";

import { ReactNode } from "react";
import { useLeaderboardStore } from "@/stores/leaderboard-store";
import { useShallow } from "zustand/shallow";

export const useLeaderboardContext = () =>
  useLeaderboardStore(
    useShallow((s) => ({
      leaderboardContext: s.leaderboardContext,
      setLeaderboardContext: s.setLeaderboardContext,
      userRank: s.userRank,
      setUserRank: s.setUserRank,
      totalUsers: s.totalUsers,
      setTotalUsers: s.setTotalUsers,
      totalQuant: s.totalQuant,
      setTotalQuant: s.setTotalQuant,
    }))
  );

export const LeaderboardProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};
