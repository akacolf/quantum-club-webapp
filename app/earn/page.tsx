'use client';
import React, {  useEffect } from 'react';
import EarnPageContent from './EarnPageContent';
import { getAuth } from 'firebase/auth';
const EarnPage = () => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.Telegram?.WebApp?.initData) {
        window.location.href = "https://t.me/QuantumClubBot";
        return;
      }
    }
    const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type;
    if (navigationType === "reload") {
      window.location.replace("/");
    }
  }, []);
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
    } else {
      console.error("Permisson denied");
      window.location.replace("/")
      return;
    }
  }, []);
  return (
        <EarnPageContent />
  );
};

export default EarnPage;
