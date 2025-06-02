"use client";

import { dbfs } from "@/app/firebase/firebaseConfig";
import {
  doc,
  getDocs,
  collection,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useGameContext } from "../contexts/MiningContext";
import { motion, AnimatePresence } from "framer-motion";
//import tasks from "@/app/earn/tasks";//
//import { ButtonLoader } from "../loaders/ButtonLoader";
import { toUserFriendlyAddress } from "@tonconnect/sdk";
import { useRouter } from "next/navigation";
import { THEME, useTonConnectUI } from "@tonconnect/ui-react";
import toast, { ToastBar, Toaster } from "react-hot-toast";
/*import { toNano } from "@ton/core";*/
import { TaskHistory } from "@/lib/interfaces";
import { ButtonLoader } from "../components/ButtonLoader";
import {
  bgSolveToEarnCard,
} from "../../public/images";
import HomeCarousel from "../components/homepagecarousel/Carousel";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import hundredAnimationData from "../../public/images/hundred-lottie.json";
import fireAnimationData from "../../public/images/fire-lottie.json";

const calculateRemainingTime = (timestamp: number) => {
  const now = new Date();
  const targetTime = new Date(timestamp);
  const diffMs = targetTime.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const minutes = String(Math.floor((diffMs / 1000 / 60) % 60)).padStart(
    2,
    "0"
  );
  const hours = String(Math.floor((diffMs / 1000 / 60 / 60) % 24)).padStart(
    2,
    "0"
  );
  return ` ${hours}h ${minutes}m`;
};

const HomePageContent = () => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const {
    MainQuantAmount,
    SetMainQuantAmount,
    rank,
    telegramId,
    daily,
    setDaily,
    walletAddress,
    setWalletAddress,
    setRemainingSolveToEarn,
    remainingSolveToEarn,
  } = useGameContext();
  const remainingSolveToEarnRef = useRef(remainingSolveToEarn);
  const router = useRouter();
  const [rankIcon, setRankIcon] = useState<ReactNode>();

  const [taskhistoryList, setTaskhistoryList] = useState<TaskHistory[]>([]);
  const [activeTab, setActiveTab] = useState(false);
  /*const task = tasks.find(
    (task) => task.id === "ba1e3046074448f8acb2bfe9797436db"
  );*/
  const [isClaimDay, setIsclaimDay] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const [isActiveWalletTab, setActiveWalletTab] = useState(false);
  const handleWalletConnection = useCallback(
    (address: string) => {
      setWalletAddress(address);
    },
    [setWalletAddress]
  ); // Add dependencies

  const handleWalletDisconnection = useCallback(() => {
    setWalletAddress("");
  }, [setWalletAddress]);
  const updateWalletInDB = useCallback(
    async (walletAddress: string, address: string) => {
      const response = await fetch("/api/tonconnections/tonConnectDB", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: telegramId,
          walletAddress: walletAddress,
          address: address,
        }),
      });
      if (!response.ok) {
        const errorData = await response.text();
        const parsedError = JSON.parse(errorData); // we parse it as json to throw the error //
        throw new Error(`API Error: ${parsedError.error}`);
      }
    },
    [telegramId]
  );
  useEffect(() => {
    if (!tonConnectUI) return;
    tonConnectUI.uiOptions = {
      language: "en",
      uiPreferences: {
        theme: THEME.DARK,
      },
    };
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      try {
        await tonConnectUI.connectionRestored;

        if (!isMounted) return; // Bileşen hala bağlı mı kontrol et

        // Bağlı cüzdan varsa state'i güncelle
        if (tonConnectUI.account?.address) {
          handleWalletConnection(tonConnectUI.account.address);
        } else {
          if (walletAddress) {
            handleWalletConnection(walletAddress);
          }
        }

        // Durum değişikliklerini dinle (SADECE BURADA VERİTABANI GÜNCELLE)
        unsubscribe = tonConnectUI.onStatusChange((wallet) => {
          if (wallet) {
            const address = wallet.account.address;
            const walletAddressFr = toUserFriendlyAddress(address);
            updateWalletInDB(walletAddressFr, address);
            handleWalletConnection(address);
          } else {
            updateWalletInDB("", "");
            handleWalletDisconnection();
          }
        });
      } catch (error) {
        console.error("Could not check wallet connection: ", error);
      }
    };

    setup();

    // Temizlik fonksiyonu: Dinleyiciyi kaldır ve bayrağı güncelle
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [
    tonConnectUI,
    handleWalletConnection,
    handleWalletDisconnection,
    updateWalletInDB,
    walletAddress,
  ]);

  const handleWalletAction = async () => {
    try {
      if (!tonConnectUI) throw new Error("TON Connect is not ready yet");

      // Bağlıysa bağlantıyı kes, değilse modal aç
      if (tonConnectUI.connected) {
        await tonConnectUI.disconnect();
      } else {
        await tonConnectUI.openModal();
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Wallet connection unsuccessful:", error?.message);
      }
    }
  };

  const formatAddress = (address: string) => {
    const tempAddress = toUserFriendlyAddress(address);
    return `${tempAddress.slice(0, 4)}...${tempAddress.slice(-4)}`;
  };
  async function goToSolveToEarn() {
    const taskElement = document.getElementById("solvetoearnbutton");
    if (taskElement) {
      (taskElement as HTMLButtonElement).disabled = true;
    }
    const date = new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate()
      )
    );

    const formattedDate =
      `${date.getUTCDate().toString().padStart(2, "0")}/` +
      `${(date.getUTCMonth() + 1).toString().padStart(2, "0")}/` +
      `${date.getUTCFullYear()}`;
    const solveToEarnSet = doc(dbfs, `user/${telegramId}/miningData/values`);
    const snapshotSolveToEarn = await getDoc(solveToEarnSet);
    const remainingSolveToEarn: number =
      snapshotSolveToEarn.data()?.remainingSolveToEarn;
    if (remainingSolveToEarn > 0) {
      updateDoc(solveToEarnSet, {
        remainingSolveToEarn: remainingSolveToEarn - 1,
        lastSolveToEarnDate: formattedDate,
      });
      setRemainingSolveToEarn(remainingSolveToEarn - 1);
      sessionStorage.setItem(
        "remainingSolveToEarn",
        `${remainingSolveToEarn - 1}`
      );
      router.push("/earn/solvetoearn");
    }
  }
  useEffect(() => {
    try {
      const checkSolveToEarn = async () => {
        const solveToEarnRef = doc(
          dbfs,
          `user/${telegramId}/miningData/values`
        );
        const snapshotSolveToEarn = await getDoc(solveToEarnRef);
        const remainingSolveToEarnDB = snapshotSolveToEarn.exists()
          ? snapshotSolveToEarn.data().remainingSolveToEarn
          : 0;
        setRemainingSolveToEarn(remainingSolveToEarnDB);
      };
      checkSolveToEarn();
      if (remainingSolveToEarn > 0) {
        router.prefetch("/earn/solvetoearn");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      }
    }
  }, [remainingSolveToEarn, router, setRemainingSolveToEarn, telegramId]);
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setTaskhistoryList([]);
        const tasksRef = collection(dbfs, `user/${telegramId}/tasks`);
        const snapshotTasks = await getDocs(tasksRef);
        const rewardsRef = collection(
          dbfs,
          `user/${telegramId}/rewardsHistory`
        );
        const snapshotRewards = await getDocs(rewardsRef);
        //Task History
        const tasks = !snapshotTasks.empty
          ? snapshotTasks.docs.map((doc) => {
              let platform = doc.data().platform;
              if (
                platform === "telegram" ||
                platform === "ic:baseline-telegram"
              ) {
                platform = (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="2.5em"
                    height="2.5em"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#FFF"
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19c-.14.75-.42 1-.68 1.03c-.58.05-1.02-.38-1.58-.75c-.88-.58-1.38-.94-2.23-1.5c-.99-.65-.35-1.01.22-1.59c.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02c-.09.02-1.49.95-4.22 2.79c-.4.27-.76.41-1.08.4c-.36-.01-1.04-.2-1.55-.37c-.63-.2-1.12-.31-1.08-.66c.02-.18.27-.36.74-.55c2.92-1.27 4.86-2.11 5.83-2.51c2.78-1.16 3.35-1.36 3.73-1.36c.08 0 .27.02.39.12c.1.08.13.19.14.27c-.01.06.01.24 0 .38"
                    ></path>
                  </svg>
                );
              }
              if (platform === "twitter" || platform === "pajamas:twitter") {
                platform = (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="2.5em"
                    height="2.5em"
                    viewBox="0 0 16 16"
                  >
                    <path
                      fill="#FFF"
                      d="M9.294 6.928L14.357 1h-1.2L8.762 6.147L5.25 1H1.2l5.31 7.784L1.2 15h1.2l4.642-5.436L10.751 15h4.05zM7.651 8.852l-.538-.775L2.832 1.91h1.843l3.454 4.977l.538.775l4.491 6.47h-1.843z"
                    ></path>
                  </svg>
                );
              }
              if (platform === "chemist") {
                platform = (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="2.5em"
                    height="2.5em"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#FFF"
                      d="M2 4v2h2V4zm18 0v2h2V4zM2 7v2h2V7zm3 0v2h2V7zm9 0v2h2V7zm3 0v2h2V7zm3 0v2h2V7zM2 10v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2zM2 13v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2zM5 17v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2zm3 0v2h2v-2z"
                    ></path>
                  </svg>
                );
              }
              if (platform === "instagram") {
                platform = (
                  <div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="2.5em"
                      height="2.5em"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="#fff"
                        d="M12.001 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6m0-2a5 5 0 1 1 0 10a5 5 0 0 1 0-10m6.5-.25a1.25 1.25 0 0 1-2.5 0a1.25 1.25 0 0 1 2.5 0M12.001 4c-2.474 0-2.878.007-4.029.058c-.784.037-1.31.142-1.798.332a2.9 2.9 0 0 0-1.08.703a2.9 2.9 0 0 0-.704 1.08c-.19.49-.295 1.015-.331 1.798C4.007 9.075 4 9.461 4 12c0 2.475.007 2.878.058 4.029c.037.783.142 1.31.331 1.797c.17.435.37.748.702 1.08c.337.336.65.537 1.08.703c.494.191 1.02.297 1.8.333C9.075 19.994 9.461 20 12 20c2.475 0 2.878-.007 4.029-.058c.782-.037 1.308-.142 1.797-.331a2.9 2.9 0 0 0 1.08-.703c.337-.336.538-.649.704-1.08c.19-.492.296-1.018.332-1.8c.052-1.103.058-1.49.058-4.028c0-2.474-.007-2.878-.058-4.029c-.037-.782-.143-1.31-.332-1.798a2.9 2.9 0 0 0-.703-1.08a2.9 2.9 0 0 0-1.08-.704c-.49-.19-1.016-.295-1.798-.331C14.926 4.006 14.54 4 12 4m0-2c2.717 0 3.056.01 4.123.06c1.064.05 1.79.217 2.427.465c.66.254 1.216.598 1.772 1.153a4.9 4.9 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428c.047 1.066.06 1.405.06 4.122s-.01 3.056-.06 4.122s-.218 1.79-.465 2.428a4.9 4.9 0 0 1-1.153 1.772a4.9 4.9 0 0 1-1.772 1.153c-.637.247-1.363.415-2.427.465c-1.067.047-1.406.06-4.123.06s-3.056-.01-4.123-.06c-1.064-.05-1.789-.218-2.427-.465a4.9 4.9 0 0 1-1.772-1.153a4.9 4.9 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.012 15.056 2 14.717 2 12s.01-3.056.06-4.122s.217-1.79.465-2.428a4.9 4.9 0 0 1 1.153-1.772A4.9 4.9 0 0 1 5.45 2.525c.637-.248 1.362-.415 2.427-.465C8.945 2.013 9.284 2 12.001 2"
                      />
                    </svg>
                  </div>
                );
              }
              if (platform === "referrals") {
                platform = (
                  <div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="2.5em"
                      height="2.5em"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fill="#fff"
                        d="M8 4.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0M11.5 6a5.5 5.5 0 0 0-1.578.23a2 2 0 1 1 3.155 0A5.5 5.5 0 0 0 11.5 6M3 8h4.257A5.48 5.48 0 0 0 6 11.5q0 .501.087.977q-.279.023-.587.023c-4 0-4-2.925-4-2.925V9.5A1.5 1.5 0 0 1 3 8m13 3.5a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m-4-2a.5.5 0 0 0-1 0V11H9.5a.5.5 0 0 0 0 1H11v1.5a.5.5 0 0 0 1 0V12h1.5a.5.5 0 0 0 0-1H12z"
                      />
                    </svg>
                  </div>
                );
              }
              if (platform === "referrals10") {
                platform = (
                  <div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="2.5em"
                      height="2.5em"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fill="#fff"
                        d="M8 4.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0M11.5 6a5.5 5.5 0 0 0-1.578.23a2 2 0 1 1 3.155 0A5.5 5.5 0 0 0 11.5 6M3 8h4.257A5.48 5.48 0 0 0 6 11.5q0 .501.087.977q-.279.023-.587.023c-4 0-4-2.925-4-2.925V9.5A1.5 1.5 0 0 1 3 8m13 3.5a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m-4-2a.5.5 0 0 0-1 0V11H9.5a.5.5 0 0 0 0 1H11v1.5a.5.5 0 0 0 1 0V12h1.5a.5.5 0 0 0 0-1H12z"
                      />
                    </svg>
                  </div>
                );
              }
              if (platform === "checktelegramAgain") {
                platform = (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="2.5em"
                    height="2.5em"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#FFF"
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19c-.14.75-.42 1-.68 1.03c-.58.05-1.02-.38-1.58-.75c-.88-.58-1.38-.94-2.23-1.5c-.99-.65-.35-1.01.22-1.59c.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02c-.09.02-1.49.95-4.22 2.79c-.4.27-.76.41-1.08.4c-.36-.01-1.04-.2-1.55-.37c-.63-.2-1.12-.31-1.08-.66c.02-.18.27-.36.74-.55c2.92-1.27 4.86-2.11 5.83-2.51c2.78-1.16 3.35-1.36 3.73-1.36c.08 0 .27.02.39.12c.1.08.13.19.14.27c-.01.06.01.24 0 .38"
                    ></path>
                  </svg>
                );
              }
              if (platform === "onchain") {
                platform = (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="2.5em"
                    height="2.5em"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="none"
                      stroke="#fff"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M18.1 6q-1.65 4.37-2.4 6c-1.879 4.088-3.713 6-6 6c-2.4 0-4.8-2.4-4.8-6s2.4-6 4.8-6c2.267 0 4.135 1.986 6 6q.768 1.653 2.4 6"
                    />
                  </svg>
                );
              }
              if (platform === "userMilestone") {
                platform = (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="2.5em"
                    height="2.5em"
                    viewBox="0 0 256 256"
                  >
                    <path
                      fill="#fff"
                      d="M244.8 150.4a8 8 0 0 1-11.2-1.6A51.6 51.6 0 0 0 192 128a8 8 0 0 1-7.37-4.89a8 8 0 0 1 0-6.22A8 8 0 0 1 192 112a24 24 0 1 0-23.24-30a8 8 0 1 1-15.5-4A40 40 0 1 1 219 117.51a67.94 67.94 0 0 1 27.43 21.68a8 8 0 0 1-1.63 11.21M190.92 212a8 8 0 1 1-13.84 8a57 57 0 0 0-98.16 0a8 8 0 1 1-13.84-8a72.06 72.06 0 0 1 33.74-29.92a48 48 0 1 1 58.36 0A72.06 72.06 0 0 1 190.92 212M128 176a32 32 0 1 0-32-32a32 32 0 0 0 32 32m-56-56a8 8 0 0 0-8-8a24 24 0 1 1 23.24-30a8 8 0 1 0 15.5-4A40 40 0 1 0 37 117.51a67.94 67.94 0 0 0-27.4 21.68a8 8 0 1 0 12.8 9.61A51.6 51.6 0 0 1 64 128a8 8 0 0 0 8-8"
                    />
                  </svg>
                );
              }
              if (platform === "connectwallet") {
                platform = (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="2.5em"
                    height="2.5em"
                    viewBox="0 0 24 24"
                  >
                    <g
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                      strokeWidth="0.5"
                      stroke="currentColor"
                    >
                      <path d="M21.1 8.004q-.085-.005-.181-.004h-2.525c-2.068 0-3.837 1.628-3.837 3.75s1.77 3.75 3.837 3.75h2.525q.096.001.182-.004a1.755 1.755 0 0 0 1.645-1.628c.004-.06.004-.125.004-.185V9.817c0-.06 0-.125-.004-.185a1.755 1.755 0 0 0-1.645-1.628m-2.928 4.746c.532 0 .963-.448.963-1s-.431-1-.963-1c-.533 0-.964.448-.964 1s.431 1 .964 1" />
                      <path d="M20.918 17a.22.22 0 0 1 .221.278c-.2.712-.519 1.32-1.03 1.83c-.749.75-1.698 1.081-2.87 1.239c-1.14.153-2.595.153-4.433.153h-2.112c-1.838 0-3.294 0-4.433-.153c-1.172-.158-2.121-.49-2.87-1.238c-.748-.749-1.08-1.698-1.238-2.87C2 15.099 2 13.644 2 11.806v-.112C2 9.856 2 8.4 2.153 7.26c.158-1.172.49-2.121 1.238-2.87c.749-.748 1.698-1.08 2.87-1.238C7.401 3 8.856 3 10.694 3h2.112c1.838 0 3.294 0 4.433.153c1.172.158 2.121.49 2.87 1.238c.511.512.83 1.119 1.03 1.831a.22.22 0 0 1-.221.278h-2.524c-2.837 0-5.337 2.24-5.337 5.25s2.5 5.25 5.337 5.25zM5.75 7a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5z" />
                    </g>
                  </svg>
                );
              }
              if (platform === "solvetoearnExplore") {
                platform = (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="2.5em"
                    height="2.5em"
                    viewBox="0 0 48 48"
                  >
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M24 39.173c-.14.751-1.539 4.272-4.424 4.325c-4.699.087-3.629-3.141-7.502-5.947s-3.597-4.847-3.939-7.148"
                      strokeWidth="1"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.602 31.892c-2.816-1.399-3.333-8.332-1.159-7.22c0 0-1.959-6.78 1.594-8.53"
                      strokeWidth="1"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.333 19.176s-3.282-5.802 1.42-8.724"
                      strokeWidth="1"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12.933 12.384c-.034-.244-1.432-5.291 3.937-6.107m-.312 1.069s2.3-6 7.443-.577M19.58 40.743c-.947.048-2.822.382-5.227-4.112m4.412-1.13a3.79 3.79 0 0 1 2.943 2.852m-8.297-6.232a5.23 5.23 0 0 1-2.42-4.578c.23-2.985-.85-4.2-.85-4.2m3.507-.967s1.663-.206 2.357 2.435a1.515 1.515 0 0 0 2.512.789m.728-2.408s1.888.3 2.367-1.05m-5.036-.522a6.55 6.55 0 0 0-.554-3.88c-.849-1.662.364-4.299.364-4.299m2.127-.972s-2.891-1.71.453-4.611m1.039 2.464c.507 2.57 1.238 5.281-.327 9.275m-5.842 14.801c.187 0 4.582.127 2.978-3.53s-2.851-3.043-3.216-6.683"
                      strokeWidth="1"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.028 30.72s-1.371 1.956-4.656-.777M24 39.173c.14.751 1.539 4.272 4.424 4.325c4.699.087 3.629-3.141 7.502-5.947s3.597-4.847 3.939-7.148"
                      strokeWidth="1"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M38.398 31.892c2.816-1.399 3.333-8.332 1.159-7.22c0 0 1.959-6.78-1.594-8.53"
                      strokeWidth="1"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M36.667 19.176s3.282-5.802-1.42-8.724"
                      strokeWidth="1"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M35.067 12.384c.034-.244 1.433-5.291-3.937-6.107m.313 1.069s-2.302-6-7.444-.577m4.421 33.974c.947.048 2.822.382 5.227-4.112m-4.412-1.13a3.79 3.79 0 0 0-2.943 2.852m8.297-6.232a5.23 5.23 0 0 0 2.42-4.578c-.23-2.985.85-4.2.85-4.2m-3.507-.967s-1.663-.206-2.357 2.435a1.515 1.515 0 0 1-2.512.789m-.728-2.408s-1.888.3-2.367-1.05m5.036-.522a6.55 6.55 0 0 1 .554-3.88c.849-1.662-.364-4.299-.364-4.299m-2.127-.972s2.891-1.71-.453-4.611m-1.039 2.464c-.507 2.57-1.238 5.281.327 9.275m5.842 14.801c-.187 0-4.582.127-2.978-3.53s2.852-3.043 3.216-6.683"
                      strokeWidth="1"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M26.972 30.72s1.371 1.956 4.656-.777"
                      strokeWidth="1"
                    />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      d="M24 39.173V6.77"
                      strokeWidth="1"
                    />
                  </svg>
                );
              }

              return {
                id: doc.id,
                quant: doc.data().quant,
                date: doc.data().Date,
                platform,
                title: "Task reward",
              };
            })
          : [];
        setTaskhistoryList(tasks);
        //Claim Day History
        const rewardsHistory = !snapshotRewards.empty
          ? snapshotRewards.docs.map((doc) => {
              let platform = doc.data().platform;
              if (platform === "dailycheck-in-reward") {
                platform = (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="2.5em"
                    height="2.5em"
                    viewBox="0 0 16 16"
                  >
                    <path
                      fill="#fff"
                      fillRule="evenodd"
                      d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16m3.65-10.857L6.91 9.8L4.35 7.286a.5.5 0 0 0-.7.714l2.909 2.857a.5.5 0 0 0 .7 0l5.091-5a.5.5 0 1 0-.7-.714"
                    />
                  </svg>
                );
              } else {
                platform = "telegram";
              }
              return {
                id: doc.id,
                quant: doc.data().quant,
                date: doc.data().Date,
                platform,
                title: "Daily check-in",
              };
            })
          : [];
        setTaskhistoryList((prevList) => [...prevList, ...rewardsHistory]);
        const combinedList = [...tasks, ...rewardsHistory];
        const convertDate = (dateStr: string) => {
          const [day, month, year] = dateStr.split("/");
          const formattedDate = `${year}-${month}-${day}`;
          return formattedDate;
        };
        // Tarihe göre sırala
        const sortedList = combinedList.sort(
          (a, b) =>
            new Date(convertDate(b.date)).getTime() -
            new Date(convertDate(a.date)).getTime()
        );

        // State'i güncelle
        setTaskhistoryList(sortedList);
      } catch (error) {
        console.error(error);
      }
    };

    fetchTasks();
  }, [router, telegramId]);
  const convertToDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split("/");
    return new Date(`${year}-${month}-${day}`);
  };
  const addNewTask = (newTask: TaskHistory) => {
    setTaskhistoryList((prevList) => {
      const updatedList = [newTask, ...prevList];
      // Yeni eleman eklendikten sonra sırala
      return updatedList.sort(
        (a, b) =>
          convertToDate(a.date).getTime() - convertToDate(b.date).getTime()
      );
    });
  };
  {
    /*interface Itransaction {
    messages: [
      {
        address: string;
        amount: string;
      }
    ];
    validUntil: number;
  }*/
  }
  {
    /*
    const send = () => async () => {
    try {
      if (!tonConnectUI.connected) {
        await handleWalletAction();
      }
      const tx:Itransaction = {
        messages: [
          {
            address: "UQBUSXMd54HOJlmmh4TsuMvIcwB91kkIlz6HTgj62dN43S3U",
            amount: toNano(0.1).toString(),
          },
        ],
        validUntil: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 1 Day
      };
      const { boc } = await tonConnectUI.sendTransaction(tx);
      console.error(boc);
    } catch (e) {
      console.error("Error", e);
    }
  };
  };*/
  }
  /*const handleJoinTask = () => {
    openTelegramGroup();
  };
  const openTelegramGroup = () => {
    let newLink = task?.url;
    if (
      !task?.url?.startsWith("http://") &&
      !task?.url?.startsWith("https://")
    ) {
      newLink = "https://" + task?.url;
    }
    if (typeof window !== "undefined") {
      const tg = window?.Telegram?.WebApp;
      if (!tg) return;
      tg.openTelegramLink(newLink);
    }
  };*/
  useEffect(() => {
    if (rank == "OG") {
      setRankIcon(
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1.2em"
          height="1.2em"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="2.197" fill="currentColor" />
          <path
            fill="currentColor"
            d="M21.63441 6.43671c-.70909-1.22723-2.41155-1.73142-4.79628-1.42354c-.30258.03942-.61354.09379-.92927.15769C15.00856 2.619 13.6066 1 12 1C10.39089 1 8.98713 2.62441 8.087 5.1834c-2.7384-.54268-4.90657-.15669-5.72186 1.25331C1.55256 7.84376 2.2947 9.90626 4.12193 12C2.2947 14.09374 1.55256 16.15624 2.3651 17.56329c.58143 1.00732 1.85 1.49542 3.52453 1.49542a11.47535 11.47535 0 0 0 2.197-.24305C8.98673 21.37518 10.39069 23 12 23c1.60658 0 3.00854-1.619 3.90884-4.17086c.31573.0639.62669.11827.92927.15769a10.18235 10.18235 0 0 0 1.297.088c1.70461 0 2.92647-.52028 3.49932-1.51151c.81254-1.407.07053-3.46955-1.75643-5.56329C21.70494 9.90626 22.447 7.84376 21.63441 6.43671ZM16.9851 6.13956a9.0809 9.0809 0 0 1 1.15965-.08046c1.26048 0 2.14979.32826 2.507.94617c.50426.87335-.06645 2.44138-1.55187 4.16777a20.50554 20.50554 0 0 0-2.30139-1.95281a19.9752 19.9752 0 0 0-.5471-2.93612C16.49539 6.23744 16.7503 6.17013 16.9851 6.13956Zm-3.07236 9.17417c-.64647.37332-1.28408.70346-1.90695.9935c-.63936-.29755-1.2812-.62534-1.919-.9935c-.64888-.37459-1.25525-.76326-1.81959-1.15917c-.06229-.6861-.09688-1.405-.09688-2.15456s.03459-1.46846.09688-2.15456c.56434-.39591 1.17071-.78458 1.81959-1.15917c.63487-.36648 1.27383-.69333 1.91024-.98982c.62668.29132 1.26511.61409 1.91573.98982c.64908.37472 1.25572.76346 1.82019 1.15958c.06222.686.09682 1.40477.09682 2.15415s-.0346 1.46813-.09682 2.15415C15.16846 14.55027 14.56182 14.939 13.91274 15.31373Zm1.628.3351a17.87565 17.87565 0 0 1-.39136 1.82408a18.46424 18.46424 0 0 1-1.76012-.58257c.36293-.18713.72713-.38337 1.092-.594C14.8457 16.086 15.1977 15.86928 15.54078 15.64883Zm-4.92407 1.24372A18.41329 18.41329 0 0 1 8.851 17.474a17.86018 17.86018 0 0 1-.39176-1.82549c.34328.22058.69541.43734 1.06.64787C9.88355 16.50677 10.24989 16.70348 10.61671 16.89255ZM7.07428 13.25036A18.3863 18.3863 0 0 1 5.67548 12a18.38878 18.38878 0 0 1 1.3988-1.25043c-.02005.41033-.03252.82636-.03252 1.25043S7.05423 12.8401 7.07428 13.25036Zm1.385-4.89886a17.86727 17.86727 0 0 1 .391-1.82227a18.22228 18.22228 0 0 1 1.76937.57681c-.36775.18947-.735.38659-1.10031.59759C9.15468 7.91416 8.80255 8.13092 8.45927 8.3515Zm4.93057-1.242a18.48842 18.48842 0 0 1 1.75958-.58237a17.87565 17.87565 0 0 1 .39136 1.82408c-.34308-.22045-.69508-.43715-1.05948-.64754C14.11663 7.4931 13.75263 7.29652 13.38984 7.10946ZM16.92577 10.75A18.40125 18.40125 0 0 1 18.324 12a18.38809 18.38809 0 0 1-1.39826 1.25c.02-.41013.03251-.826.03251-1.25S16.94581 11.1601 16.92577 10.75ZM12 2.12854c.99773 0 2.05613 1.23433 2.80746 3.31044a20.80159 20.80159 0 0 0-2.8094 1.01141A20.51935 20.51935 0 0 0 9.19055 5.44481C9.94208 3.36508 11.00163 2.12854 12 2.12854ZM3.34774 7.00527c.35133-.60825 1.2519-.93437 2.52043-.93437a10.26212 10.26212 0 0 1 1.88362.20148A19.96778 19.96778 0 0 0 7.20147 9.2205a20.48874 20.48874 0 0 0-2.30166 1.95288C3.41412 9.44692 2.84341 7.87869 3.34774 7.00527Zm0 9.98946c-.50433-.87342.06638-2.44165 1.55207-4.16811A20.50145 20.50145 0 0 0 7.20147 14.7795a19.94422 19.94422 0 0 0 .5518 2.95356C5.50578 18.162 3.85468 17.87245 3.34774 16.99473ZM12 21.87146c-.99866 0-2.05847-1.23708-2.81007-3.31775a20.44828 20.44828 0 0 0 2.81155-1.00255a20.80209 20.80209 0 0 0 2.806 1.00979C14.05615 20.63706 12.99775 21.87146 12 21.87146Zm8.65175-4.87673c-.45914.79277-1.79257 1.10923-3.66667.86571c-.2348-.03057-.48971-.09788-.73369-.14455a19.97619 19.97619 0 0 0 .5471-2.93619A20.50419 20.50419 0 0 0 19.0999 12.827C20.58532 14.55335 21.156 16.12138 20.65177 16.99473Z"
          />
          <circle cx="-.5" cy="2" r="1.5" fill="currentColor">
            <animateMotion
              dur="2.6s"
              path="M14.75 14.1471C12.2277 15.6034 9.69019 16.4332 7.6407 16.6145C5.54599 16.7998 4.15833 16.3018 3.62324 15.375C3.08815 14.4482 3.35067 12.9974 4.55852 11.276C5.74031 9.59178 7.72768 7.80915 10.25 6.35289C12.7723 4.89662 15.3098 4.06682 17.3593 3.88549C19.454 3.70016 20.8417 4.1982 21.3768 5.125C21.9118 6.0518 21.6493 7.50256 20.4415 9.22397C19.2597 10.9082 17.2723 12.6909 14.75 14.1471Z"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      );
    } else if (rank == "LEGEND") {
      setRankIcon(
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1.2em"
          height="1.2em"
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M12 1.25c-1.828 0-3.339.161-4.502.357l-.134.023c-1.01.169-1.85.31-2.507 1.118c-.42.519-.557 1.08-.588 1.705l-.492.164c-.463.154-.87.29-1.191.44c-.348.162-.667.37-.911.709s-.341.707-.385 1.088c-.04.353-.04.78-.04 1.269v.145c0 .402 0 .757.03 1.054c.032.321.103.634.28.936c.179.303.417.517.683.701c.245.17.555.343.907.538l2.64 1.467c.54 1.061 1.281 2.007 2.3 2.69c.887.596 1.952.97 3.213 1.069a.8.8 0 0 0-.053.277v1.75H9.82a1.75 1.75 0 0 0-1.716 1.407l-.219 1.093H6a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5h-1.885l-.219-1.093a1.75 1.75 0 0 0-1.716-1.407h-1.43V17a.8.8 0 0 0-.053-.277c1.261-.1 2.326-.473 3.213-1.068c1.02-.684 1.76-1.63 2.3-2.691l2.64-1.467c.352-.195.662-.368.907-.538c.265-.184.504-.398.682-.7c.178-.303.25-.616.281-.937c.03-.297.03-.652.03-1.054v-.145c0-.488 0-.916-.04-1.269c-.044-.381-.14-.75-.385-1.088c-.244-.339-.563-.547-.91-.71c-.323-.15-.729-.285-1.192-.439l-.492-.164c-.03-.626-.167-1.186-.588-1.705c-.656-.809-1.496-.95-2.506-1.118l-.135-.023A27 27 0 0 0 12 1.25m2.585 20l-.16-.799a.25.25 0 0 0-.245-.201H9.82a.25.25 0 0 0-.245.201l-.16.799zM4.288 6.028l.014-.005c.072 1.52.243 3.2.671 4.77l-1.066-.591c-.389-.217-.633-.353-.809-.475c-.162-.113-.215-.18-.244-.23c-.03-.05-.062-.128-.082-.324a11 11 0 0 1-.022-.938v-.073c0-.539.001-.88.03-1.138c.028-.238.072-.327.112-.381c.039-.055.109-.125.326-.226c.236-.11.56-.219 1.07-.39m15.41-.005c-.071 1.52-.243 3.2-.67 4.77l1.065-.591c.389-.217.633-.353.809-.475c.162-.113.215-.18.244-.23c.03-.05.062-.128.082-.324c.021-.214.022-.493.022-.938v-.073c0-.539-.001-.88-.03-1.138c-.028-.238-.072-.327-.112-.381c-.039-.055-.109-.125-.326-.226c-.236-.11-.56-.219-1.07-.39zM7.748 3.086A25.6 25.6 0 0 1 12 2.75c1.74 0 3.167.153 4.252.336c1.207.204 1.46.28 1.727.608c.262.322.287.628.233 1.983c-.09 2.258-.388 4.696-1.31 6.55c-.456.914-1.052 1.662-1.827 2.182c-.771.517-1.766.841-3.075.841s-2.303-.324-3.074-.841c-.776-.52-1.372-1.268-1.827-2.183c-.923-1.853-1.22-4.29-1.31-6.55c-.054-1.354-.03-1.66.233-1.982c.266-.328.519-.404 1.726-.608"
            clipRule="evenodd"
          />
        </svg>
      );
    } else if (rank == "STAR") {
      setRankIcon(
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1.2em"
          height="1.2em"
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            d="m8.85 16.825l3.15-1.9l3.15 1.925l-.825-3.6l2.775-2.4l-3.65-.325l-1.45-3.4l-1.45 3.375l-3.65.325l2.775 2.425zm3.15.45l-4.15 2.5q-.275.175-.575.15t-.525-.2t-.35-.437t-.05-.588l1.1-4.725L3.775 10.8q-.25-.225-.312-.513t.037-.562t.3-.45t.55-.225l4.85-.425l1.875-4.45q.125-.3.388-.45t.537-.15t.537.15t.388.45l1.875 4.45l4.85.425q.35.05.55.225t.3.45t.038.563t-.313.512l-3.675 3.175l1.1 4.725q.075.325-.05.588t-.35.437t-.525.2t-.575-.15zm0-5.025"
          />
        </svg>
      ); // setRankTxt içerisine düzenleyebilirsin
    } else {
      setRankIcon("");
    }
  }, [rank]);
  useEffect(() => {
    const checkButton = async () => {
      try {
        if (!telegramId) return;
        const solveToEarnValue = doc(
          dbfs,
          "user",
          telegramId,
          "miningData",
          "values"
        );
        const snapshotSolveToEarn = await getDoc(solveToEarnValue);
        if (snapshotSolveToEarn.exists()) {
          const remainingSolveToEarn =
            snapshotSolveToEarn.data()?.remainingSolveToEarn;
          if (remainingSolveToEarn != null) {
            setRemainingSolveToEarn(remainingSolveToEarn);
            sessionStorage.setItem(
              "remainingSolveToEarn",
              remainingSolveToEarn
            );
          }
        }
        //dailycheckin
        const checkTimeRef = doc(
          dbfs,
          "user",
          telegramId,
          "miningData",
          "checkTime"
        );
        const snapshot = await getDoc(checkTimeRef);
        if (snapshot.exists()) {
          const checktime = snapshot.data().checktime;
          if (checktime) {
            const formattedDate = new Intl.DateTimeFormat("en-US", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date());
            const [month, day, year] = formattedDate.split("/");
            const formattedDateISO = `${year}-${month}-${day}`;
            const diffInMs = Math.abs(
              new Date(formattedDateISO).getTime() -
                new Date(checktime).getTime()
            );
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
            if (diffInDays > 2) {
              setDoc(
                checkTimeRef,
                {
                  daily: 1,
                },
                { merge: true }
              );
              setDaily(1);
              localStorage.setItem("daily", "1");
              setIsclaimDay(false);
            } else if (diffInDays >= 1 && diffInDays < 2) {
              setIsclaimDay(false);
            } else {
              setIsclaimDay(true);
            }
          } else {
            setDaily(1);
            setIsclaimDay(false);
          }
        } else {
          //console.error("Snapshot yok");
          setDoc(checkTimeRef, {
            daily: 1,
          });
          setDaily(1);
          setIsclaimDay(false);
          localStorage.setItem("daily", "1");
        }
      } catch (error) {
        console.error(error);
      }
    };
    checkButton();
  }, [setDaily, setRemainingSolveToEarn, telegramId]);
  const toastQueue: string[] = [];
  async function ClaimDaily() {
    const claim = async () => {
      try {
        setLoadingDay(true);
        const date = new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate()
          )
        );
        const formattedDate =
          `${date.getUTCDate().toString().padStart(2, "0")}/` +
          `${(date.getUTCMonth() + 1).toString().padStart(2, "0")}/` +
          `${date.getUTCFullYear()}`;
        if (!telegramId) return;
        const solveToEarnValue = doc(
          dbfs,
          "user",
          telegramId,
          "miningData",
          "values"
        );
        const snapshotSolveToEarn = await getDoc(solveToEarnValue);
        if (snapshotSolveToEarn.exists()) {
          const remainingSolveToEarn =
            snapshotSolveToEarn.data()?.remainingSolveToEarn;
          const lastSolveToEarnDt =
            snapshotSolveToEarn.data().lastSolveToEarnDate;
          if (remainingSolveToEarn != null) {
            const [day, month, year] = formattedDate.split("/");
            const formattedDateISO = `${year}-${month}-${day}`;
            const [daySTE, monthSTE, yearSTE] = lastSolveToEarnDt.split("/");
            const solveToEarnDateConvert: string = `${yearSTE}-${monthSTE}-${daySTE}`;
            const diffInMs = Math.abs(
              new Date(formattedDateISO).getTime() -
                new Date(solveToEarnDateConvert).getTime()
            );
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
            setRemainingSolveToEarn(remainingSolveToEarn);
            sessionStorage.setItem(
              "remainingSolveToEarn",
              remainingSolveToEarn
            );
            if (diffInDays >= 1) {
              const updatedSolveToEarn = remainingSolveToEarn + 7;
              updateDoc(solveToEarnValue, {
                remainingSolveToEarn: updatedSolveToEarn,
                lastSolveToEarnDate: formattedDate,
              });
              setRemainingSolveToEarn(updatedSolveToEarn);
              sessionStorage.setItem(
                "remainingSolveToEarn",
                updatedSolveToEarn
              );
              toast.success("+7 passes has been added", {
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1.5em"
                    height="1.5em"
                    viewBox="0 0 32 32"
                  >
                    <g fill="none">
                      <g filter="url(#f796id2)">
                        <path
                          fill="url(#f796id1)"
                          fillRule="evenodd"
                          d="M19.064 17.393a7.952 7.952 0 0 0 8.611-12.99a7.95 7.95 0 0 0-12.98 8.638l-3.447 3.448a1.37 1.37 0 0 0-.402.948l-.018 1.032a1.23 1.23 0 0 1-1.11 1.204l-.536.052a1.16 1.16 0 0 0-1.042 1.029l-.058.532a1.276 1.276 0 0 1-1.317 1.136l-.8-.03a1.37 1.37 0 0 0-1.022.401l-1.859 1.859a3.084 3.084 0 0 0 4.361 4.36zm7.16-9.018a1.783 1.783 0 1 1-2.52-2.522a1.783 1.783 0 0 1 2.52 2.522"
                          clipRule="evenodd"
                        />
                      </g>
                      <path
                        fill="url(#f796id0)"
                        fillRule="evenodd"
                        d="M19.064 17.393a7.952 7.952 0 0 0 8.611-12.99a7.95 7.95 0 0 0-12.98 8.638l-3.447 3.448a1.37 1.37 0 0 0-.402.948l-.018 1.032a1.23 1.23 0 0 1-1.11 1.204l-.536.052a1.16 1.16 0 0 0-1.042 1.029l-.058.532a1.276 1.276 0 0 1-1.317 1.136l-.8-.03a1.37 1.37 0 0 0-1.022.401l-1.859 1.859a3.084 3.084 0 0 0 4.361 4.36zm7.16-9.018a1.783 1.783 0 1 1-2.52-2.522a1.783 1.783 0 0 1 2.52 2.522"
                        clipRule="evenodd"
                      />
                      <defs>
                        <radialGradient
                          id="f796id0"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(-16.24995 15.50005 -7.89314 -8.27501 19.328 13.719)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop
                            offset=".935"
                            stopColor="#f18849"
                            stopOpacity="0"
                          />
                          <stop offset="1" stopColor="#cc6946" />
                        </radialGradient>
                        <linearGradient
                          id="f796id1"
                          x1="17.864"
                          x2="17.493"
                          y1="7.457"
                          y2="29.939"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffdc46" />
                          <stop offset="1" stopColor="#f38e4a" />
                        </linearGradient>
                        <filter
                          id="f796id2"
                          width="28.573"
                          height="28.392"
                          x="1.781"
                          y="1.924"
                          colorInterpolationFilters="sRGB"
                          filterUnits="userSpaceOnUse"
                        >
                          <feFlood
                            flood-opacity="0"
                            result="BackgroundImageFix"
                          />
                          <feBlend
                            in="SourceGraphic"
                            in2="BackgroundImageFix"
                            result="shape"
                          />
                          <feColorMatrix
                            in="SourceAlpha"
                            result="hardAlpha"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                          />
                          <feOffset dx=".35" dy="-.1" />
                          <feGaussianBlur stdDeviation=".3" />
                          <feComposite
                            in2="hardAlpha"
                            k2="-1"
                            k3="1"
                            operator="arithmetic"
                          />
                          <feColorMatrix values="0 0 0 0 0.803922 0 0 0 0 0.623529 0 0 0 0 0.294118 0 0 0 1 0" />
                          <feBlend
                            in2="shape"
                            result="effect1_innerShadow_18_23714"
                          />
                          <feColorMatrix
                            in="SourceAlpha"
                            result="hardAlpha"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                          />
                          <feOffset dy="-.15" />
                          <feGaussianBlur stdDeviation=".3" />
                          <feComposite
                            in2="hardAlpha"
                            k2="-1"
                            k3="1"
                            operator="arithmetic"
                          />
                          <feColorMatrix values="0 0 0 0 0.796078 0 0 0 0 0.505882 0 0 0 0 0.411765 0 0 0 1 0" />
                          <feBlend
                            in2="effect1_innerShadow_18_23714"
                            result="effect2_innerShadow_18_23714"
                          />
                          <feColorMatrix
                            in="SourceAlpha"
                            result="hardAlpha"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                          />
                          <feOffset dx="-.4" dy=".4" />
                          <feGaussianBlur stdDeviation=".2" />
                          <feComposite
                            in2="hardAlpha"
                            k2="-1"
                            k3="1"
                            operator="arithmetic"
                          />
                          <feColorMatrix values="0 0 0 0 0.996078 0 0 0 0 0.996078 0 0 0 0 0.423529 0 0 0 1 0" />
                          <feBlend
                            in2="effect2_innerShadow_18_23714"
                            result="effect3_innerShadow_18_23714"
                          />
                        </filter>
                      </defs>
                    </g>
                  </svg>
                ),
              });
            }
          } else {
            setDoc(
              solveToEarnValue,
              {
                remainingSolveToEarn: 7,
                lastSolveToEarnDate: formattedDate,
              },
              { merge: true }
            );
            setRemainingSolveToEarn(7);
            sessionStorage.setItem("remainingSolveToEarn", "7");
            toast.success("+7 passes has been added", {
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.5em"
                  height="1.5em"
                  viewBox="0 0 32 32"
                >
                  <g fill="none">
                    <g filter="url(#f796id2)">
                      <path
                        fill="url(#f796id1)"
                        fillRule="evenodd"
                        d="M19.064 17.393a7.952 7.952 0 0 0 8.611-12.99a7.95 7.95 0 0 0-12.98 8.638l-3.447 3.448a1.37 1.37 0 0 0-.402.948l-.018 1.032a1.23 1.23 0 0 1-1.11 1.204l-.536.052a1.16 1.16 0 0 0-1.042 1.029l-.058.532a1.276 1.276 0 0 1-1.317 1.136l-.8-.03a1.37 1.37 0 0 0-1.022.401l-1.859 1.859a3.084 3.084 0 0 0 4.361 4.36zm7.16-9.018a1.783 1.783 0 1 1-2.52-2.522a1.783 1.783 0 0 1 2.52 2.522"
                        clipRule="evenodd"
                      />
                    </g>
                    <path
                      fill="url(#f796id0)"
                      fillRule="evenodd"
                      d="M19.064 17.393a7.952 7.952 0 0 0 8.611-12.99a7.95 7.95 0 0 0-12.98 8.638l-3.447 3.448a1.37 1.37 0 0 0-.402.948l-.018 1.032a1.23 1.23 0 0 1-1.11 1.204l-.536.052a1.16 1.16 0 0 0-1.042 1.029l-.058.532a1.276 1.276 0 0 1-1.317 1.136l-.8-.03a1.37 1.37 0 0 0-1.022.401l-1.859 1.859a3.084 3.084 0 0 0 4.361 4.36zm7.16-9.018a1.783 1.783 0 1 1-2.52-2.522a1.783 1.783 0 0 1 2.52 2.522"
                      clipRule="evenodd"
                    />
                    <defs>
                      <radialGradient
                        id="f796id0"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="matrix(-16.24995 15.50005 -7.89314 -8.27501 19.328 13.719)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop
                          offset=".935"
                          stopColor="#f18849"
                          stopOpacity="0"
                        />
                        <stop offset="1" stopColor="#cc6946" />
                      </radialGradient>
                      <linearGradient
                        id="f796id1"
                        x1="17.864"
                        x2="17.493"
                        y1="7.457"
                        y2="29.939"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#ffdc46" />
                        <stop offset="1" stopColor="#f38e4a" />
                      </linearGradient>
                      <filter
                        id="f796id2"
                        width="28.573"
                        height="28.392"
                        x="1.781"
                        y="1.924"
                        colorInterpolationFilters="sRGB"
                        filterUnits="userSpaceOnUse"
                      >
                        <feFlood
                          flood-opacity="0"
                          result="BackgroundImageFix"
                        />
                        <feBlend
                          in="SourceGraphic"
                          in2="BackgroundImageFix"
                          result="shape"
                        />
                        <feColorMatrix
                          in="SourceAlpha"
                          result="hardAlpha"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        />
                        <feOffset dx=".35" dy="-.1" />
                        <feGaussianBlur stdDeviation=".3" />
                        <feComposite
                          in2="hardAlpha"
                          k2="-1"
                          k3="1"
                          operator="arithmetic"
                        />
                        <feColorMatrix values="0 0 0 0 0.803922 0 0 0 0 0.623529 0 0 0 0 0.294118 0 0 0 1 0" />
                        <feBlend
                          in2="shape"
                          result="effect1_innerShadow_18_23714"
                        />
                        <feColorMatrix
                          in="SourceAlpha"
                          result="hardAlpha"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        />
                        <feOffset dy="-.15" />
                        <feGaussianBlur stdDeviation=".3" />
                        <feComposite
                          in2="hardAlpha"
                          k2="-1"
                          k3="1"
                          operator="arithmetic"
                        />
                        <feColorMatrix values="0 0 0 0 0.796078 0 0 0 0 0.505882 0 0 0 0 0.411765 0 0 0 1 0" />
                        <feBlend
                          in2="effect1_innerShadow_18_23714"
                          result="effect2_innerShadow_18_23714"
                        />
                        <feColorMatrix
                          in="SourceAlpha"
                          result="hardAlpha"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        />
                        <feOffset dx="-.4" dy=".4" />
                        <feGaussianBlur stdDeviation=".2" />
                        <feComposite
                          in2="hardAlpha"
                          k2="-1"
                          k3="1"
                          operator="arithmetic"
                        />
                        <feColorMatrix values="0 0 0 0 0.996078 0 0 0 0 0.996078 0 0 0 0 0.423529 0 0 0 1 0" />
                        <feBlend
                          in2="effect2_innerShadow_18_23714"
                          result="effect3_innerShadow_18_23714"
                        />
                      </filter>
                    </defs>
                  </g>
                </svg>
              ),
              duration: 2000,
            });
          }
        }
        //dailycheckin
        const checkTimeRef = doc(
          dbfs,
          "user",
          telegramId,
          "miningData",
          "checkTime"
        );
        const snapshot = await getDoc(checkTimeRef);
        if (snapshot.exists()) {
          const checktime = snapshot.data().checktime;
          const dailyDay = snapshot.data().daily;
          const valueRef = doc(
            dbfs,
            "user",
            telegramId,
            "miningData",
            "values"
          );
          const rewardsHistory = doc(
            dbfs,
            "user",
            telegramId,
            "rewardsHistory",
            Date.now().toString()
          );
          const snapshotValue = await getDoc(valueRef);
          let quant;
          if (snapshotValue.exists()) {
            quant = snapshotValue.data().QuantAmount;
          }
          if (!checktime) {
            const formattedD = new Intl.DateTimeFormat("tr-TR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date());
            const [day, month, year] = formattedD.split(".");
            const formattedDate = `${month}/${day}/${year}`;
            const formattedslash = `${day}/${month}/${year}`;
            setDoc(
              checkTimeRef,
              {
                checktime: formattedDate,
                daily: 1,
              },
              { merge: true }
            );
            setDaily(1);
            setTimeout(() => {
              addToQueue(`You've got +${50} QNTM`);
            }, 3000);
            const rewardDay: number = quant + 50;
            const formattedAmount = rewardDay.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            updateDoc(valueRef, {
              QuantAmount: rewardDay,
            });
            SetMainQuantAmount(formattedAmount);
            setDoc(rewardsHistory, {
              quant: 50,
              platform: "dailycheck-in-reward",
              Date: formattedslash,
            });
            const list: TaskHistory = {
              id: Date.now().toString(),
              quant: 50,
              date: formattedslash,
              platform: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="2.5em"
                  height="2.5em"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill="#fff"
                    fillRule="evenodd"
                    d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16m3.65-10.857L6.91 9.8L4.35 7.286a.5.5 0 0 0-.7.714l2.909 2.857a.5.5 0 0 0 .7 0l5.091-5a.5.5 0 1 0-.7-.714"
                  />
                </svg>
              ),
              title: "Daily check-in",
            };

            addNewTask(list);
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", `${rewardDay}`);
            }
            if (typeof window !== "undefined") {
              localStorage.setItem("daily", "1");
            }
          } else {
            try {
              const formattedD = new Intl.DateTimeFormat("tr-TR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date());
              const [day, month, year] = formattedD.split(".");
              const formattedDateISO = `${year}-${month}-${day}`;
              const formattedDate = `${month}/${day}/${year}`;
              const formattedslash = `${day}/${month}/${year}`;
              const diffInMs = Math.abs(
                new Date(formattedDateISO).getTime() -
                  new Date(checktime).getTime()
              ); // use get time for accurate calc//
              const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
              const quantReward = dailyDay <= 7 ? (daily - 1) * 100 + 50 : 650;
              const rewardDay = quant + quantReward;
              if (diffInDays >= 1 && diffInDays < 2) {
                setDoc(
                  checkTimeRef,
                  {
                    checktime: formattedDate,
                    daily: dailyDay + 1,
                  },
                  { merge: true }
                );
                updateDoc(valueRef, {
                  QuantAmount: rewardDay,
                });
                setDoc(rewardsHistory, {
                  quant: quantReward,
                  platform: "dailycheck-in-reward",
                  Date: formattedslash,
                });
                const list: TaskHistory = {
                  id: Date.now().toString(),
                  quant: quantReward,
                  date: formattedslash,
                  platform: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="2.5em"
                      height="2.5em"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fill="#fff"
                        fillRule="evenodd"
                        d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16m3.65-10.857L6.91 9.8L4.35 7.286a.5.5 0 0 0-.7.714l2.909 2.857a.5.5 0 0 0 .7 0l5.091-5a.5.5 0 1 0-.7-.714"
                      />
                    </svg>
                  ),
                  title: "Daily check-in",
                };

                addNewTask(list);
                const formattedAmount = rewardDay.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                });

                SetMainQuantAmount(formattedAmount);
                if (typeof window !== "undefined") {
                  localStorage.setItem("QAmount", rewardDay);
                }
                setDaily(dailyDay + 1);
                setTimeout(() => {
                  addToQueue(`You've got +${quantReward} QNTM`);
                }, 3000);
                if (typeof window !== "undefined") {
                  localStorage.setItem("daily", dailyDay + 1);
                }
                console.error("Claimed");
              } else if (diffInDays >= 2) {
                const rewardDay = quant + 50;
                setDoc(
                  checkTimeRef,
                  {
                    checktime: formattedDate,
                    daily: 1,
                  },
                  { merge: true }
                );
                updateDoc(valueRef, {
                  QuantAmount: rewardDay,
                });
                const formattedAmount = rewardDay.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                });
                setDoc(rewardsHistory, {
                  quant: 50,
                  platform: "dailycheck-in-reward",
                  Date: formattedslash,
                });
                const list: TaskHistory = {
                  id: Date.now().toString(),
                  quant: 50,
                  date: formattedslash,
                  platform: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="2.5em"
                      height="2.5em"
                      viewBox="0 0 16 16"
                    >
                      <path
                        fill="#fff"
                        fillRule="evenodd"
                        d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16m3.65-10.857L6.91 9.8L4.35 7.286a.5.5 0 0 0-.7.714l2.909 2.857a.5.5 0 0 0 .7 0l5.091-5a.5.5 0 1 0-.7-.714"
                      />
                    </svg>
                  ),
                  title: "Daily check-in",
                };

                addNewTask(list);
                SetMainQuantAmount(formattedAmount);
                if (typeof window !== "undefined") {
                  localStorage.setItem("QAmount", rewardDay);
                }
                setDaily(1);
                if (typeof window !== "undefined") {
                  localStorage.setItem("daily", "1");
                }
                setTimeout(() => {
                  addToQueue(`You've got +${50} QNTM`);
                }, 3000);
                console.error("Claimed");
              } else {
                setIsclaimDay(true);
              }
            } catch (error) {
              console.error(error);
            }
          }
        } else {
          const formattedDate = new Intl.DateTimeFormat("tr-TR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date());
          const [day, month, year] = formattedDate.split(".");
          const formattedslash = `${day}/${month}/${year}`;
          setDoc(
            checkTimeRef,
            {
              checktime: formattedDate,
              daily: 2,
            },
            { merge: true }
          );
          const valueRef = doc(
            dbfs,
            "user",
            telegramId,
            "miningData",
            "values"
          );
          const snapshotValue = await getDoc(valueRef);
          let quant;
          if (snapshotValue.exists()) {
            quant = snapshotValue.data().QuantAmount;
          }
          const rewardDay = quant + 50;
          const formattedAmount = rewardDay.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });
          updateDoc(valueRef, {
            QuantAmount: rewardDay,
          });
          const rewardsHistory = doc(
            dbfs,
            "user",
            telegramId,
            "rewardsHistory",
            Date.now().toString()
          );

          setDoc(rewardsHistory, {
            quant: 50,
            platform: "dailycheck-in-reward",
            Date: formattedslash,
          });
          const list = {
            id: Date.now().toString(),
            quant: 50,
            date: formattedslash,
            platform: (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="2.5em"
                height="2.5em"
                viewBox="0 0 16 16"
              >
                <path
                  fill="#fff"
                  fillRule="evenodd"
                  d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16m3.65-10.857L6.91 9.8L4.35 7.286a.5.5 0 0 0-.7.714l2.909 2.857a.5.5 0 0 0 .7 0l5.091-5a.5.5 0 1 0-.7-.714"
                />
              </svg>
            ),
            title: "Daily check-in",
          };

          addNewTask(list);
          SetMainQuantAmount(formattedAmount);
          if (typeof window !== "undefined") {
            localStorage.setItem("QAmount", formattedAmount);
          }
          setDaily(1);
          if (typeof window !== "undefined") {
            localStorage.setItem("daily", "1");
          }
          setTimeout(() => {
            addToQueue(`You've got +${50} QNTM`);
          }, 3000);
        }
      } catch (error) {
        if (error as Error) {
          console.error((error as Error).message);
        }
      } finally {
        setLoadingDay(false);
        setIsclaimDay(true);
      }
    };
    claim();
  }
  const addToQueue = (message: string) => {
    toastQueue.push(message);
    if (toastQueue.length === 1) processQueue();
  };
  const processQueue = () => {
    if (toastQueue.length === 0) return;

    const currentMessage = toastQueue[0];
    toast.success(currentMessage, {
      duration: 2000,
    });
    setTimeout(() => {
      toastQueue.shift();
      processQueue();
    }, 2000);
  };
  const TaskTimer = () => {
    const now = new Date();
    const tomorrowMidnightUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0
      )
    );

    const tomorrowMidnightUTCTimestamp = tomorrowMidnightUTC.getTime();
    const [remainingTime, setRemainingTime] = useState(
      calculateRemainingTime(tomorrowMidnightUTCTimestamp)
    );

    useEffect(() => {
      const interval = setInterval(() => {
        setRemainingTime(calculateRemainingTime(tomorrowMidnightUTCTimestamp));
      }, 1000);

      return () => clearInterval(interval);
    }, [tomorrowMidnightUTCTimestamp]);

    return <div>{remainingTime}</div>;
  };
  return (
    <div className="flex flex-col overflow-auto">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Toaster
            toastOptions={{
              duration: 3000,
              success: {
                iconTheme: {
                  primary: "white",
                  secondary: "black",
                },
              },
              error: {
                iconTheme: {
                  primary: "red",
                  secondary: "white",
                },
              },
              className: "mt-14 font-medium",
              style: {
                padding: "0px",
                background: "#202021",
                color: "#fff",
              },
            }}
            position="top-center"
          >
            {(t) => (
              <ToastBar toast={t}>
                {({ icon, message }) => (
                  <div
                    className={`flex items-center p-2 rounded-lg ${
                      t.type === "success"
                        ? "bg-[#202021] text-white"
                        : t.type === "error"
                        ? "bg-[#202021] text-white"
                        : "bg-[#202021] text-white"
                    }`}
                  >
                    {icon}
                    <span>{message}</span>
                  </div>
                )}
              </ToastBar>
            )}
          </Toaster>
          {/* Connect wallet button */}
          {walletAddress ? (
            <button
              onClick={() => setActiveWalletTab(true)}
              className="w-full flex justify-center mt-8"
            >
              <div className="px-3 py-1.5 rounded-lg flex items-center gap-2 bg-base-200 font-semibold cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.5em"
                  height="1.5em"
                  viewBox="0 0 24 24"
                >
                  <g fill="#fff" fillRule="evenodd" clipRule="evenodd">
                    <path d="M21.1 8.004q-.085-.005-.181-.004h-2.525c-2.068 0-3.837 1.628-3.837 3.75s1.77 3.75 3.837 3.75h2.525q.096.001.182-.004a1.755 1.755 0 0 0 1.645-1.628c.004-.06.004-.125.004-.185V9.817c0-.06 0-.125-.004-.185a1.755 1.755 0 0 0-1.645-1.628m-2.928 4.746c.532 0 .963-.448.963-1s-.431-1-.963-1c-.533 0-.964.448-.964 1s.431 1 .964 1" />
                    <path d="M20.918 17a.22.22 0 0 1 .221.278c-.2.712-.519 1.32-1.03 1.83c-.749.75-1.698 1.081-2.87 1.239c-1.14.153-2.595.153-4.433.153h-2.112c-1.838 0-3.294 0-4.433-.153c-1.172-.158-2.121-.49-2.87-1.238c-.748-.749-1.08-1.698-1.238-2.87C2 15.099 2 13.644 2 11.806v-.112C2 9.856 2 8.4 2.153 7.26c.158-1.172.49-2.121 1.238-2.87c.749-.748 1.698-1.08 2.87-1.238C7.401 3 8.856 3 10.694 3h2.112c1.838 0 3.294 0 4.433.153c1.172.158 2.121.49 2.87 1.238c.511.512.83 1.119 1.03 1.831a.22.22 0 0 1-.221.278h-2.524c-2.837 0-5.337 2.24-5.337 5.25s2.5 5.25 5.337 5.25zM5.75 7a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5z" />
                  </g>
                </svg>
                <div>{formatAddress(walletAddress)}</div>
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1.2em"
                    height="1.2em"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#fff"
                      fillRule="evenodd"
                      d="m6 7l6 6l6-6l2 2l-8 8l-8-8z"
                    />
                  </svg>
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => {
                handleWalletAction();
              }}
              className="w-full flex justify-center mt-8"
            >
              <div className="px-3 py-1.5 rounded-lg flex items-center gap-2 bg-base-200 font-semibold cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.5em"
                  height="1.5em"
                  viewBox="0 0 24 24"
                >
                  <g fill="#fff" fillRule="evenodd" clipRule="evenodd">
                    <path d="M21.1 8.004q-.085-.005-.181-.004h-2.525c-2.068 0-3.837 1.628-3.837 3.75s1.77 3.75 3.837 3.75h2.525q.096.001.182-.004a1.755 1.755 0 0 0 1.645-1.628c.004-.06.004-.125.004-.185V9.817c0-.06 0-.125-.004-.185a1.755 1.755 0 0 0-1.645-1.628m-2.928 4.746c.532 0 .963-.448.963-1s-.431-1-.963-1c-.533 0-.964.448-.964 1s.431 1 .964 1" />
                    <path d="M20.918 17a.22.22 0 0 1 .221.278c-.2.712-.519 1.32-1.03 1.83c-.749.75-1.698 1.081-2.87 1.239c-1.14.153-2.595.153-4.433.153h-2.112c-1.838 0-3.294 0-4.433-.153c-1.172-.158-2.121-.49-2.87-1.238c-.748-.749-1.08-1.698-1.238-2.87C2 15.099 2 13.644 2 11.806v-.112C2 9.856 2 8.4 2.153 7.26c.158-1.172.49-2.121 1.238-2.87c.749-.748 1.698-1.08 2.87-1.238C7.401 3 8.856 3 10.694 3h2.112c1.838 0 3.294 0 4.433.153c1.172.158 2.121.49 2.87 1.238c.511.512.83 1.119 1.03 1.831a.22.22 0 0 1-.221.278h-2.524c-2.837 0-5.337 2.24-5.337 5.25s2.5 5.25 5.337 5.25zM5.75 7a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5z" />
                  </g>
                </svg>
                <span>Connect wallet</span>
              </div>
            </button>
          )}

          {/* QNTM Balance */}
          <div className="flex flex-col items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="7em"
              height="7em"
              className="mb-3 mt-8"
              viewBox="0 0 32 32"
            >
              <path
                fill="#fff"
                d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667"
              />
            </svg>
            <div className="flex items-center gap-2 text-center">
              <div className="text-5xl font-bold mb-1">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={MainQuantAmount}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {MainQuantAmount}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="text-2xl">QNTM</div>
            </div>
            <div className="flex items-center justify-center gap-1 text-[#868686] rounded-full px-4 py-1.5 mt-1">
              <span>{rank}</span>
              <span className="flex items-center justify-center">
                {rankIcon}
              </span>
              <span>RANK</span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setActiveTab(!activeTab)}
                className="cursor-pointer"
              >
                <span>Rewards history</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.2em"
                  height="1.2em"
                  className="inline align-middle"
                  viewBox="-6 0 24 24"
                >
                  <path
                    fill="#fff"
                    fillRule="evenodd"
                    d="M10.157 12.711L4.5 18.368l-1.414-1.414l4.95-4.95l-4.95-4.95L4.5 5.64l5.657 5.657a1 1 0 0 1 0 1.414"
                  />
                </svg>
              </button>
            </div>
          </div>
          {/*daily check-in*/}
          <div className="flex items-center justify-between bg-gradient-to-r from-slate-400 to-slate-700 rounded-xl w-full max-w-xs mx-auto p-4 mt-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center">
                <Lottie 
                lottieRef={lottieRef}
                animationData={fireAnimationData}
                loop={true}
                autoplay={true}
                style={{ width: "2.5em", height: "2.5em" }}
                />
              </div>
              <div>
                <div className="font-normal text-black text-sm">
                  {daily} days check-in
                </div>
                <div className="font-normal text-black text-sm">
                  Claimable in{" "}
                  <div className="inline-block">
                    <TaskTimer />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <button
                id="dailyClaimButton"
                onClick={() => ClaimDaily()}
                disabled={isClaimDay}
                className={
                  !isClaimDay
                    ? "w-16 h-9 rounded-full bg-white text-black text-sm cursor-pointer" //Claim
                    : "w-16 h-9 rounded-full bg-gray-500 opacity-30 text-black text-sm cursor-pointer"
                } // Claimed
              >
                {loadingDay ? (
                  <ButtonLoader />
                ) : isClaimDay ? (
                  <div className="flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="1.2em"
                      height="1.2em"
                      viewBox="0 0 24 24"
                    >
                      <g fill="#fff">
                        <path d="M10.243 16.314L6 12.07l1.414-1.414l2.829 2.828l5.656-5.657l1.415 1.415z" />
                        <path
                          fillRule="evenodd"
                          d="M1 12C1 5.925 5.925 1 12 1s11 4.925 11 11s-4.925 11-11 11S1 18.075 1 12m11 9a9 9 0 1 1 0-18a9 9 0 0 1 0 18"
                          clipRule="evenodd"
                        />
                      </g>
                    </svg>
                  </div>
                ) : (
                  <div>Claim</div>
                )}
              </button>
            </div>
          </div>
          {/*carousel*/}
          <HomeCarousel />
          
          {/*farming QNTM*/}
          <div className="w-full max-w-xs mx-auto mt-3 mb-6">
            <div className="font-semibold text-lg">Farm</div>
            <div className="flex items-center justify-between bg-black rounded-xl p-1 mt-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1.5em"
                    height="1.5em"
                    viewBox="0 0 32 32"
                  >
                    <path
                      fill="currentColor"
                      d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667"
                    />
                  </svg>
                </div>
                <div>
                  <div className="font-normal text-xs">0 QNTM</div>
                  <div className="font-normal text-xs text-stone-500 mt-1">
                    Next claim in 0h 0m
                  </div>
                </div>
              </div>
              <div>
                <button className="btn btn-disabled w-16 h-9 rounded-full bg-white text-black text-sm">
                  Access
                </button>
              </div>
            </div>
          </div>
          {/*solve-to-earn card*/}
          <div className="w-full max-w-xs mx-auto mt-4">
            <div className="font-semibold text-lg mb-3">Solve-to-Earn</div>
            <div
              className="flex items-center justify-between bg-cover bg-center rounded-2xl p-4"
              style={{ backgroundImage: `url(${bgSolveToEarnCard.src})` }}
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center">
                  <Lottie 
                  lottieRef={lottieRef}
                  animationData={hundredAnimationData}
                  loop={true}
                  autoplay={true}
                  style={{ width: "2.5em", height: "2.5em" }}
                  />
                </div>
                <div>
                  <div className="font-medium text-sm">Solve-to-Earn</div>
                  <div className="font-normal text-xs text-gray-500 mt-1">
                    {remainingSolveToEarnRef.current} passes
                  </div>
                </div>
              </div>
              <div>
                <button
                  id="solvetoearnbutton"
                  onClick={() => goToSolveToEarn()}
                  disabled={remainingSolveToEarn == 0}
                  className={
                    remainingSolveToEarn > 0
                      ? "font-medium w-16 h-9 text-sm bg-white text-black rounded-full cursor-pointer"
                      : "font-medium w-16 h-9 opacity-30 text-xs bg-white text-black rounded-full cursor-pointer"
                  }
                >
                  Solve
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {/*Wallet Tab */}
        {isActiveWalletTab && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-black/50 flex justify-center items-end z-50 fixed inset-0"
            onClick={() => setActiveWalletTab(false)}
          >
            <motion.div
              initial={{ y: "50%" }}
              animate={{ y: 30 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-black rounded-t-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center border-b border-b-[#303031] p-4">
                <div className="flex-1 text-center font-semibold text-xl">
                  Wallet
                </div>
                <button
                  onClick={() => setActiveWalletTab(false)}
                  className="cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1.3em"
                    height="1.3em"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#606060"
                      d="m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275t.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275z"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex justify-between items-center bg-[#202021] rounded-xl p-4 w-[20rem] mx-auto mt-4">
                <div className="flex flex-col">
                  <div className="font-medium text-base text-green-500">
                    Active wallet
                  </div>
                  <div className="font-medium text-base">
                    {toUserFriendlyAddress(walletAddress || "").slice(0, 4)}...
                    {toUserFriendlyAddress(walletAddress || "").slice(-4)}
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="2em"
                  height="2em"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#22c55e"
                    d="M23 12c0 6.075-4.925 11-11 11S1 18.075 1 12S5.925 1 12 1s11 4.925 11 11M9.305 18.11l9.402-9.403l-1.414-1.414l-7.883 7.883l-2.476-3.01l-1.511 1.31l3.882 4.633z"
                  />
                </svg>
              </div>
              <div className="flex items-center justify-center mt-4">
                <button
                  onClick={() => {
                    setActiveWalletTab(false);
                    handleWalletAction();
                  }}
                  className="bg-red-500 px-3 py-3 rounded-xl w-[20rem] mx-auto cursor-pointer"
                >
                  <div className="flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="1.2em"
                      height="1.2em"
                      className="mr-1"
                      viewBox="0 0 1024 1024"
                    >
                      <path
                        fill="currentColor"
                        d="M832.6 191.4c-84.6-84.6-221.5-84.6-306 0l-96.9 96.9l51 51l96.9-96.9c53.8-53.8 144.6-59.5 204 0c59.5 59.5 53.8 150.2 0 204l-96.9 96.9l51.1 51.1l96.9-96.9c84.4-84.6 84.4-221.5-.1-306.1M446.5 781.6c-53.8 53.8-144.6 59.5-204 0c-59.5-59.5-53.8-150.2 0-204l96.9-96.9l-51.1-51.1l-96.9 96.9c-84.6 84.6-84.6 221.5 0 306s221.5 84.6 306 0l96.9-96.9l-51-51zM260.3 209.4a8.03 8.03 0 0 0-11.3 0L209.4 249a8.03 8.03 0 0 0 0 11.3l554.4 554.4c3.1 3.1 8.2 3.1 11.3 0l39.6-39.6c3.1-3.1 3.1-8.2 0-11.3z"
                      />
                    </svg>
                    Disconnect
                  </div>
                </button>
              </div>
              <div className="flex items-center justify-center mt-4">
                <button
                  onClick={() => setActiveWalletTab(false)}
                  className="bg-white text-black px-3 py-3 rounded-xl w-[20rem] mx-auto cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="h-[10vh]"></div>
            </motion.div>
          </motion.div>
        )}
        {/*Rewards History Tab */}
        {activeTab && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex justify-center items-end z-50"
            onClick={() => setActiveTab(false)}
          >
            <motion.div
              initial={{ y: "75%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-black p-6 rounded-t-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Rewards</h2>
                <button
                  onClick={() => setActiveTab(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="h-[35vh] overflow-auto">
                {taskhistoryList.length > 0 ? (
                  <div className="space-y-3">
                    {taskhistoryList.map((task) => (
                      <div
                        key={task.id}
                        className="bg-[#151516] rounded-lg p-4 flex items-center justify-between"
                      >
                        {/*Left Section*/}
                        <div className="flex items-center space-x-3">
                          {/*Icon container*/}
                          <div className="flex items-center justify-center">
                            {/*Main Icon*/}
                            {task.platform}
                          </div>
                          {/*text content*/}
                          <div>
                            <p className="font-semibold">{task.title}</p>
                            <p className="text-gray-400 text-sm">{task.date}</p>
                          </div>
                        </div>
                        {/*right section*/}
                        <div className="text-right">
                          <p className="text-green-500 font-semibold">
                            +{task.quant} QNTM
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400">
                    No tasks available
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeTab && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-black/50 z-50 flex justify-center items-center"
            onClick={() => setActiveTab(false)}
          ></motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default HomePageContent;
