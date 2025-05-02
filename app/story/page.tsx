'use client';

import React, {  useEffect } from 'react';
import StoryPageContent from './StoryPageContent';
import { getAuth } from 'firebase/auth';
const StoryPage = () => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.Telegram?.WebApp?.initData) {
        window.location.href = "https://t.me/QuantumClubBot";
        return;
      }
    }
    const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type;
    if (navigationType === 'reload') {
      if (typeof window !== "undefined") { window.location.replace("/"); }
    }
  });
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
    } else {
      console.error("Permisson denied");
      if (typeof window !== "undefined") { window.location.replace("/") }
      return;
    }
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      const WebApp = window.Telegram?.WebApp
      if (!WebApp?.initDataUnsafe.user) {
        return;
      } else {
        const mp = sessionStorage.getItem('maintenance');
        if (mp === "true") {
          if (typeof window !== "undefined") { window.location.replace("/maintenance-page") }
        }
      }
    }
  });
  return (
          <StoryPageContent />
  );
};

export default StoryPage;
