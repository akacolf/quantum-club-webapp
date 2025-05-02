'use client';

import React, {  useEffect } from 'react';
import FriendsPageContent from './FriendsPageContent/FriendsPageContent'; // Asıl içeriği başka bir dosyaya taşıyoruz.
import { getAuth } from 'firebase/auth';

const FriendsPage = () => {
 

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
      window.location.replace("/");
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
      window.location.replace("/")
      return;
    }
  }, []);
  return (
            <FriendsPageContent />
  );
};

export default FriendsPage;
