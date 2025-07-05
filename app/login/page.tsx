"use client";
import React from "react";
import "@/app/globals.css";
import DeviceDetection from "./components/DeviceDetection";
import { useRegisterAndAuth } from "./hooks/registerAndAuth";
import Loader from "../components/MainLoader";
import { useSafeArea } from "./hooks/safeArea";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: {
          user?: {
            is_premium:boolean,
            is_bot:boolean,
            id: number,
            username: string | null;
            first_name: string;
          }
          start_param?: string;
        };
        initDataUnsafe: {
          user?: {
            is_premium:boolean,
            is_bot:boolean,
            id: number,
            username: string | null;
            first_name: string;
          }
          start_param?: string;
        };
        ready: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        requestFullscreen: () => void;
        openTelegramLink: (link:string|undefined) => void;
        navigator: () => void;
        disableVerticalSwipes: () => void;
        BackButton: {
          hide: () => void;
          show: () => void;
          onClick: (callback:()=>void) => void;
          offClick: (callback:()=>void) => () => void;
        };
        safeAreaInset: {
          top: number; 
          bottom: number;
          left: number;
          right: number;
        };
      };
    };
  }
};

export default function Login() {
  useRegisterAndAuth();
  useSafeArea();

  {/*async function encryptData(telegramId:string) {
    const response = await fetch("/api/encryptID", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: telegramId }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const firstData = await response.json();
    const encryptedData = JSON.stringify(firstData.encryptedBase64);
    return encryptedData;
  }*/}
  {/*async function userAuth(telegramIdEncrypted:string) {
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

    const { customToken } = await responseAuth.json();
    if (!customToken) throw new Error("Invalid token");
    const authTg = getAuth();
    if (authTg.currentUser) {
      return authTg.currentUser.uid;
    }
    try {
      await signInWithCustomToken(authTg, customToken);
      if (authTg.currentUser) {
        const currentUser = authTg.currentUser as User; // Explicitly cast to User type
        const uid: string = currentUser.uid;
        localStorage.setItem("telegramId", uid);
        return uid;
      } else {
        throw new Error("The user has not logged in.");
      }
    } catch (error) {
      console.error(error);
    }
  }*/}
  return (
    <>
    <DeviceDetection />
    <Loader />
    </>
  )
};

