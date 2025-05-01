'use client';
import React, { useContext, createContext, useState, ReactNode } from "react";

interface Leaderboard {
username:string;
QuantAmount:number;
}
interface LeaderboardContextType {
  leaderboardContext: [],
  setLeaderboardContext: (value: Array<Leaderboard>) => void;
  userRank: number | null;
  setUserRank: (value: number | null) => void;
  totalUsers: string | null;
  setTotalUsers: (value: string | null) => void;
  totalQuant: string;
  setTotalQuant: (value: string) => void;
}

const LeaderboardContext = createContext<LeaderboardContextType>({} as LeaderboardContextType);

export const LeaderboardProvider = ({ children } : { children: ReactNode }) => {
  const [leaderboardContext, setLeaderboardContext] = useState(() => {
    if (typeof window !== "undefined") {
      const savedBoards = sessionStorage.getItem("lboard");
      return savedBoards ? JSON.parse(savedBoards) : [];
    }
  });
  const [userRank, setUserRank] = useState<number | null>(0);
  const [totalUsers, setTotalUsers] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const userRank = sessionStorage.getItem("totalusers");
      return userRank ? JSON.parse(userRank) : [];
    }
    return null;
  });
  const [totalQuant, setTotalQuant] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const userRank = sessionStorage.getItem("totalquant");
      return userRank ? JSON.parse(userRank) : [];
    }
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