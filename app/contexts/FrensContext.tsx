"use client";
import { Referral } from "@/lib/interfaces";
import React, {createContext, useContext, useEffect, useState, ReactNode} from "react";

interface FrensContextType {
  referralsContext: Array<Referral>,
  setReferralsContext: (value: Array<Referral>) => void;
  addReferral: (newReferral: Referral) => void;
  referralsNum: number;
  setReferralNum: (value: number) => void;
}


const FrensContext = createContext<FrensContextType>({} as FrensContextType);
/*const FrensContext = createContext({
  referralsContext: [],
  setReferralsContext: (value: any) => {},
  addReferral: (newReferral: any) => {},
  referralsNum: 0,
  setReferralNum: (value: number) => {},
});*/

export const FrensProvider = ({ children }: { children: ReactNode }) => {
  const [referralsContext, setReferralsContext] = useState(() => {
    if (typeof window !== "undefined") {
      const savedReferrals = sessionStorage.getItem("referrals");
      return savedReferrals ? JSON.parse(savedReferrals) : []; // Boşsa dizi döndür
    }
  });

  const [referralsNum, setReferralNum] = useState(() => {
    if (typeof window !== "undefined") {
      const referralsNumValue = sessionStorage.getItem("Num");
      if (referralsNumValue) {
        return parseInt(referralsNumValue, 10) || 0;
      } else {
        return 0;
      }
    }
    return 0;
  });

  useEffect(() => {
    const savedReferrals = sessionStorage.getItem("referrals");
    if (
      referralsContext.length > 0 &&
      savedReferrals !== JSON.stringify(referralsContext)
    ) {
      sessionStorage.setItem("referrals", JSON.stringify(referralsContext));
    }
  }, [referralsContext]);

  // Yeni referans eklerken benzersiz olmasına dikkat et
  const addReferral = (newReferral: Referral) => {
    setReferralsContext((prevState: Array<Referral>) => {
      const isAlreadyExist = prevState.some(
        (referral) => referral.id === newReferral.id
      ); // Benzersiz kontrolü için userName kullanıyoruz
      if (!isAlreadyExist) {
        const updatedReferrals = [...prevState, newReferral];
        return updatedReferrals;
      }
      return prevState;
    });
  };

  return (
    <FrensContext.Provider
      value={{
        referralsContext,
        setReferralsContext,
        addReferral,
        referralsNum,
        setReferralNum,
      }}
    >
      {children}
    </FrensContext.Provider>
  );
};
export const useFrenContext = () => {
  return useContext(FrensContext);
};
