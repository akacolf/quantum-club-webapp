'use client';

import React, { useEffect } from 'react';
import StoryPageContent from './StoryPageContent';
import { getAuth } from 'firebase/auth';

const StoryClient = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    if (!window.Telegram?.WebApp?.initData) {
      window.location.href = "https://t.me/QuantumClubBot";
      return;
    }

    
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      console.error("Permission denied");
      window.location.replace("/");
      return;
    }

   
    const WebApp = window.Telegram?.WebApp;
    if (!WebApp?.initDataUnsafe.user) {
      return;
    }
    const mp = sessionStorage.getItem('maintenance');
    if (mp === "true") {
      window.location.replace("/maintenance");
      return;
    }

  }, []);

  return <StoryPageContent />;
};

export default StoryClient;

{/*useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.Telegram?.WebApp?.initData) {
        window.location.href = "https://t.me/QuantumClubBot";
        return;
      }
    }
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      console.error("Permission denied");
      if (typeof window !== "undefined") { window.location.replace("/") }
      return;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const WebApp = window.Telegram?.WebApp
      if (!WebApp?.initDataUnsafe.user) {
        return;
      } else {
        const mp = sessionStorage.getItem('maintenance');
        if (mp === "true") {
          if (typeof window !== "undefined") { window.location.replace("/maintenance") }
        }
      }
    }
  }, []);*/}