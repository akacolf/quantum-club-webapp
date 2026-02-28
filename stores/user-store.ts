"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserState {
  username: string | null;
  telegramId: string | null;
  miningActive: boolean;
  lastActiveTime: string | null;
  miningTimestamp: string | null;
  MainQuantAmount: string;
  jointext: string;
  rank: string | null;
  telegramIdNM: string | null;
  daily: number;
  remainingSolveToEarn: number;
  walletAddress: string | null;
  qcUsername: string | null;
}

interface UserActions {
  setUsername: (value: string | null) => void;
  setTelegramId: (value: string | null) => void;
  setMiningActive: (value: boolean) => void;
  setLastActiveTime: (value: string | null) => void;
  setMiningTimestamp: (value: string | null) => void;
  SetMainQuantAmount: (value: string) => void;
  setJoinButtonText: (value: string) => void;
  setRank: (value: string | null) => void;
  setTelegramIdNm: (value: string | null) => void;
  setDaily: (value: number) => void;
  setRemainingSolveToEarn: (value: number) => void;
  setWalletAddress: (value: string | null) => void;
  setQcUsername: (value: string | null) => void;
  setUserData: (data: Partial<UserState>) => void;
  reset: () => void;
}

export type UserStore = UserState & UserActions;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const defaultState: UserState = {
  username: null,
  telegramId: null,
  miningActive: false,
  lastActiveTime: null,
  miningTimestamp: null,
  MainQuantAmount: "0",
  jointext: "Join",
  rank: null,
  telegramIdNM: null,
  daily: 0,
  remainingSolveToEarn: 0,
  walletAddress: null,
  qcUsername: null,
};

// ---------------------------------------------------------------------------
// Legacy localStorage migration
// ---------------------------------------------------------------------------

function migrateLegacyLocalStorage(state: UserState): Partial<UserState> {
  if (typeof window === "undefined") return {};

  const tid = localStorage.getItem("telegramId");
  if (!tid) return {};

  // Only migrate if the store doesn't already have a telegramId
  // (i.e. first load after deployment)
  if (state.telegramId) return {};

  const patch: Partial<UserState> = {};
  patch.telegramId = tid;

  const username = localStorage.getItem("username");
  if (username) patch.username = username;

  const lastActiveTime = localStorage.getItem("lastactivetime");
  if (lastActiveTime) patch.lastActiveTime = lastActiveTime;

  const telegramIdNM = localStorage.getItem("telegramIdNM");
  if (telegramIdNM) patch.telegramIdNM = telegramIdNM;

  const miningTime = localStorage.getItem("miningTime");
  if (miningTime) patch.miningTimestamp = miningTime;

  const walletAddress = localStorage.getItem(`walletAddress_${tid}`);
  if (walletAddress) patch.walletAddress = walletAddress;

  const qcUsername = localStorage.getItem(`qcUsername_${tid}`);
  if (qcUsername) patch.qcUsername = qcUsername;

  const rank = localStorage.getItem(`rank_${tid}`);
  if (rank) patch.rank = rank;

  const dailyVal = localStorage.getItem(`daily_${tid}`);
  if (dailyVal) patch.daily = parseFloat(dailyVal) || 0;

  const amount = localStorage.getItem(`QAmount_${tid}`);
  if (amount) {
    const num = Number(amount.replace(/,/g, ""));
    patch.MainQuantAmount = isNaN(num)
      ? amount
      : num.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  return patch;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      ...defaultState,

      // Individual setters (matching existing API names exactly)
      setUsername: (value) => set({ username: value }),
      setTelegramId: (value) => set({ telegramId: value }),
      setMiningActive: (value) => set({ miningActive: value }),
      setLastActiveTime: (value) => set({ lastActiveTime: value }),
      setMiningTimestamp: (value) => set({ miningTimestamp: value }),
      SetMainQuantAmount: (value) => set({ MainQuantAmount: value }),
      setJoinButtonText: (value) => set({ jointext: value }),
      setRank: (value) => set({ rank: value }),
      setTelegramIdNm: (value) => set({ telegramIdNM: value }),
      setDaily: (value) => set({ daily: value }),
      setRemainingSolveToEarn: (value) => set({ remainingSolveToEarn: value }),
      setWalletAddress: (value) => set({ walletAddress: value }),
      setQcUsername: (value) => set({ qcUsername: value }),

      // Batch setter for login/signup flows
      setUserData: (data) => set(data),

      // Reset all fields to defaults
      reset: () => set(defaultState),
    }),
    {
      name: "user-storage",
      // Exclude session-only fields and actions from serialization
      partialize: (state) => ({
        username: state.username,
        telegramId: state.telegramId,
        miningActive: state.miningActive,
        lastActiveTime: state.lastActiveTime,
        miningTimestamp: state.miningTimestamp,
        MainQuantAmount: state.MainQuantAmount,
        jointext: state.jointext,
        rank: state.rank,
        telegramIdNM: state.telegramIdNM,
        daily: state.daily,
        // remainingSolveToEarn excluded — session-only, fetched from Firestore
        walletAddress: state.walletAddress,
        qcUsername: state.qcUsername,
      }),
      onRehydrateStorage: () => () => {
        // NOTE: The after-callback receives `undefined` as state when the
        // storage key doesn't exist (first load after deployment). We use
        // getState() instead which always returns the current store state.
        const current = useUserStore.getState();

        // Migrate legacy per-key localStorage values on first load
        if (!current.telegramId) {
          const patch = migrateLegacyLocalStorage(current);
          if (Object.keys(patch).length > 0) {
            useUserStore.setState(patch);
          }
        }

        // Hydrate session-only field
        if (typeof window !== "undefined") {
          const ste = Number(sessionStorage.getItem("remainingSolveToEarn"));
          if (ste) useUserStore.setState({ remainingSolveToEarn: ste });
        }
      },
    }
  )
);

// ---------------------------------------------------------------------------
// Firestore hydration hook
// ---------------------------------------------------------------------------

/**
 * Sets up a real-time Firestore listener for the user's QuantAmount.
 * Call this once near the top of the component tree (e.g. ClientProviders).
 */
export function useUserHydration() {
  const telegramId = useUserStore((s) => s.telegramId);
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!telegramId) return;

    // Clean up previous listener
    if (listenerRef.current) listenerRef.current();

    const valueRef = doc(dbfs, "user", telegramId, "miningData", "values");
    const unsub = onSnapshot(
      valueRef,
      (snap) => {
        if (!snap.exists()) return;
        const raw = snap.data()?.QuantAmount;
        if (raw == null) return;
        const num = Number(raw);
        if (isNaN(num)) return;
        const formatted = num.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        });
        useUserStore.getState().SetMainQuantAmount(formatted);
        // Also write legacy key for code that reads it directly
        if (typeof window !== "undefined") {
          localStorage.setItem(`QAmount_${telegramId}`, formatted);
        }
      },
      () => {
        // Silently ignore snapshot errors (permission denied, etc.)
      }
    );

    listenerRef.current = unsub;
    return () => unsub();
  }, [telegramId]);
}
