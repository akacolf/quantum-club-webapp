"use client";
import { useEffect, useState } from "react";
import SolveToEarnPageContent from "./SolveToEarnPageContent";
import { getAuth } from "firebase/auth";

const SolveToEarnPage = () => {
    const [isReloading, setIsReloading] = useState(false);
    const [maintenance,setMaintenance] = useState(true);
    useEffect(() =>{
      if(typeof window !== "undefined"){
        if(!window.Telegram?.WebApp?.initData){
          window.location.href = "https://t.me/QuantumClubBot";
          return;
        }
      }
      const navigationType = performance.getEntriesByType("navigation")[0]?.type;
      if (navigationType === "reload") {
        setIsReloading(true);
        window.location.replace("/");
      } else {
        setIsReloading(false);
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
          const mp = sessionStorage.getItem('maintenance');
          setMaintenance(mp==true ? true : false);
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