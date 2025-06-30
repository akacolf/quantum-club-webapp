"use client";

import React, { useEffect } from "react";
import { getAuth } from "firebase/auth";
import EcosystemPageContent from "./EcosystemPageContent";

const EcosystemPage = () => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      //telegram check
      if (!window.Telegram?.WebApp?.initData) {
        window.location.href = "https://t.me/QuantumClubBot";
        return;
      }
    }
    //hide back button
    if (typeof window !== "undefined") {
      window?.Telegram?.WebApp.BackButton.hide();
    }
    //reload check
    const navigationType = (
      performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming
    )?.type;
    if (navigationType === "reload") {
      window.location.replace("/");
      return;
    }

    //firebase auth check
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
    } else {
      console.error("Permisson denied");
      window.location.replace("/");
      return;
    }
  }, []);

  return <EcosystemPageContent />;
};

export default EcosystemPage;
