"use client";

import { create } from "zustand";

interface Leaderboard {
  id: string;
  username: string;
  qcUsername?: string | null;
  QuantAmount: number;
}

interface LeaderboardState {
  leaderboardContext: Leaderboard[];
  userRank: number | null;
  totalUsers: number | null;
  totalQuant: string;
}

interface LeaderboardActions {
  setLeaderboardContext: (value: Leaderboard[]) => void;
  setUserRank: (value: number | null) => void;
  setTotalUsers: (value: number | null) => void;
  setTotalQuant: (value: string) => void;
}

export type LeaderboardStore = LeaderboardState & LeaderboardActions;

export const useLeaderboardStore = create<LeaderboardStore>()((set) => ({
  leaderboardContext: [],
  userRank: null,
  totalUsers: null,
  totalQuant: "",

  setLeaderboardContext: (value) => set({ leaderboardContext: value }),
  setUserRank: (value) => set({ userRank: value }),
  setTotalUsers: (value) => set({ totalUsers: value }),
  setTotalQuant: (value) => set({ totalQuant: value }),
}));

/**
 * Hydrates leaderboard state from sessionStorage.
 * Called once in ClientProviders on mount.
 */
export function hydrateLeaderboardFromSession() {
  if (typeof window === "undefined") return;
  try {
    const saved = sessionStorage.getItem("lboard");
    if (saved) useLeaderboardStore.setState({ leaderboardContext: JSON.parse(saved) });
  } catch {}
  const rank = sessionStorage.getItem("userLeaderRank");
  if (rank) useLeaderboardStore.setState({ userRank: Number(rank) });
  const totalusers = sessionStorage.getItem("totalusers");
  if (totalusers) useLeaderboardStore.setState({ totalUsers: Number(totalusers) });
  const totalquant = sessionStorage.getItem("totalquant");
  if (totalquant) useLeaderboardStore.setState({ totalQuant: totalquant });
}
