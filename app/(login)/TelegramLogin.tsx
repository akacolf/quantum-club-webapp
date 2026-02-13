"use client";
import { useDeviceDetection } from "./deviceDetection";
import { UseRegisterAndAuth } from "./registerAndAuth";
import { useSafeArea } from "./safeArea";
import Loader from "../(components)/Loader";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "../(contexts)/UserContext";
import { useLeaderboardContext } from "../(contexts)/LeaderboardContext";
import { useAuth } from "../(contexts)/auth";
export default function TelegramLogin() {
  const auth = useAuth();
  const router = useRouter();
  const {
    setTelegramId,
    SetMainQuantAmount,
    setRank,
    setDaily,
    setUsername,
    setWalletAddress,
    setQcUsername,
    setLastActiveTime,
    setRemainingSolveToEarn,
  } = useUserContext();
  const { setUserRank } = useLeaderboardContext();
  useEffect(()=>{
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let authRetries = 0;
    let registerRetries = 0;
    const MAX_AUTH_RETRIES = 3;
    const MAX_REGISTER_RETRIES = 3;
    
    const getBackoffDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 8000);
    
    const getData = async()=>{
      if (!isMounted) return;
      if(typeof window !=="undefined" && window.Telegram && window.Telegram.WebApp){
        const WebApp = window?.Telegram?.WebApp;
        if (!WebApp) return;
        WebApp.ready();
        const initDataUnsafe = WebApp.initDataUnsafe;
        const initData = WebApp.initData;

        if (!initDataUnsafe?.user?.id || !initData) {
          if (isMounted) {
            timeoutId = setTimeout(getData, 100);
          }
          return;
        }

        const responseAuth = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });

        if (!responseAuth.ok) {
          authRetries++;
          if (authRetries >= MAX_AUTH_RETRIES) {
            console.error("Telegram auth failed after max retries, redirecting to login");
            if (isMounted) router.replace('/');
            return;
          }
          if (isMounted) {
            timeoutId = setTimeout(getData, getBackoffDelay(authRetries));
          }
          return;
        }
        if (!isMounted) return;
        // Enable keepLoggedIn for Telegram auto-login
        auth?.setKeepLoggedIn(true);
        const { customToken, telegramIdEncrypted } = await responseAuth.json();
        if (!customToken || !telegramIdEncrypted) {
          authRetries++;
          if (authRetries >= MAX_AUTH_RETRIES) {
            console.error("Telegram auth incomplete after max retries, redirecting to login");
            if (isMounted) router.replace('/');
            return;
          }
          if (isMounted) {
            timeoutId = setTimeout(getData, getBackoffDelay(authRetries));
          }
          return;
        }
        await auth?.loginWithToken(customToken);
        const data = await UseRegisterAndAuth({telegramIdEncrypted,initDataUnsafe});
        
        if (!isMounted) return;
        
         if(data.status ==="maintenance"){
          router.replace('/maintenance');
          return;
         }
         if(data.status ==="error"){
          registerRetries++;
          if (registerRetries >= MAX_REGISTER_RETRIES) {
            console.error("Registration failed after max retries, redirecting to login");
            if (isMounted) router.replace('/');
            return;
          }
          if (isMounted) {
            timeoutId = setTimeout(getData, getBackoffDelay(registerRetries));
          }
          return;
         }
         if(data.status ==="completed"){
        setTelegramId(data.telegramId);
        SetMainQuantAmount(data.MainQuantAmount);
        setRank(data.rank);
        setUserRank(data.userRank);
        setDaily(data.daily);
        setUsername(data.username);
        setWalletAddress(data.walletAddress);
        if (data.qcUsername) {
          setQcUsername(data.qcUsername);
          localStorage.setItem(`qcUsername_${data.telegramId}`, data.qcUsername);
        }
        if (data.userRank != null) sessionStorage.setItem("userLeaderRank", String(data.userRank));
        setLastActiveTime(data.lastActiveTime);
        setRemainingSolveToEarn(data.remainingSolveToEarn);
        router.replace('/home'); 
        }
      }else{
        // WebApp not ready yet, silently retry
        if (isMounted) {
          timeoutId = setTimeout(getData, 100);
        }
      }
    }
    getData()
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  },[])
  useSafeArea();
  useDeviceDetection();

  // Hide back button on login screen
  useEffect(() => {
    window.Telegram?.WebApp?.BackButton.hide();
  }, []);

  return <Loader />;
}
