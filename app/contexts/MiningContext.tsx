"use client";
import React, { createContext, useState, useContext, ReactNode } from "react";

interface GameContextType {
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

const GameContext = createContext<GameContextType>({} as GameContextType);

export const GameProvider = ({ children }: { children: ReactNode }) => {
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
      const amount = localStorage.getItem("QAmount");
      return amount ? `${amount}` : "0";
    }
    return "0";
  });

  const [rank, setRank] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("rank");
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
      const dailyValue = localStorage.getItem("daily");
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
      return localStorage.getItem("walletAddress");
    }
    return null;
  });

  const [miningTimestamp, setMiningTimestamp] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("miningTime");
    }
    return null;
  });

  return (
    <GameContext.Provider
      value={{
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
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => useContext(GameContext);