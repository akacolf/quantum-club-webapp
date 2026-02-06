"use client";
import React, { createContext, useState, useContext, ReactNode, useMemo } from "react";

interface UserContextType {
  username: string | null;
  setUsername: (value: string | null) => void;
  telegramId: string | null;
  setTelegramId: (value: string | null) => void;
  miningActive: boolean;
  setMiningActive: (value: boolean) => void;
  lastActiveTime: string | null;
  setLastActiveTime: (value: string | null) => void;
  miningTimestamp: string | null;
  setMiningTimestamp: (value: string | null) => void;
  MainQuantAmount: string;
  SetMainQuantAmount: (value: string) => void;
  jointext: string;
  setJoinButtonText: (value: string) => void;
  rank: string | null;
  setRank: (value: string | null) => void;
  telegramIdNM: string | null;
  setTelegramIdNm: (value: string | null) => void;
  daily: number;
  setDaily: (value: number) => void;
  remainingSolveToEarn: number;
  setRemainingSolveToEarn: (value: number) => void;
  walletAddress: string | null;
  setWalletAddress: (value: string | null) => void;
}

const userContext = createContext<UserContextType>({} as UserContextType);

export const UserDataProvider = ({ children }: { children: ReactNode }) => {
  const [username, setUsername] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("username");
    }
    return null;
  });

  const [telegramId, setTelegramId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("telegramId");
    }
    return null;
  });

  const [jointext, setJoinButtonText] = useState("Join");
  const [miningActive, setMiningActive] = useState(false);
  
  const [lastActiveTime, setLastActiveTime] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lastactivetime");
    }
    return null;
  });

  const [MainQuantAmount, SetMainQuantAmount] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const amount = localStorage.getItem(`QAmount`+`_${telegramId}`);
      return amount ? `${amount}` : "0";
    }
    return "0";
  });

  const [rank, setRank] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`rank_${telegramId}`);
    }
    return null;
  });

  const [telegramIdNM, setTelegramIdNm] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("telegramIdNM");
    }
    return null;
  });

  const [daily, setDaily] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const dailyValue = localStorage.getItem(`daily_${telegramId}`);
      return dailyValue ? parseFloat(dailyValue) : 0;
    }
    return 0;
  });

  const [remainingSolveToEarn, setRemainingSolveToEarn] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return Number(sessionStorage.getItem("remainingSolveToEarn")) || 0;
    }
    return 0;
  });

  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`walletAddress_${telegramId}`);
    }
    return null;
  });

  const [miningTimestamp, setMiningTimestamp] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("miningTime");
    }
    return null;
  });
  const resetContext = () => {
    setUsername(null);
    setTelegramId(null);
    setMiningActive(false);
    setLastActiveTime(null);
    setMiningTimestamp(null);
    SetMainQuantAmount("0"); // Başlangıç değeriniz neyse
    setJoinButtonText(""); 
    setRank(null);
    setTelegramIdNm(null);
    setDaily(0);
    setRemainingSolveToEarn(0);
    setWalletAddress(null);
  };
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    username,
    setUsername,
    telegramId,
    setTelegramId,
    miningActive,
    setMiningActive,
    lastActiveTime,
    setLastActiveTime,
    miningTimestamp,
    setMiningTimestamp,
    MainQuantAmount,
    SetMainQuantAmount,
    jointext,
    setJoinButtonText,
    rank,
    setRank,
    telegramIdNM,
    setTelegramIdNm,
    daily,
    setDaily,
    remainingSolveToEarn,
    setRemainingSolveToEarn,
    walletAddress,
    setWalletAddress,
    resetContext,
  }), [
    username, telegramId, miningActive, lastActiveTime, miningTimestamp,
    MainQuantAmount, jointext, rank, telegramIdNM, daily, remainingSolveToEarn, walletAddress
  ]);
    
  return (
    <userContext.Provider value={contextValue}>
      {children}
    </userContext.Provider>
  );
};

export const useUserContext = () => useContext(userContext);