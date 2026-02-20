"use client";
import React, { createContext, useState, useContext, useEffect, useRef, ReactNode, useMemo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";

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
  qcUsername: string | null;
  setQcUsername: (value: string | null) => void;
}

const userContext = createContext<UserContextType>({} as UserContextType);

export const UserDataProvider = ({ children }: { children: ReactNode }) => {
  const [username, setUsername] = useState<string | null>(null);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [jointext, setJoinButtonText] = useState("Join");
  const [miningActive, setMiningActive] = useState(false);
  const [lastActiveTime, setLastActiveTime] = useState<string | null>(null);
  const [MainQuantAmount, SetMainQuantAmount] = useState<string>("0");
  const [rank, setRank] = useState<string | null>(null);
  const [telegramIdNM, setTelegramIdNm] = useState<string | null>(null);
  const [daily, setDaily] = useState<number>(0);
  const [remainingSolveToEarn, setRemainingSolveToEarn] = useState<number>(0);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [qcUsername, setQcUsername] = useState<string | null>(null);
  const [miningTimestamp, setMiningTimestamp] = useState<string | null>(null);

  // Hydrate from localStorage after mount (prevents SSR mismatch)
  useEffect(() => {
    const tid = localStorage.getItem("telegramId");
    setUsername(localStorage.getItem("username"));
    setTelegramId(tid);
    setLastActiveTime(localStorage.getItem("lastactivetime"));
    setTelegramIdNm(localStorage.getItem("telegramIdNM"));
    setMiningTimestamp(localStorage.getItem("miningTime"));
    setWalletAddress(localStorage.getItem(`walletAddress_${tid}`));
    setQcUsername(localStorage.getItem(`qcUsername_${tid}`));
    setRank(localStorage.getItem(`rank_${tid}`));
    setRemainingSolveToEarn(Number(sessionStorage.getItem("remainingSolveToEarn")) || 0);

    const dailyVal = localStorage.getItem(`daily_${tid}`);
    setDaily(dailyVal ? parseFloat(dailyVal) : 0);

    const amount = localStorage.getItem(`QAmount_${tid}`);
    if (amount) {
      const num = Number(amount.replace(/,/g, ""));
      SetMainQuantAmount(isNaN(num) ? amount : num.toLocaleString("en-US", { maximumFractionDigits: 0 }));
    }
  }, []);

  // Real-time Firestore listener for QuantAmount — keeps balance always up to date
  const quantListenerRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!telegramId) return;
    // Clean up previous listener
    if (quantListenerRef.current) quantListenerRef.current();

    const valueRef = doc(dbfs, "user", telegramId, "miningData", "values");
    const unsub = onSnapshot(valueRef, (snap) => {
      if (!snap.exists()) return;
      const raw = snap.data()?.QuantAmount;
      if (raw == null) return;
      const num = Number(raw);
      if (isNaN(num)) return;
      const formatted = num.toLocaleString("en-US", { maximumFractionDigits: 0 });
      SetMainQuantAmount(formatted);
      if (typeof window !== "undefined") {
        localStorage.setItem(`QAmount_${telegramId}`, formatted);
      }
    }, () => {
      // Silently ignore snapshot errors (permission denied, etc.)
    });
    quantListenerRef.current = unsub;
    return () => unsub();
  }, [telegramId]);

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
    setQcUsername(null);
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
    qcUsername,
    setQcUsername,
    resetContext,
  }), [
    username, telegramId, miningActive, lastActiveTime, miningTimestamp,
    MainQuantAmount, jointext, rank, telegramIdNM, daily, remainingSolveToEarn, walletAddress, qcUsername
  ]);
    
  return (
    <userContext.Provider value={contextValue}>
      {children}
    </userContext.Provider>
  );
};

export const useUserContext = () => useContext(userContext);