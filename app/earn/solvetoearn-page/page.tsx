"use client";
import { useEffect } from "react";
import SolveToEarnPageContent from "./SolveToEarnPageContent";
import { getAuth } from "firebase/auth";

const SolveToEarnPage = () => {
    useEffect(() =>{
      if(typeof window !== "undefined"){
        if(!window.Telegram?.WebApp?.initData){
          window.location.href = "https://t.me/QuantumClubBot";
          return;
        }
      }
      const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type;
      if (navigationType === "reload") {
        window.location.replace("/");
      } else {
      }
    },[]);
   useEffect(()=>{
      const auth = getAuth();
            const user = auth.currentUser;
            if (user) {
            } else {
              console.error("Permisson denied");
              window.location.replace("/")
              return;
            }
    },[]);
    useEffect(() =>{
        if(typeof window !== "undefined"){
        const WebApp = window.Telegram?.WebApp
        if(!WebApp?.initDataUnsafe.user){
          return;
        }else{
          const mp:boolean = Boolean(sessionStorage.getItem('maintenance'));
          if(mp == true){
            if(typeof window !== "undefined")
              { window.location.replace("/maintenance-page")}
          }
        }
        }
      },[]);
  return (
    
        <SolveToEarnPageContent />

  );
};

export default SolveToEarnPage;