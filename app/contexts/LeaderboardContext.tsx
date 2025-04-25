import { onValue } from "firebase/database";
import { useContext, createContext, useState } from "react";

const LeaderboardContext = createContext({
  leaderboardContext: [],
  setLeaderBoardContext: (value: any) => {},
  userRank: "",
  setUserRank: (value: string) => {},
  totalUsers: [],
  setTotalUsers: (value: any[]) => {},
  totalQuant: [],
  setTotalQuant: (value: any[]) => {},
});

export const LeaderBoardProvider = ({ children }: { children: React.ReactNode }) => {
  const [leaderboardContext, setLeaderBoardContext] = useState(() => {
    if (typeof window !== "undefined") {
      const savedBoards = sessionStorage.getItem("lboard");
      return savedBoards ? JSON.parse(savedBoards) : [];
    }
  });
  const [userRank, setUserRank] = useState(() => {
    if (typeof window !== "undefined") {
      const userRank = sessionStorage.getItem("userLeaderRank");
      return userRank;
    }
  });
  const [totalUsers, setTotalUsers] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const userRank = sessionStorage.getItem("totalusers");
      return userRank ? JSON.parse(userRank) : [];
    }
  });
  const [totalQuant, setTotalQuant] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const userRank = sessionStorage.getItem("totalquant");
      return userRank ? JSON.parse(userRank) : [];
    }
  });

  return (
    <LeaderboardContext.Provider
      value={{
        leaderboardContext,
        setLeaderBoardContext,
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
export const useLBoardContext = () => {
  return useContext(LeaderboardContext);
};