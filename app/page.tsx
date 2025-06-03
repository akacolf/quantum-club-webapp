"use client"
import { useEffect } from "react";
import LoginScreen from "./login/page";
import telegramAnalytics from '@telegram-apps/analytics';
export default function Page() {
    useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
      telegramAnalytics.init({
        token: "eyJhcHBfbmFtZSI6InFfY2x1Yl8zOTAxIiwiYXBwX3VybCI6Imh0dHBzOi8vdC5tZS9RdWFudHVtQ2x1YkJvdCIsImFwcF9kb21haW4iOiJodHRwczovL3d3dy5xdWFudHVtY2x1Yi5zcGFjZS8ifQ==!jZPSceSMdMSx0S9SaAcGgbIYARHmiPMSW59Y3KIZln4=",
        appName: "q_club_3901",
      });
      telegramAnalytics.init({
        token: "eyJhcHBfbmFtZSI6InFfY2x1Yl8zOTAxIiwiYXBwX3VybCI6Imh0dHBzOi8vdC5tZS9RdWFudHVtQ2x1YkJvdCIsImFwcF9kb21haW4iOiJodHRwczovL3d3dy5xdWFudHVtY2x1Yi5zcGFjZS8ifQ==!wAvfqyWFodC/6C6W9CQ+P3acBowTY/EvPkx+SdBP8Ec=",
        appName: "q_club_3901",
      });
      
    }
  }, []);
  return (
  <>
    <LoginScreen />
  </>
  );
}
