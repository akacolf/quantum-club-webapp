'use client';
import React, { useContext, createContext, useState, ReactNode } from "react";

interface Leaderboard {
username:string;
QuantAmount:number;
}
interface LeaderboardContextType {
  leaderboardContext: Array<Leaderboard>,
  setLeaderboardContext: (value: Array<Leaderboard>) => void;
  userRank: number | null;
  setUserRank: (value: number | null) => void;
  totalUsers: number | null;
  setTotalUsers: (value: number | null) => void;
  totalQuant: string;
  setTotalQuant: (value: string) => void;
}

const LeaderboardContext = createContext<LeaderboardContextType>({} as LeaderboardContextType);

export const LeaderboardProvider = ({ children } : { children: ReactNode }) => {
  const [leaderboardContext, setLeaderboardContext] = useState<Leaderboard[]>(() => {
    if (typeof window !== "undefined") {
      const savedBoards = sessionStorage.getItem("lboard");
      if (savedBoards) {
        try {
          return JSON.parse(savedBoards);
        } catch {
          sessionStorage.removeItem("lboard");
          return [];
        }
      }
      return [];
    }
    return [];
  });
  const [userRank, setUserRank] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const rank = sessionStorage.getItem("userLeaderRank");
      return rank ? Number(rank) : 0;
    }
    return null;
  });
  const [totalUsers, setTotalUsers] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      const totalusers = sessionStorage.getItem("totalusers");
      return totalusers ? Number(totalusers) : 0;
    }
    return null;
  });
  const [totalQuant, setTotalQuant] = useState<string>(() => {
  if (typeof window !== "undefined") {
    const totalquant = sessionStorage.getItem("totalquant");
    try {
      return totalquant ?? "";
    } catch {
      console.error("Invalid JSON in sessionStorage for 'totalquant'");
    }
  }
  return "";
});

  return (
    <LeaderboardContext.Provider
      value={{
        leaderboardContext,
        setLeaderboardContext,
        userRank,
        setUserRank,
        totalUsers,
        setTotalUsers,
        totalQuant,
        setTotalQuant,
      }}
    >
      {children}
      </LeaderboardContext.Provider>
  );
};
export const useLeaderboardContext = () => {
  return useContext(LeaderboardContext);
};