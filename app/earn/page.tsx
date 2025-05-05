'use client';
import React, {  useEffect, useState } from 'react';
import EarnPageContent from './EarnPageContent';
import { getAuth } from 'firebase/auth';
const EarnPage = () => {
  const [isReloading, setIsReloading] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.Telegram?.WebApp?.initData) {
        window.location.href = "https://t.me/QuantumClubBot";
        return;
      }
    }
    const navigationType = performance.getEntriesByType("navigation")[0]?.type;
    if (navigationType === "reload") {
      setIsReloading(true);
      window.location.replace("/");
    } else {
      setIsReloading(false);
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
