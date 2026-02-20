'use client';
import React, { useContext, createContext, useState, useEffect, ReactNode } from "react";

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
  const [leaderboardContext, setLeaderboardContext] = useState<Leaderboard[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalQuant, setTotalQuant] = useState<string>("");

  // Hydrate from sessionStorage after mount
  useEffect(() => {
    try {
      const savedBoards = sessionStorage.getItem("lboard");
      if (savedBoards) setLeaderboardContext(JSON.parse(savedBoards));
    } catch {}
    const rank = sessionStorage.getItem("userLeaderRank");
    if (rank) setUserRank(Number(rank));
    const totalusers = sessionStorage.getItem("totalusers");
    if (totalusers) setTotalUsers(Number(totalusers));
    setTotalQuant(sessionStorage.getItem("totalquant") ?? "");
  }, []);

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