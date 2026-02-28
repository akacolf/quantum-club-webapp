"use client";

import { create } from "zustand";
import { Referral } from "@/lib/interfaces";

interface FrensState {
  referralsContext: Referral[];
  referralsNum: number;
}

interface FrensActions {
  setReferralsContext: (value: Referral[]) => void;
  addReferral: (newReferral: Referral) => void;
  setReferralNum: (value: number) => void;
}

export type FrensStore = FrensState & FrensActions;

export const useFrensStore = create<FrensStore>()((set) => ({
  referralsContext: [],
  referralsNum: 0,

  setReferralsContext: (value) => {
    set({ referralsContext: value });
    // Sync to sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.setItem("referrals", JSON.stringify(value));
    }
  },

  addReferral: (newReferral) =>
    set((state) => {
      const exists = state.referralsContext.some((r) => r.id === newReferral.id);
      if (exists) return state;
      const updated = [...state.referralsContext, newReferral];
      // Sync to sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.setItem("referrals", JSON.stringify(updated));
      }
      return { referralsContext: updated };
    }),

  setReferralNum: (value) => set({ referralsNum: value }),
}));

/**
 * Hydrates frens state from sessionStorage.
 * Called once in ClientProviders on mount.
 */
export function hydrateFrensFromSession() {
  if (typeof window === "undefined") return;
  try {
    const saved = sessionStorage.getItem("referrals");
    if (saved) useFrensStore.setState({ referralsContext: JSON.parse(saved) });
  } catch {}
  const num = sessionStorage.getItem("Num");
  if (num) useFrensStore.setState({ referralsNum: parseInt(num, 10) || 0 });
}
