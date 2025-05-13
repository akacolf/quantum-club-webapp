'use client';

import React, { Suspense, useEffect, useState } from 'react';
const HomePageContent = React.lazy(() => import('./HomePageContent'));
import { getAuth } from 'firebase/auth';
import Loader from '../loading';
const HomePage = () => {
  const [maintenance, setMaintenance] = useState(true);

 
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.Telegram?.WebApp.BackButton.hide();
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
      
          maintenance ? (
            <div></div>
          ) : (
            
            <Suspense fallback={<Loader/>}>
              <HomePageContent />
            </Suspense>
          )
  );
};

export default HomePage;
