"use client";

import { ReactNode } from "react";
import { useFrensStore } from "@/stores/frens-store";
import { useShallow } from "zustand/shallow";

export const useFrenContext = () =>
  useFrensStore(
    useShallow((s) => ({
      referralsContext: s.referralsContext,
      setReferralsContext: s.setReferralsContext,
      addReferral: s.addReferral,
      referralsNum: s.referralsNum,
      setReferralNum: s.setReferralNum,
    }))
  );

export const FrensProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};
