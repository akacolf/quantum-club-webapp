'use client';

import React, { useEffect, useState } from 'react';
import HomePageContent from './HomePageContent';
import { getAuth } from 'firebase/auth';
const HomePage = () => {
  const [maintenance, setMaintenance] = useState(true);
  const [isReloading, setIsReloading] = useState(false);


  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.Telegram?.WebApp?.initData) {
        window.location.href = "https://t.me/QuantumClubBot";
        return;
      }
    }
    if (typeof window !== "undefined") {
      window?.Telegram?.WebApp.BackButton.hide();
    }
    const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type;
    if (navigationType === 'reload') {
      setIsReloading(true);
      if (typeof window !== "undefined") { window.location.replace("/"); }
    } else {
      setIsReloading(false);
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.Telegram?.WebApp?.initData) {
        window.location.href = "https://t.me/QuantumClubBot";
        return;
      }
    }
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
    } else {
      console.error("Permisson denied");
      if (typeof window !== "undefined") { window.location.replace("/") }
      return;
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.Telegram?.WebApp?.initData) {
        window.location.href = "https://t.me/QuantumClubBot";
        return;
      }
    }
    if (typeof window !== "undefined") {
      const WebApp = window.Telegram?.WebApp
      if (!WebApp?.initDataUnsafe.user) {
        return;
      } else {
        const mp = sessionStorage.getItem('maintenance');
        setMaintenance(mp === 'true');
        if (mp === 'true') {
          if (typeof window !== "undefined") { window.location.replace("/maintenance") }
        }
      }
    }
  }, []);

  return (
      isReloading ?
        (<div></div>) :
        (
          maintenance ? (
            <div></div>
          ) : (
            <HomePageContent />
          )
        )
  );
};

export default HomePage;
