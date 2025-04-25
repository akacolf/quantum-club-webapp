"use client";
import React, { createContext, useState, useContext } from "react";

const GameContext = createContext(null);
export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [username, setUsername] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("username");
    }
    return "";
  });
  const [telegramId, setTelegramId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("telegramId");
    }
    return "";
  });
  const [jointext, setJoinButtonText] = useState("Join");
  const [miningActive, setMiningActive] = useState(false);
  const [lastActiveTime, setLastActiveTime] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lastactivetime");
    }
    return null;
  });
  const [MainQuantAmount, SetMainQuantAmount] = useState(() => {
    if (typeof window !== "undefined") {
      const amount = localStorage.getItem("QAmount");
      return amount ? `${parseFloat(amount)}` : "0"; // parsing QNTM amount
    }
    return "0";
  });
  const [rank, setRank] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("rank");
    }
    return "";
  });
  const [telegramIdNM, setTelegramIdNm] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("telegramIdNM");
    }
    return "";
  });
  const [daily, setDaily] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const dailyValue = localStorage.getItem("daily");
      return dailyValue ? parseFloat(dailyValue) : 0;
    }
    return 0;
  });
  const [remainingSolveToEarn, setRemainingSolveToEarn] = useState(() => {
    if (typeof window !== "undefined") {
      return Number(sessionStorage.getItem("remainingSolveToEarn"));
    }
    return 0;
  });
  const [walletAddress, setWalletAddress] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("walletAddress");
    }
    return "";
  });
  const [miningTimestamp, setMiningTimestamp] = useState(() => {
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

export const useGameContext = () => {
  return useContext(GameContext);
};
