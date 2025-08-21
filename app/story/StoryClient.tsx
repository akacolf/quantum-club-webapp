'use client';

import React, { useEffect } from 'react';
import StoryContent from './Content';
import { getAuth } from 'firebase/auth';

const StoryClient = () => {

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    if (!window.Telegram?.WebApp?.initData) {
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

  return <StoryContent />;
};

export default StoryClient;