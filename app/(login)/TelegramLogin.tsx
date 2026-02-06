"use client";
import { useDeviceDetection } from "./deviceDetection";
import { UseRegisterAndAuth } from "./registerAndAuth";
import { useSafeArea } from "./safeArea";
import Loader from "../(components)/Loader";
import { useEffect } from "react";
import { authenticateUser } from "@/lib/telegramAuth";
import { encryptData } from "@/app/actions/actions";
import { useRouter } from "next/navigation";
import { useGameContext } from "../(contexts)/MiningContext";
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
    setLastActiveTime,
    setRemainingSolveToEarn,
  } = useGameContext();
  const { setUserRank } = useLeaderboardContext();
  useEffect(()=>{
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const getData = async()=>{
      if (!isMounted) return;
      if(typeof window !=="undefined" && window.Telegram && window.Telegram.WebApp){
        const WebApp = window?.Telegram?.WebApp;
        if (!WebApp) return;
        WebApp.ready();
        const initDataUnsafe = WebApp.initDataUnsafe
         const authenticated = await authenticateUser();
        if (authenticated && isMounted) {
          const encrypedId = await encryptData(initDataUnsafe.user?.id.toString() || "");
          if(!encrypedId) {
            if (isMounted) {
              timeoutId = setTimeout(getData, 100);
            }
            return;
          }
          const cleanData = encrypedId.toString();
        const telegramIdEncrypted = cleanData
          .replace(/['"]+/g, "")
          .replace(/[^a-zA-Z0-9]/g, "");
        const uid = String(telegramIdEncrypted);
        const responseAuth = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramId: uid }),
        });

        if (!responseAuth.ok) {
          const errorData = await responseAuth.text();
          throw new Error(`API Error: ${responseAuth.status} - ${errorData}`);
        }
        if (!isMounted) return;
        const { customToken } = await responseAuth.json();
        await auth?.loginWithToken(customToken)
        const data =  await UseRegisterAndAuth({telegramIdEncrypted,initDataUnsafe});
        
        if (!isMounted) return;
        
         if(data.status ==="maintenance"){
          router.replace('/maintenance');
          return;
         }
         if(data.status ==="error"){
          timeoutId = setTimeout(getData, 100);
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
        setLastActiveTime(data.lastActiveTime);
        setRemainingSolveToEarn(data.remainingSolveToEarn);
        router.replace('/home'); 
        }
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

  return <Loader />;
}