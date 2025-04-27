'use client';
import React, { useContext, createContext, useState, ReactNode } from "react";

interface LeaderboardContextType {
  leaderboardContext: [],
  setLeaderboardContext: (value: any) => void;
  userRank: string | null;
  setUserRank: (value: string | null) => void;
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
  const [userRank, setUserRank] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const userRank = sessionStorage.getItem("userLeaderRank");
      return userRank;
    }
    return null;
  });
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