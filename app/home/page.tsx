'use client';

import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import Loader from '@/app/components/MainLoader';
import dynamic from 'next/dynamic';

const HomePageContent = dynamic(() => import('./HomePageContent'), {
  loading: () => <Loader />,
  ssr: false,
});

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
    <div />
  ) : (

    <HomePageContent />
 )

 );
};

export default HomePage;
