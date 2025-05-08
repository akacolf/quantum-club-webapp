"use client";
import React, { useEffect, useState } from "react";
import { dbfs } from "@/app/firebase/firebaseConfig";
import {
  updateDoc,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import Loader from "../loading";
import { useGameContext } from "@/app/contexts/MiningContext";
import { getAuth } from "firebase/auth";
import { ButtonLoader } from "../components/ButtonLoader";
import { getAllTasks } from "./tasks";
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from "next/navigation";
import { bgEarnPageCard, bgSolveToEarnCard } from "../images";
import { useLeaderboardContext } from "../contexts/LeaderboardContext";
import { EarnTask } from "@/lib/interfaces";
const calculateRemainingTime = (timestamp:number) => {
  const now:Date = new Date();
  const targetTime:Date = new Date(timestamp);
  const diffMs = targetTime.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const seconds = String(Math.floor((diffMs / 1000) % 60)).padStart(2, "0");
  const minutes = String(Math.floor((diffMs / 1000 / 60) % 60)).padStart(2, "0");
  const hours = String(Math.floor((diffMs / 1000 / 60 / 60) % 24)).padStart(2, "0");
  return ` ${hours}:${minutes}:${seconds}`;
};

const EarnPageContent = () => {
  const [taskS, setTasks] = useState<EarnTask[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const limitedTXT = 'Limited';
  const ingameTXT = 'In-app';
  const ParnersTXT = 'Partners';
  const [activeTab, setActiveTab] = useState(limitedTXT);
  const [limitedTasks, setLimitedTasks] = useState<EarnTask[]>([]);
  const [ingameTasks, setInGameTasks] = useState<EarnTask[]>([]);
  const [partnersTasks, setPartnersTasks] = useState<EarnTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [limitedTimestamp, setLimitedstamp] = useState(0)
  const claimTEXT = 'Claim';
  const { telegramId, SetMainQuantAmount, remainingSolveToEarn, setRemainingSolveToEarn } = useGameContext();
  const [solvetoearnRemaining] = useState<number>(remainingSolveToEarn);
  const { totalUsers } = useLeaderboardContext();
  const [activeTaskId, setActiveTaskId] = useState(null);
  const router = useRouter();
  useEffect(() => {
    try {
      const checkSolveToEarn = async () => {
        const solveToEarnRef = doc(dbfs, `user/${telegramId}/miningData/values`);
        const snapshotSolveToEarn = await getDoc(solveToEarnRef);
        const remainingSolveToEarnDB = snapshotSolveToEarn.exists() ? snapshotSolveToEarn.data().remainingSolveToEarn : 0;
        setRemainingSolveToEarn(remainingSolveToEarnDB);
      }
      checkSolveToEarn()
      if (remainingSolveToEarn > 0) {
        router.prefetch("/earn/solvetoearn-page");
      }
    } catch (error) {
      if(error instanceof Error) {
      console.error(error.message);
          }
    }
  })
  useEffect(() => {
    const totalCompletedCheck = async () => {
      const totalCompleted = collection(dbfs, `user/${telegramId}/tasks`);
      const snapshotTotalCompleted = await getDocs(totalCompleted);
      if(!snapshotTotalCompleted.empty){setCompletedTasks(snapshotTotalCompleted.size)}else{setCompletedTasks(0)};

    }
    totalCompletedCheck();
    const fetchTasks = async () => {
      if (typeof window !== "undefined") {
        window?.Telegram?.WebApp.BackButton.hide();
      }
      setLoading(true);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          console.error("Permission denied");
          return;
        }

        // Verileri sadece bir kez çekmek için
        const tasksList:EarnTask[] = (await Promise.all(
          getAllTasks().map(async (task) => {
            const whichPlatform = task.whichPlatform;
            let description: string | React.ReactNode;
            if (whichPlatform == "userMilestone") {
              description = <div>
                Road to 1K - <span className="animate-gradient-text">{totalUsers} / 1000</span>
              </div>;
            } else {
              description = task.description;
            }
            const quantRef = doc(dbfs, `tasks/${task.id}`)
            const quantSnapshot = await getDoc(quantRef);
            const quant = quantSnapshot.data()?.quantReward ? quantSnapshot.data()?.quantReward : 0;
            const timestamp = quantSnapshot.data()?.timestamp ? quantSnapshot.data()?.timestamp : 0;
            const platform = task.platform;
            const category = task.category;
            const buttontitle = task.buttontitle;
            const url = task.url;
            const taskRef = doc(dbfs, `user/${telegramId}/tasks/${task.id}`);
            const taskSnapshot = await getDoc(taskRef);
            const completed = taskSnapshot.exists() && taskSnapshot.data().completed;
            if (Date.now() > timestamp && timestamp !== 0) return null;
            if(timestamp > 0){ setLimitedstamp(timestamp)};
            return {
              ...task,
              id: task.id,
              description,
              completed,
              category,
              platform,
              buttontitle,
              buttonText: completed ? "Joined" : buttontitle,
              url,
              quant,
              whichPlatform,
              timestamp,
            } as EarnTask;
          })
        )).filter((task): task is EarnTask => task !== null);

        sessionStorage.setItem("tasks", JSON.stringify(tasksList));

        // Tüm task'ları state'e kaydet
        setTasks([]);

        // Tab'lara göre task'ları ayır
        setLimitedTasks(tasksList?.filter(task => task.category === limitedTXT));
        setInGameTasks(tasksList?.filter(task => task.category === ingameTXT));
        setPartnersTasks(tasksList?.filter(task => task.category === ParnersTXT));
        // Button texts setup
        
      } catch (error) {
        if (error instanceof Error) {
        console.error(error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [telegramId,totalUsers]);
  const TaskTimer: React.FC<{ timestamp: number }> = ({ timestamp }) => {
    const [remainingTime, setRemainingTime] = useState(calculateRemainingTime(timestamp));

    useEffect(() => {
      const interval = setInterval(() => {
        setRemainingTime(calculateRemainingTime(timestamp));
      }, 1000); // Her saniyede bir güncelle

      return () => clearInterval(interval);
    }, [timestamp]);
    return <div>{remainingTime ? remainingTime : "00:00:00"}</div>;
  };
  // Tab değiştiğinde, sadece o tab'a ait görevleri göster
  useEffect(() => {
    if (activeTab === limitedTXT) {
      setTasks(limitedTasks);
    } else if (activeTab === ingameTXT) {
      setTasks(ingameTasks);
    } else if (activeTab === ParnersTXT) {
      setTasks(partnersTasks);
    }
  }, [activeTab, limitedTasks, ingameTasks, partnersTasks]);
  const handleJoinTask = (task:EarnTask) => {
    completeTask(task);
  };

  const completeTask = async (task:EarnTask) => {
    try {
      const taskId = task.id;
      const taskRef = doc(dbfs, `user/${telegramId}/tasks/${taskId}`);
      const taskSnapshot = await getDoc(taskRef);
      const miningData = doc(dbfs, `user/${telegramId}/miningData/values`);
      let tgIdNumerical;
      const channelUsername = "quantumclubinc";
      router.prefetch("/earn/9CXx152NbBKOKE2");
      if (typeof window !== "undefined") {
        tgIdNumerical = window?.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      }

      if (task.whichPlatform === "telegram") {
        if (task.buttonText === "Join" && task.url) {
          openTelegramGroup(task?.url, task);

          task.buttonText = <ButtonLoader />;
          
        }
        if (task.buttonText === claimTEXT) {
          task.buttonText = <ButtonLoader />;
          try {
            const response = await fetch('/api/checkmembership', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tgIdNumerical,
                channelUsername,
              }),
            });
            if (!response.ok) {
              const errorData = await response.json();
              task.buttonText = task.buttontitle;
              setActiveTaskId(null);
              task.completed = false;
              throw new Error(errorData.error || 'Failed to check membership');
            }
            const data = await response.json();
            if (data.isMember) {
              const date = new Date(Date.now());
              const formattedDate =
                `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
              if (!taskSnapshot.exists()) {
                await setDoc(taskRef, {
                  quant: task.quant,
                  completed: true,
                  Date: formattedDate,
                  platform: task.whichPlatform,
                });
                const miningSnapshot = await getDoc(miningData);
                const currentQuantAmount = miningSnapshot.exists()
                  ? miningSnapshot.data().QuantAmount
                  : 0;
                const quantRef = doc(dbfs, `tasks/${task.id}`)
                const quantSnapshot = await getDoc(quantRef);
                const quantVal = quantSnapshot.data()?.quantReward;
                const updatedQuantAmount = Number(currentQuantAmount) + Number(quantVal);
                await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
                const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                });
                if (typeof window !== "undefined") {
                  localStorage.setItem("QAmount", formattedAmount);
                }
                SetMainQuantAmount(formattedAmount);
                task.buttonText = "Joined";
                setTasks((prevTasks) => {
                  const updatedTasks = prevTasks.map((t) =>
                    t.id === task.id ? { ...t, completed: true } : t
                  );

                  setActiveTaskId(null);
                  console.error("Görev Tamamlandı");
                  sessionStorage.setItem("tasks", JSON.stringify(updatedTasks));
                  setCompletedTasks(completedTasks + 1);
                  return updatedTasks;
                });
              }

            } else {
              if(task && task.url)
              {openTelegramGroup(task.url, task);
              task.buttonText = <ButtonLoader />;
              setTimeout(() => {
                task.buttonText = task.buttontitle;
                return;
              }, 2000);}
            }
          } catch {
            task.buttonText = task.buttontitle;
            setActiveTaskId(null);
            task.completed = false;
          }
        }
      }
      if (task.whichPlatform === "checktelegramAgain") {
        if (task.buttonText === "Check") {
          try {
            task.buttonText = <ButtonLoader />;
            const response = await fetch('/api/checkmembership', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tgIdNumerical,
                channelUsername,
              }),
            });
            if (!response.ok) {
              const errorData = await response.json();
              task.buttonText = task.buttontitle;
              setActiveTaskId(null);
              task.completed = false;
              throw new Error(errorData.error || 'Failed to check membership');
            }
            const data = await response.json();
            if (data.isMember) {
              task.buttonText = claimTEXT;
              return;
            } else {
              task.buttonText = task.buttontitle;
              setActiveTaskId(null);
              task.completed = false;
            }
          } catch {
            task.buttonText = task.buttontitle;
            setActiveTaskId(null);
            task.completed = false;
          }
        }
        if (task.buttonText === claimTEXT) {
          task.buttonText = <ButtonLoader />;
          const date = new Date(Date.now());
          const formattedDate =
            `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
          if (!taskSnapshot.exists()) {
            await setDoc(taskRef, {
              quant: task.quant,
              completed: true,
              Date: formattedDate,
              platform: task.whichPlatform,
            });
            const miningSnapshot = await getDoc(miningData);
            const currentQuantAmount = miningSnapshot.exists()
              ? miningSnapshot.data().QuantAmount
              : 0;
            const quantRef = doc(dbfs, `tasks/${task.id}`)
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount = Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            task.buttonText = "Joined";
            setTasks((prevTasks) => {
              const updatedTasks = prevTasks.map((t) =>
                t.id === task.id ? { ...t, completed: true } : t
              );

              setActiveTaskId(null);
              console.error("Görev Tamamlandı");
              sessionStorage.setItem("tasks", JSON.stringify(updatedTasks));
              setCompletedTasks(completedTasks + 1);
              return updatedTasks;
            });
          }
        }

      }
      if (task.whichPlatform === "twitter") {
        if (task.buttonText === "Follow") {
          if (
            !task.url?.startsWith("http://") &&
            !task.url?.startsWith("https://")
          ) {
            task.url = "https://" + task.url;
          }
          if (task?.whichPlatform && task.whichPlatform !== "telegram" as string) {
            window.open(task.url, "_blank");
          }
          task.buttonText = <ButtonLoader />;
          setTimeout(() => {
            task.buttonText = claimTEXT;
            return;
          }, 2000);
        } else if (task.buttonText === claimTEXT) {
          task.buttonText = <ButtonLoader />;
          if (!taskSnapshot.exists()) {
            const date = new Date(Date.now());
            const formattedDate =
              `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            console.error(task.platform);
            await setDoc(taskRef, {
              quant: task.quant,
              completed: true,
              Date: formattedDate,
              platform: task.whichPlatform,
            });
            const miningSnapshot = await getDoc(miningData);
            const currentQuantAmount = miningSnapshot.exists()
              ? miningSnapshot.data().QuantAmount
              : 0;
            const quantRef = doc(dbfs, `tasks/${task.id}`)
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount = Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            task.buttonText = "Joined";
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            task.completed = true;
            setActiveTaskId(null);
            setCompletedTasks(completedTasks + 1);
            console.error("Görev başarıyla oluşturuldu ve tamamlandı.");
          } else {
            console.error("This task has already been completed.");
          }
        }
      }
      if (task.whichPlatform === "chemist") {
        if (task.buttonText === "Check") {
          console.error(task.buttonText);
          try {
            document.cookie = `taskId=${task.id}; path=@/app/earn/9CXx152NbBKOKE2; secure; SameSite=Strict`;
            router.push("/earn/9CXx152NbBKOKE2");
          } catch (error) {
            if (error instanceof Error) {
              console.error(error.message);
            }
          }
        }
      }
      if (task.whichPlatform === "instagram") {
        if (task.buttonText === "Check") {
          if (
            !task.url?.startsWith("http://") &&
            !task.url?.startsWith("https://")
          ) {
            task.url = "https://" + task.url;
          }
          if (task.whichPlatform != "telegram" as string) {
            window.open(task.url, "_blank");
          }
          task.buttonText = <ButtonLoader />;
          setTimeout(() => {
            task.buttonText = claimTEXT;
            return;
          }, 2000);
        } else if (task.buttonText === claimTEXT) {
          task.buttonText = <ButtonLoader />;
          if (!taskSnapshot.exists()) {
            const date = new Date(Date.now());
            const formattedDate =
              `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            await setDoc(taskRef, {
              quant: task.quant,
              completed: true,
              Date: formattedDate,
              platform: task.whichPlatform,
            });
            const miningSnapshot = await getDoc(miningData);
            const currentQuantAmount = miningSnapshot.exists()
              ? miningSnapshot.data().QuantAmount
              : 0;
            const quantRef = doc(dbfs, `tasks/${task.id}`)
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount = Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            task.buttonText = "Joined";
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            setCompletedTasks(completedTasks + 1);
            task.completed = true;
            setActiveTaskId(null);
            console.error("The task has been successfully created and completed.");
          } else {
            console.error("This task has already been completed.");
          }
        }
      }
      if (task.whichPlatform === "referrals") {
        task.buttonText = <ButtonLoader />;
        const userReferalls = collection(dbfs, `user/${telegramId}/referrals`);
        const needRefValue = doc(dbfs, `tasks/${task.id}`);
        const snapshotNeedRefValue = await getDoc(needRefValue);
        const snapshotReferrals = await getDocs(userReferalls);
        if (snapshotNeedRefValue.exists() && !snapshotReferrals.empty) {
          const needRef = snapshotNeedRefValue.data().referralValue;
          if (snapshotReferrals.size >= needRef) {
            const date = new Date(Date.now());
            const formattedDate =
              `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            await setDoc(taskRef, {
              quant: task.quant,
              completed: true,
              Date: formattedDate,
              platform: task.whichPlatform,
            }, { merge: true });
            const miningSnapshot = await getDoc(miningData);
            const currentQuantAmount = miningSnapshot.exists()
              ? miningSnapshot.data().QuantAmount
              : 0;
            const quantRef = doc(dbfs, `tasks/${task.id}`)
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount = Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            task.buttonText = "Joined";
            setCompletedTasks(completedTasks + 1);
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            task.completed = true;
            setActiveTaskId(null);
          } else {
            task.buttonText = "Check";

          }
        } else {
          task.buttonText = "Check";
        }
      }
      if (task.whichPlatform === "referrals10") {
        task.buttonText = <ButtonLoader />;
        const userReferalls = collection(dbfs, `user/${telegramId}/referrals`);
        const needRefValue = doc(dbfs, `tasks/${task.id}`);
        const snapshotNeedRefValue = await getDoc(needRefValue);
        const snapshotReferrals = await getDocs(userReferalls);
        if (snapshotNeedRefValue.exists() && !snapshotReferrals.empty) {
          const needRef = snapshotNeedRefValue.data().referralValue;
          if (snapshotReferrals.size >= needRef) {
            const date = new Date(Date.now());
            const formattedDate =
              `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            await setDoc(taskRef, {
              quant: task.quant,
              completed: true,
              Date: formattedDate,
              platform: task.whichPlatform,
            }, { merge: true });
            const miningSnapshot = await getDoc(miningData);
            const currentQuantAmount = miningSnapshot.exists()
              ? miningSnapshot.data().QuantAmount
              : 0;
            const quantRef = doc(dbfs, `tasks/${task.id}`)
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount = Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            task.buttonText = "Joined";
            setCompletedTasks(completedTasks + 1);
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            task.completed = true;
            setActiveTaskId(null);
          } else {
            task.buttonText = "Check";

          }
        } else {
          task.buttonText = "Check";
        }
      }
      if (task.whichPlatform === "onchain") {
        if (task.buttonText === "Check") {
          try {
            document.cookie = `taskId=${task.id}; path=@/app/earn/9CXx152NbBKOKE2; secure; SameSite=Strict`;
            router.push("/earn/9CXx152NbBKOKE2");
          } catch (error) {
            if (error instanceof Error) {
              console.error(error.message);
            }
          }
        }
      }
      if (task.whichPlatform === "userMilestone") {
        const totalUserDBRef = collection(dbfs, `user`);
        const snapshotTotalUser = await getDocs(totalUserDBRef);
        const totalUserDB = snapshotTotalUser.size;
        const valueRef = doc(dbfs, `tasks/${taskId}`);
        const snapshotValue = await getDoc(valueRef);
        const value = snapshotValue.exists() && snapshotValue.data().value;
        if (task.buttonText !== claimTEXT) {
          if (totalUserDB >= value) {
            task.buttonText = <ButtonLoader />;
            setTimeout(() => {
              task.buttonText = claimTEXT;
              return;
            }, 2000);
            return;
          } else {
            task.buttonText = task.buttontitle;
            return;
          }
        }
        if (task.buttonText === claimTEXT) {
          task.buttonText = <ButtonLoader />;
          if (!taskSnapshot.exists()) {
            const date = new Date(Date.now());
            const formattedDate =
              `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            await setDoc(taskRef, {
              quant: task.quant,
              completed: true,
              Date: formattedDate,
              platform: task.whichPlatform,
            });
            const miningSnapshot = await getDoc(miningData);
            const currentQuantAmount = miningSnapshot.exists()
              ? miningSnapshot.data().QuantAmount
              : 0;
            const quantRef = doc(dbfs, `tasks/${task.id}`)
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount = Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            task.buttonText = "Joined";
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            setCompletedTasks(completedTasks + 1);
            task.completed = true;
            setActiveTaskId(null);
            console.error("The task has been successfully created and completed.");
          } else {
            task.buttonText = "Joined";
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            setCompletedTasks(completedTasks + 1);
            task.completed = true;
            setActiveTaskId(null);
            console.error("This task has already been completed.");
          }
        }
      }
      if (task.whichPlatform === "connectwallet") {
        if (task.buttonText === "Check") {
          task.buttonText = <ButtonLoader />;
          console.error(telegramId)
          
          const checkWallet = await fetch(
            "/api/tonconnections/checktonWallet",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ userId: telegramId }),
            }
          );
          const responseCheckWallet = await checkWallet.json();
          const haveWallet = responseCheckWallet.haveWallet;
          if (haveWallet) {
            const walletData = responseCheckWallet;
            const address = walletData.address
            if (address && address !== "") {
              task.buttonText = claimTEXT;
              return;
            } else {
              task.buttonText = task.buttontitle;
            }
          } else {
            task.buttonText = task.buttontitle;
          }

        } else if (task.buttonText === claimTEXT) {
          task.buttonText = <ButtonLoader />;
          if (!taskSnapshot.exists()) {
            const date = new Date(Date.now());
            const formattedDate =
              `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            await setDoc(taskRef, {
              quant: task.quant,
              completed: true,
              Date: formattedDate,
              platform: task.whichPlatform,
            });
            const miningSnapshot = await getDoc(miningData);
            const currentQuantAmount = miningSnapshot.exists()
              ? miningSnapshot.data().QuantAmount
              : 0;
            const quantRef = doc(dbfs, `tasks/${task.id}`)
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount = Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            task.buttonText = "Joined";
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            setCompletedTasks(completedTasks + 1);
            task.completed = true;
            setActiveTaskId(null);
            console.error("The task has been successfully created and completed.");
          } else {
            console.error("This task has already been completed.");
          }
        }
      }
      if (task.whichPlatform === "solvetoearnExplore") {
        if (task.buttonText === "Check") {
          task.buttonText = <ButtonLoader />;
          console.error(telegramId)
          const valueRef = doc(dbfs, `user/${telegramId}/miningData/values`);
          const snapshotWallet = await getDoc(valueRef);
          if (snapshotWallet.exists()) {
            const valueData = snapshotWallet.data()
            const remainingSolveToEarnDB = valueData.remainingSolveToEarn
            if (remainingSolveToEarnDB < 7) {
              setTimeout(() => {
                task.buttonText = claimTEXT;
                return;
              }, 1000);

            } else {
              task.buttonText = task.buttontitle;
            }
          } else {
            task.buttonText = task.buttontitle;
          }

        } else if (task.buttonText === claimTEXT) {
          task.buttonText = <ButtonLoader />;
          if (!taskSnapshot.exists()) {
            const date = new Date(Date.now());
            const formattedDate =
              `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            await setDoc(taskRef, {
              quant: task.quant,
              completed: true,
              Date: formattedDate,
              platform: task.whichPlatform,
            });
            const miningSnapshot = await getDoc(miningData);
            const currentQuantAmount = miningSnapshot.exists()
              ? miningSnapshot.data().QuantAmount
              : 0;
            const quantRef = doc(dbfs, `tasks/${task.id}`)
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount = Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            task.buttonText = "Joined";
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            setCompletedTasks(completedTasks + 1);
            task.completed = true;
            setActiveTaskId(null);
            console.error("The task has been successfully created and completed.");
          } else {
            console.error("This task has already been completed.");
          }
        }
      }
    } catch (error) {
      if(error instanceof Error) {
      console.error("The task could not be completed:",error);
      }
    }
  };

  const openTelegramGroup = (link:string, task:EarnTask) => {
    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      link = "https://" + link;
    }
    const tg = window.Telegram?.WebApp;
    if(tg){tg.openTelegramLink(link); completeTask(task);}
   

  };
  async function goToSolveToEarn() {
    const taskElement = document.getElementById("solvetoearnbutton");
    if (taskElement) {
      (taskElement as HTMLButtonElement).disabled = true;
    }
    const date = new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate()
    ));

    const formattedDate =
      `${date.getUTCDate().toString().padStart(2, '0')}/` +
      `${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/` +
      `${date.getUTCFullYear()}`;
    const solveToEarnSet = doc(dbfs, `user/${telegramId}/miningData/values`);
    const snapshotSolveToEarn = await getDoc(solveToEarnSet);
    const remainingSolveToEarn: number = snapshotSolveToEarn.data()?.remainingSolveToEarn;
    if (remainingSolveToEarn > 0) {
      updateDoc(solveToEarnSet, {
        remainingSolveToEarn: remainingSolveToEarn - 1,
        lastSolveToEarnDate: formattedDate,
      });
      setRemainingSolveToEarn(remainingSolveToEarn - 1);
      sessionStorage.setItem("remainingSolveToEarn", `${remainingSolveToEarn - 1}`);
      router.push("/earn/solvetoearn-page")
    }
  }
  return (

    <div className="overflow-auto">
      {!loading ?
        (<AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/*top section card */}
            <div className="px-4">
              <div className="flex items-center justify-between p-6 bg-cover bg-center rounded-2xl"
                style={{ backgroundImage: `url(${bgEarnPageCard.src}` }}
              >
                <div className="flex flex-col">
                  <div className="font-medium text-xl">Earn</div>
                  <div className="font-medium text-sm mt-1 text-gray-500">Complete various tasks to earn QNTM.</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="4em" height="4em" viewBox="0 0 32 32">
                  <g fill="none">
                    <g filter="url(#f1633id13)">
                      <path fill="url(#f1633idt)" d="M18.687 24.856c.439-.192.621-.472.753-.637c1.186-1.48-1.343-5.875-4.954-8.418c-3.827-3.332-8.04-4.468-9.226-2.987c-.203.254-.363.6-.429.99L2.581 26.75c-.078 1.578.525 2.178.827 2.47c.547.532 1.61.983 2.72.593c4.281-1.649 8.292-3.097 12.558-4.957" />
                    </g>
                    <path fill="url(#f1633idu)" d="M18.687 24.856c.439-.192.621-.472.753-.637c1.186-1.48-1.343-5.875-4.954-8.418c-3.827-3.332-8.04-4.468-9.226-2.987c-.203.254-.363.6-.429.99L2.581 26.75c-.078 1.578.525 2.178.827 2.47c.547.532 1.61.983 2.72.593c4.281-1.649 8.292-3.097 12.558-4.957" />
                    <path fill="url(#f1633idv)" d="M18.687 24.856c.439-.192.621-.472.753-.637c1.186-1.48-1.343-5.875-4.954-8.418c-3.827-3.332-8.04-4.468-9.226-2.987c-.203.254-.363.6-.429.99L2.581 26.75c-.078 1.578.525 2.178.827 2.47c.547.532 1.61.983 2.72.593c4.281-1.649 8.292-3.097 12.558-4.957" />
                    <path fill="url(#f1633idw)" d="M18.687 24.856c.439-.192.621-.472.753-.637c1.186-1.48-1.343-5.875-4.954-8.418c-3.827-3.332-8.04-4.468-9.226-2.987c-.203.254-.363.6-.429.99L2.581 26.75c-.078 1.578.525 2.178.827 2.47c.547.532 1.61.983 2.72.593c4.281-1.649 8.292-3.097 12.558-4.957" />
                    <g filter="url(#f1633id14)">
                      <ellipse cx="12.298" cy="18.624" fill="url(#f1633idx)" rx="8.772" ry="3.464" transform="rotate(39.746 12.298 18.624)" />
                    </g>
                    <g filter="url(#f1633id15)">
                      <ellipse cx="12.555" cy="18.187" fill="url(#f1633idy)" rx="8.13" ry="2.915" transform="rotate(39.746 12.555 18.187)" />
                      <ellipse cx="12.555" cy="18.187" fill="url(#f1633id0)" rx="8.13" ry="2.915" transform="rotate(39.746 12.555 18.187)" />
                      <ellipse cx="12.555" cy="18.187" fill="url(#f1633id1)" rx="8.13" ry="2.915" transform="rotate(39.746 12.555 18.187)" />
                    </g>
                    <circle cx="14.956" cy="16" r="1.203" fill="url(#f1633id2)" />
                    <circle cx="14.956" cy="16" r="1.203" fill="url(#f1633id3)" />
                    <circle cx="24.831" cy="22.906" r="1.203" fill="url(#f1633id4)" />
                    <circle cx="24.831" cy="22.906" r="1.203" fill="url(#f1633id5)" />
                    <circle cx="24.831" cy="22.906" r="1.203" fill="url(#f1633id6)" />
                    <circle cx="23.823" cy="7.016" r="1.203" fill="url(#f1633id7)" />
                    <circle cx="23.823" cy="7.016" r="1.203" fill="url(#f1633id8)" />
                    <circle cx="9.991" cy="3.367" r="1.203" fill="url(#f1633id9)" />
                    <circle cx="9.991" cy="3.367" r="1.203" fill="url(#f1633ida)" />
                    <circle cx="9.991" cy="3.367" r="1.203" fill="url(#f1633idb)" />
                    <circle cx="4.928" cy="8.109" r="1.203" fill="url(#f1633idc)" />
                    <circle cx="4.928" cy="8.109" r="1.203" fill="url(#f1633idd)" />
                    <path fill="url(#f1633ide)" d="M15.953 26.01c-2.606-.182-4.434-.962-7.395-3.408c-2.548-2.105-3.813-3.972-4.235-5.876l-.489 2.813c.2 1.102 1.06 2.64 2.763 4.18c2.227 2.013 4.445 3.437 6.638 3.375a182 182 0 0 0 2.718-1.085" />
                    <path fill="url(#f1633idf)" d="M10.457 28.163c-1.253.07-2.946-.952-4.704-2.413c-1.5-1.297-2.24-2.706-2.396-3.466l-.496 2.857c.122.483.497 1.14 1.58 2.25c1.21 1.24 2.428 1.724 3.15 1.861l1.532-.582z" />
                    <g filter="url(#f1633id16)">
                      <path fill="url(#f1633idg)" fillRule="evenodd" d="M27.903 13.109c-3.598-.703-5.724.945-6.398 1.684a1.05 1.05 0 1 1-1.552-1.414c1.045-1.147 3.873-3.207 8.353-2.331a1.05 1.05 0 0 1-.403 2.06" clipRule="evenodd" />
                      <path fill="url(#f1633idh)" fillRule="evenodd" d="M27.903 13.109c-3.598-.703-5.724.945-6.398 1.684a1.05 1.05 0 1 1-1.552-1.414c1.045-1.147 3.873-3.207 8.353-2.331a1.05 1.05 0 0 1-.403 2.06" clipRule="evenodd" />
                    </g>
                    <path fill="url(#f1633idz)" fillRule="evenodd" d="M19.104 2.082a.95.95 0 0 1 .905.994a18 18 0 0 1-.479 3.207c-.262 1.074-.665 2.264-1.286 3.285c.15.796.154 1.735-.011 2.803a.95.95 0 0 1-1.878-.29q.055-.357.08-.672a3 3 0 0 1-.566.226a2.44 2.44 0 0 1-2.04-.312c-1.074-.715-1.569-2.28-.738-3.56c.79-1.216 2.438-1.547 3.69-.681q.217.15.407.337c.2-.505.364-1.045.496-1.586c.281-1.152.398-2.232.427-2.846a.95.95 0 0 1 .993-.905m-2.947 7.14c-.144-.3-.316-.48-.456-.577c-.392-.271-.822-.145-1.017.154a.694.694 0 0 0 .198.943c.12.08.273.12.476.063c.184-.052.465-.2.799-.582" clipRule="evenodd" />
                    <path fill="url(#f1633idi)" fillRule="evenodd" d="M19.104 2.082a.95.95 0 0 1 .905.994a18 18 0 0 1-.479 3.207c-.262 1.074-.665 2.264-1.286 3.285c.15.796.154 1.735-.011 2.803a.95.95 0 0 1-1.878-.29q.055-.357.08-.672a3 3 0 0 1-.566.226a2.44 2.44 0 0 1-2.04-.312c-1.074-.715-1.569-2.28-.738-3.56c.79-1.216 2.438-1.547 3.69-.681q.217.15.407.337c.2-.505.364-1.045.496-1.586c.281-1.152.398-2.232.427-2.846a.95.95 0 0 1 .993-.905m-2.947 7.14c-.144-.3-.316-.48-.456-.577c-.392-.271-.822-.145-1.017.154a.694.694 0 0 0 .198.943c.12.08.273.12.476.063c.184-.052.465-.2.799-.582" clipRule="evenodd" />
                    <path fill="url(#f1633idj)" fillRule="evenodd" d="M19.104 2.082a.95.95 0 0 1 .905.994a18 18 0 0 1-.479 3.207c-.262 1.074-.665 2.264-1.286 3.285c.15.796.154 1.735-.011 2.803a.95.95 0 0 1-1.878-.29q.055-.357.08-.672a3 3 0 0 1-.566.226a2.44 2.44 0 0 1-2.04-.312c-1.074-.715-1.569-2.28-.738-3.56c.79-1.216 2.438-1.547 3.69-.681q.217.15.407.337c.2-.505.364-1.045.496-1.586c.281-1.152.398-2.232.427-2.846a.95.95 0 0 1 .993-.905m-2.947 7.14c-.144-.3-.316-.48-.456-.577c-.392-.271-.822-.145-1.017.154a.694.694 0 0 0 .198.943c.12.08.273.12.476.063c.184-.052.465-.2.799-.582" clipRule="evenodd" />
                    <path fill="url(#f1633idk)" fillRule="evenodd" d="M19.104 2.082a.95.95 0 0 1 .905.994a18 18 0 0 1-.479 3.207c-.262 1.074-.665 2.264-1.286 3.285c.15.796.154 1.735-.011 2.803a.95.95 0 0 1-1.878-.29q.055-.357.08-.672a3 3 0 0 1-.566.226a2.44 2.44 0 0 1-2.04-.312c-1.074-.715-1.569-2.28-.738-3.56c.79-1.216 2.438-1.547 3.69-.681q.217.15.407.337c.2-.505.364-1.045.496-1.586c.281-1.152.398-2.232.427-2.846a.95.95 0 0 1 .993-.905m-2.947 7.14c-.144-.3-.316-.48-.456-.577c-.392-.271-.822-.145-1.017.154a.694.694 0 0 0 .198.943c.12.08.273.12.476.063c.184-.052.465-.2.799-.582" clipRule="evenodd" />
                    <path fill="url(#f1633id10)" fillRule="evenodd" d="M13.842 22.606a19.5 19.5 0 0 1-2.115-1.365c1.086-1.347 3.027-3.113 5.557-4.388c4.157-2.096 8.741-.959 10.61-.218a1.25 1.25 0 1 1-.922 2.324c-1.601-.635-5.345-1.496-8.563.126c-2.122 1.07-3.7 2.508-4.567 3.521" clipRule="evenodd" />
                    <path fill="url(#f1633idl)" fillRule="evenodd" d="M13.842 22.606a19.5 19.5 0 0 1-2.115-1.365c1.086-1.347 3.027-3.113 5.557-4.388c4.157-2.096 8.741-.959 10.61-.218a1.25 1.25 0 1 1-.922 2.324c-1.601-.635-5.345-1.496-8.563.126c-2.122 1.07-3.7 2.508-4.567 3.521" clipRule="evenodd" />
                    <path fill="url(#f1633idm)" fillRule="evenodd" d="M13.842 22.606a19.5 19.5 0 0 1-2.115-1.365c1.086-1.347 3.027-3.113 5.557-4.388c4.157-2.096 8.741-.959 10.61-.218a1.25 1.25 0 1 1-.922 2.324c-1.601-.635-5.345-1.496-8.563.126c-2.122 1.07-3.7 2.508-4.567 3.521" clipRule="evenodd" />
                    <path fill="url(#f1633idn)" fillRule="evenodd" d="M13.842 22.606a19.5 19.5 0 0 1-2.115-1.365c1.086-1.347 3.027-3.113 5.557-4.388c4.157-2.096 8.741-.959 10.61-.218a1.25 1.25 0 1 1-.922 2.324c-1.601-.635-5.345-1.496-8.563.126c-2.122 1.07-3.7 2.508-4.567 3.521" clipRule="evenodd" />
                    <g filter="url(#f1633id17)">
                      <path fill="url(#f1633ido)" fillRule="evenodd" d="M10.192 6.653A1.25 1.25 0 1 0 8.007 7.87c.507.91 1.131 2.197 1.211 3.853c.07 1.443-.27 3.273-1.651 5.469a18 18 0 0 0 1.715 1.939c1.948-2.833 2.537-5.371 2.433-7.529c-.107-2.23-.952-3.921-1.523-4.948" clipRule="evenodd" />
                      <path fill="url(#f1633idp)" fillRule="evenodd" d="M10.192 6.653A1.25 1.25 0 1 0 8.007 7.87c.507.91 1.131 2.197 1.211 3.853c.07 1.443-.27 3.273-1.651 5.469a18 18 0 0 0 1.715 1.939c1.948-2.833 2.537-5.371 2.433-7.529c-.107-2.23-.952-3.921-1.523-4.948" clipRule="evenodd" />
                    </g>
                    <path fill="url(#f1633idq)" d="M12.855 8.212q.092-.228.234-.448c.79-1.217 2.438-1.548 3.69-.682q.217.15.407.337q.06-.155.118-.314l.005.02c-.257.81-.834 1.678-1.155 2.096c-.144-.3-.315-.48-.455-.576c-.392-.271-.823-.145-1.017.154l-.021.035z" />
                    <path fill="url(#f1633idr)" d="M12.855 8.212q.092-.228.234-.448c.79-1.217 2.438-1.548 3.69-.682q.217.15.407.337q.06-.155.118-.314l.005.02c-.257.81-.834 1.678-1.155 2.096c-.144-.3-.315-.48-.455-.576c-.392-.271-.823-.145-1.017.154l-.021.035z" />
                    <g filter="url(#f1633id18)">
                      <path fill="#44b6ff" d="M18.242 9.568c.15.796.154 1.736-.011 2.803a.95.95 0 1 1-1.878-.29q.055-.357.08-.67c.982-.617 1.63-1.437 1.809-1.843" />
                    </g>
                    <path fill="url(#f1633ids)" d="M18.242 9.568c.15.796.154 1.736-.011 2.803a.95.95 0 1 1-1.878-.29q.055-.357.08-.67c.982-.617 1.63-1.437 1.809-1.843" />
                    <g filter="url(#f1633id19)">
                      <path stroke="url(#f1633id11)" strokeLinecap="round" strokeWidth="0.3" d="M16.55 8.172c-.266-.36-1.118-1-2.188-.336c-.359.223-.57 1.062-.406 1.633" />
                    </g>
                    <g filter="url(#f1633id1a)">
                      <path stroke="url(#f1633id12)" strokeLinecap="round" strokeWidth="0.3" d="M19.472 3.016c-.084 1.51-.738 5.075-2.688 7.25" />
                    </g>
                    <defs>
                      <radialGradient id="f1633id0" cx="0" cy="0" r="1" gradientTransform="rotate(-109.125 11.529 7.252)scale(6.4775 1.81427)" gradientUnits="userSpaceOnUse">
                        <stop offset=".423" stopColor="#ca851e" />
                        <stop offset="1" stopColor="#ca851e" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="f1633id1" cx="0" cy="0" r="1" gradientTransform="matrix(1.89264 -6.22832 3.64737 1.10835 15.236 20.612)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#bc7f28" />
                        <stop offset="1" stopColor="#bc7f28" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="f1633id2" cx="0" cy="0" r="1" gradientTransform="rotate(138.668 4.788 10.757)scale(1.72711)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#5ac0ff" />
                        <stop offset="1" stopColor="#3279b6" />
                      </radialGradient>
                      <radialGradient id="f1633id3" cx="0" cy="0" r="1" gradientTransform="matrix(-1.63032 .59175 -.64863 -1.78704 15.193 15.834)" gradientUnits="userSpaceOnUse">
                        <stop offset=".535" stopColor="#3a619e" stopOpacity="0" />
                        <stop offset="1" stopColor="#3a619e" />
                      </radialGradient>
                      <radialGradient id="f1633id4" cx="0" cy="0" r="1" gradientTransform="rotate(134.569 8.076 16.542)scale(1.97753)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#fdd46c" />
                        <stop offset="1" stopColor="#f09c53" />
                      </radialGradient>
                      <radialGradient id="f1633id5" cx="0" cy="0" r="1" gradientTransform="rotate(100.827 3.31 21.505)scale(1.95883)" gradientUnits="userSpaceOnUse">
                        <stop offset=".792" stopColor="#e76260" stopOpacity="0" />
                        <stop offset=".964" stopColor="#e76260" />
                      </radialGradient>
                      <radialGradient id="f1633id6" cx="0" cy="0" r="1" gradientTransform="matrix(-1.67412 -1.06415 1.25319 -1.9715 25.405 23.105)" gradientUnits="userSpaceOnUse">
                        <stop offset=".482" stopColor="#aa885a" stopOpacity="0" />
                        <stop offset=".907" stopColor="#aa885a" />
                      </radialGradient>
                      <radialGradient id="f1633id7" cx="0" cy="0" r="1" gradientTransform="rotate(132.387 10.898 8.719)scale(2.06012)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#ff46aa" />
                        <stop offset="1" stopColor="#e3189d" />
                      </radialGradient>
                      <radialGradient id="f1633id8" cx="0" cy="0" r="1" gradientTransform="matrix(-1.85938 -.21876 .29276 -2.48843 24.331 7.234)" gradientUnits="userSpaceOnUse">
                        <stop offset=".522" stopColor="#b63173" stopOpacity="0" />
                        <stop offset="1" stopColor="#b63173" />
                      </radialGradient>
                      <radialGradient id="f1633id9" cx="0" cy="0" r="1" gradientTransform="rotate(139.574 4.858 3.427)scale(1.84118)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#fff46f" />
                        <stop offset="1" stopColor="#efb93c" />
                      </radialGradient>
                      <radialGradient id="f1633ida" cx="0" cy="0" r="1" gradientTransform="rotate(-178.519 5.278 1.518)scale(1.91464 1.82297)" gradientUnits="userSpaceOnUse">
                        <stop offset=".559" stopColor="#aa904b" stopOpacity="0" />
                        <stop offset=".944" stopColor="#aa904b" />
                      </radialGradient>
                      <radialGradient id="f1633idb" cx="0" cy="0" r="1" gradientTransform="matrix(-.4375 2 -2 -.4375 10.3 2.688)" gradientUnits="userSpaceOnUse">
                        <stop offset=".772" stopColor="#c47072" stopOpacity="0" />
                        <stop offset="1" stopColor="#c47072" />
                      </radialGradient>
                      <radialGradient id="f1633idc" cx="0" cy="0" r="1" gradientTransform="rotate(132.387 1.21 5.098)scale(2.06012)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#ff46aa" />
                        <stop offset="1" stopColor="#e3189d" />
                      </radialGradient>
                      <radialGradient id="f1633idd" cx="0" cy="0" r="1" gradientTransform="matrix(-1.85938 -.21876 .29276 -2.48843 5.436 8.328)" gradientUnits="userSpaceOnUse">
                        <stop offset=".522" stopColor="#b63173" stopOpacity="0" />
                        <stop offset="1" stopColor="#b63173" />
                      </radialGradient>
                      <radialGradient id="f1633ide" cx="0" cy="0" r="1" gradientTransform="matrix(-2.90624 3.09375 -6.77356 -6.36302 11.222 25.078)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3365ff" />
                        <stop offset="1" stopColor="#356db9" />
                      </radialGradient>
                      <radialGradient id="f1633idf" cx="0" cy="0" r="1" gradientTransform="rotate(131.598 -2.591 15.673)scale(2.62017 6.62793)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3365ff" />
                        <stop offset="1" stopColor="#356db9" />
                      </radialGradient>
                      <radialGradient id="f1633idg" cx="0" cy="0" r="1" gradientTransform="rotate(168.283 13.157 7.358)scale(4.30854 1.60742)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#ff3ba9" />
                        <stop offset="1" stopColor="#f422a7" />
                      </radialGradient>
                      <radialGradient id="f1633idh" cx="0" cy="0" r="1" gradientTransform="rotate(-127.355 16 1.624)scale(4.44241 7.91727)" gradientUnits="userSpaceOnUse">
                        <stop offset=".752" stopColor="#b8306f" stopOpacity="0" />
                        <stop offset="1" stopColor="#b8306f" />
                      </radialGradient>
                      <radialGradient id="f1633idi" cx="0" cy="0" r="1" gradientTransform="rotate(128.217 7.687 7.173)scale(7.76064 4.747)" gradientUnits="userSpaceOnUse">
                        <stop offset=".802" stopColor="#4274d2" stopOpacity="0" />
                        <stop offset=".951" stopColor="#4274d2" />
                      </radialGradient>
                      <radialGradient id="f1633idj" cx="0" cy="0" r="1" gradientTransform="matrix(1.09375 .23438 -.78682 3.6718 17.69 4.672)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#4d8ec0" />
                        <stop offset="1" stopColor="#4d8ec0" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="f1633idk" cx="0" cy="0" r="1" gradientTransform="rotate(141.953 9.567 4.557)scale(1.36904 1.23086)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#5adeff" />
                        <stop offset="1" stopColor="#5adeff" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="f1633idl" cx="0" cy="0" r="1" gradientTransform="rotate(-129.838 15.295 7.401)scale(7.98002 20.0036)" gradientUnits="userSpaceOnUse">
                        <stop offset=".623" stopColor="#526579" stopOpacity="0" />
                        <stop offset=".962" stopColor="#526579" />
                      </radialGradient>
                      <radialGradient id="f1633idm" cx="0" cy="0" r="1" gradientTransform="matrix(-.2101 2.73113 -5.49097 -.42241 23.892 19.58)" gradientUnits="userSpaceOnUse">
                        <stop offset=".396" stopColor="#6972ff" />
                        <stop offset="1" stopColor="#6972ff" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="f1633idn" cx="0" cy="0" r="1" gradientTransform="matrix(.27136 -.7003 .55226 .214 27.954 17.279)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#55bfff" />
                        <stop offset="1" stopColor="#55bfff" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="f1633ido" cx="0" cy="0" r="1" gradientTransform="matrix(-1.1971 7.21318 -2.70234 -.44848 10.844 6.436)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#ff3aaa" />
                        <stop offset="1" stopColor="#fd2f89" />
                      </radialGradient>
                      <radialGradient id="f1633idp" cx="0" cy="0" r="1" gradientTransform="rotate(31.176 -21.536 19.58)scale(4.80845 15.0903)" gradientUnits="userSpaceOnUse">
                        <stop offset=".804" stopColor="#db2c6e" stopOpacity="0" />
                        <stop offset="1" stopColor="#db2c6e" />
                      </radialGradient>
                      <radialGradient id="f1633idq" cx="0" cy="0" r="1" gradientTransform="rotate(-119.23 11 -.054)scale(2.73834 2.04693)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#336baf" />
                        <stop offset="1" stopColor="#336baf" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="f1633idr" cx="0" cy="0" r="1" gradientTransform="matrix(-1.13335 -1.46866 .59503 -.45918 17.31 7.453)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#49a4d4" />
                        <stop offset="1" stopColor="#49a4d4" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="f1633ids" cx="0" cy="0" r="1" gradientTransform="matrix(-.21876 2.57813 -1.43484 -.12175 18.144 9.485)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#4ab5f8" />
                        <stop offset="1" stopColor="#4ab5f8" stopOpacity="0" />
                      </radialGradient>
                      <linearGradient id="f1633idt" x1="4.222" x2="12.284" y1="19.984" y2="26.984" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#b3843c" />
                        <stop offset="1" stopColor="#f17a61" />
                      </linearGradient>
                      <linearGradient id="f1633idu" x1="3.331" x2="5.69" y1="21.068" y2="21.547" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#b1853b" />
                        <stop offset="1" stopColor="#b1853b" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="f1633idv" x1="19.736" x2="15.753" y1="23.828" y2="24.484" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#f9c26c" />
                        <stop offset="1" stopColor="#f9c26c" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="f1633idw" x1="11.155" x2="8.597" y1="12.391" y2="16.734" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#e6bf69" />
                        <stop offset="1" stopColor="#e6bf69" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="f1633idx" x1="12.323" x2="13.352" y1="21.804" y2="14.923" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#fccb57" />
                        <stop offset="1" stopColor="#f5bd55" />
                      </linearGradient>
                      <linearGradient id="f1633idy" x1="5.147" x2="21.627" y1="17.865" y2="18.67" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#f3ab2c" />
                        <stop offset="1" stopColor="#b57f1e" />
                      </linearGradient>
                      <linearGradient id="f1633idz" x1="19.062" x2="14.58" y1="2.081" y2="12.823" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#20b2ee" />
                        <stop offset="1" stopColor="#2689da" />
                      </linearGradient>
                      <linearGradient id="f1633id10" x1="14.45" x2="27.86" y1="21.695" y2="18.181" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3797e2" />
                        <stop offset="1" stopColor="#37aeff" />
                      </linearGradient>
                      <linearGradient id="f1633id11" x1="13.597" x2="16.378" y1="8.189" y2="7.508" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#4eaff2" />
                        <stop offset="1" stopColor="#4eaff2" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="f1633id12" x1="19.253" x2="15.347" y1="1.953" y2="10.953" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#5bddff" />
                        <stop offset="1" stopColor="#5bddff" stopOpacity="0" />
                      </linearGradient>
                      <filter id="f1633id13" width="17.162" height="18.284" x="2.574" y="11.675" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                        <feOffset dy="-.5" />
                        <feGaussianBlur stdDeviation=".5" />
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                        <feColorMatrix values="0 0 0 0 0.92549 0 0 0 0 0.34902 0 0 0 0 0.384314 0 0 0 1 0" />
                        <feBlend in2="shape" result="effect1_innerShadow_18_504" />
                      </filter>
                      <filter id="f1633id14" width="15.203" height="13.421" x="4.697" y="11.913" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                        <feGaussianBlur result="effect1_foregroundBlur_18_504" stdDeviation=".25" />
                      </filter>
                      <filter id="f1633id15" width="13.45" height="11.725" x="5.83" y="12.324" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                        <feGaussianBlur result="effect1_foregroundBlur_18_504" stdDeviation=".1" />
                      </filter>
                      <filter id="f1633id16" width="9.725" height="4.549" x="19.679" y="10.587" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                        <feOffset dx=".25" dy="-.25" />
                        <feGaussianBlur stdDeviation=".25" />
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                        <feColorMatrix values="0 0 0 0 0.721569 0 0 0 0 0.270588 0 0 0 0 0.470588 0 0 0 1 0" />
                        <feBlend in2="shape" result="effect1_innerShadow_18_504" />
                      </filter>
                      <filter id="f1633id17" width="4.31" height="13.369" x="7.567" y="6.011" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                        <feOffset dx=".15" dy=".25" />
                        <feGaussianBlur stdDeviation=".5" />
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                        <feColorMatrix values="0 0 0 0 0.721569 0 0 0 0 0.184314 0 0 0 0 0.447059 0 0 0 1 0" />
                        <feBlend in2="shape" result="effect1_innerShadow_18_504" />
                      </filter>
                      <filter id="f1633id18" width="2.512" height="3.858" x="16.342" y="9.318" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                        <feOffset dx=".5" dy="-.25" />
                        <feGaussianBlur stdDeviation=".325" />
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                        <feColorMatrix values="0 0 0 0 0.239216 0 0 0 0 0.439216 0 0 0 0 0.768627 0 0 0 1 0" />
                        <feBlend in2="shape" result="effect1_innerShadow_18_504" />
                      </filter>
                      <filter id="f1633id19" width="3.55" height="2.822" x="13.45" y="7.097" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                        <feGaussianBlur result="effect1_foregroundBlur_18_504" stdDeviation=".15" />
                      </filter>
                      <filter id="f1633id1a" width="3.888" height="8.45" x="16.184" y="2.416" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                        <feGaussianBlur result="effect1_foregroundBlur_18_504" stdDeviation=".225" />
                      </filter>
                    </defs>
                  </g>
                </svg>
              </div>
              {/*solve-to-earn card*/}
              <div className="flex items-center justify-between bg-cover bg-center rounded-2xl p-4 mt-4"
                style={{ backgroundImage: `url(${bgSolveToEarnCard.src})` }}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="2.5em" height="2.5em" viewBox="0 0 32 32">
                      <g fill="none">
                        <path fill="url(#f730id0)" d="M4.949 23.844c1.048-.161 1.757-1.438 1.914-2.25c.539-3.657 1.258-8.399 1.601-11.625c.09-.84-.305-1.54-.734-1.867c-.852-.632-1.719-.29-2.469.437c-.822.787-1.43 1.524-2.758 3.133c-.478.58-.81 1.906 0 2.523c.571.418 1.383.125 1.883-.226c-.383 2.71-.906 6.312-1.086 8.383c.002 1.059.531 1.664 1.649 1.492" />
                        <path fill="url(#f730id1)" d="M4.949 23.844c1.048-.161 1.757-1.438 1.914-2.25c.539-3.657 1.258-8.399 1.601-11.625c.09-.84-.305-1.54-.734-1.867c-.852-.632-1.719-.29-2.469.437c-.822.787-1.43 1.524-2.758 3.133c-.478.58-.81 1.906 0 2.523c.571.418 1.383.125 1.883-.226c-.383 2.71-.906 6.312-1.086 8.383c.002 1.059.531 1.664 1.649 1.492" />
                        <g filter="url(#f730idk)">
                          <path fill="url(#f730id2)" d="m6.738 11.813l-2.078 2l-1 8.109l1.859.125z" />
                        </g>
                        <path fill="url(#f730id3)" d="M5.408 23.696a1.6 1.6 0 0 1-.46.148c-1.117.172-1.646-.433-1.648-1.492c.162-1.86.6-4.954.965-7.53l.113-.792l.032-.046l2.625-1.75z" />
                        <path fill="url(#f730id4)" d="M9.042 15.383c-.109 1.203-.224 2.762.711 3.828c.86.97 1.68 1.18 3.235 1.086c1.523-.281 2.828-1.266 3.437-1.875c.89-.89 1.743-2.333 1.985-3.82c.181-.983.278-2.123.445-3.118c.305-1.812.164-3.18-.563-4.172c-.53-.828-1.646-1.341-2.914-1.265c-1.317.079-2.909.834-4.03 2.148a8.15 8.15 0 0 0-1.89 4.087c-.119.913-.283 2.109-.416 3.1m3.61-.086c.18-1.438.32-2.594.531-4.086c.141-.82.883-1.29 1.328-1.29c.639-.037.91.452.813 1.29c-.157 1.336-.304 2.617-.524 3.89c-.141.82-.71 1.335-1.35 1.373c-.532.032-.853-.333-.798-1.177" />
                        <path fill="url(#f730idu)" d="M9.042 15.383c-.109 1.203-.224 2.762.711 3.828c.86.97 1.68 1.18 3.235 1.086c1.523-.281 2.828-1.266 3.437-1.875c.89-.89 1.743-2.333 1.985-3.82c.181-.983.278-2.123.445-3.118c.305-1.812.164-3.18-.563-4.172c-.53-.828-1.646-1.341-2.914-1.265c-1.317.079-2.909.834-4.03 2.148a8.15 8.15 0 0 0-1.89 4.087c-.119.913-.283 2.109-.416 3.1m3.61-.086c.18-1.438.32-2.594.531-4.086c.141-.82.883-1.29 1.328-1.29c.639-.037.91.452.813 1.29c-.157 1.336-.304 2.617-.524 3.89c-.141.82-.71 1.335-1.35 1.373c-.532.032-.853-.333-.798-1.177" />
                        <path fill="url(#f730id5)" d="M9.042 15.383c-.109 1.203-.224 2.762.711 3.828c.86.97 1.68 1.18 3.235 1.086c1.523-.281 2.828-1.266 3.437-1.875c.89-.89 1.743-2.333 1.985-3.82c.181-.983.278-2.123.445-3.118c.305-1.812.164-3.18-.563-4.172c-.53-.828-1.646-1.341-2.914-1.265c-1.317.079-2.909.834-4.03 2.148a8.15 8.15 0 0 0-1.89 4.087c-.119.913-.283 2.109-.416 3.1m3.61-.086c.18-1.438.32-2.594.531-4.086c.141-.82.883-1.29 1.328-1.29c.639-.037.91.452.813 1.29c-.157 1.336-.304 2.617-.524 3.89c-.141.82-.71 1.335-1.35 1.373c-.532.032-.853-.333-.798-1.177" />
                        <path fill="url(#f730id6)" d="M9.042 15.383c-.109 1.203-.224 2.762.711 3.828c.86.97 1.68 1.18 3.235 1.086c1.523-.281 2.828-1.266 3.437-1.875c.89-.89 1.743-2.333 1.985-3.82c.181-.983.278-2.123.445-3.118c.305-1.812.164-3.18-.563-4.172c-.53-.828-1.646-1.341-2.914-1.265c-1.317.079-2.909.834-4.03 2.148a8.15 8.15 0 0 0-1.89 4.087c-.119.913-.283 2.109-.416 3.1m3.61-.086c.18-1.438.32-2.594.531-4.086c.141-.82.883-1.29 1.328-1.29c.639-.037.91.452.813 1.29c-.157 1.336-.304 2.617-.524 3.89c-.141.82-.71 1.335-1.35 1.373c-.532.032-.853-.333-.798-1.177" />
                        <path fill="url(#f730id7)" d="M19.843 13.07c-.11 1.203-.225 2.762.71 3.828c.86.97 1.68 1.18 3.235 1.086c1.524-.28 2.828-1.265 3.438-1.875c.89-.89 1.742-2.333 1.984-3.82c.182-.983.278-2.123.445-3.117c.305-1.813.164-3.18-.562-4.172c-.531-.828-1.646-1.342-2.914-1.266c-1.318.08-2.91.835-4.031 2.149a8.15 8.15 0 0 0-1.889 4.086c-.12.914-.283 2.11-.416 3.101m3.61-.086c.179-1.437.32-2.593.53-4.086c.142-.82.883-1.289 1.329-1.289c.639-.038.91.451.812 1.29c-.156 1.335-.304 2.617-.523 3.89c-.142.82-.711 1.334-1.35 1.373c-.532.031-.854-.334-.799-1.178" />
                        <path fill="url(#f730idv)" d="M19.843 13.07c-.11 1.203-.225 2.762.71 3.828c.86.97 1.68 1.18 3.235 1.086c1.524-.28 2.828-1.265 3.438-1.875c.89-.89 1.742-2.333 1.984-3.82c.182-.983.278-2.123.445-3.117c.305-1.813.164-3.18-.562-4.172c-.531-.828-1.646-1.342-2.914-1.266c-1.318.08-2.91.835-4.031 2.149a8.15 8.15 0 0 0-1.889 4.086c-.12.914-.283 2.11-.416 3.101m3.61-.086c.179-1.437.32-2.593.53-4.086c.142-.82.883-1.289 1.329-1.289c.639-.038.91.451.812 1.29c-.156 1.335-.304 2.617-.523 3.89c-.142.82-.711 1.334-1.35 1.373c-.532.031-.854-.334-.799-1.178" />
                        <path fill="url(#f730id8)" d="M19.843 13.07c-.11 1.203-.225 2.762.71 3.828c.86.97 1.68 1.18 3.235 1.086c1.524-.28 2.828-1.265 3.438-1.875c.89-.89 1.742-2.333 1.984-3.82c.182-.983.278-2.123.445-3.117c.305-1.813.164-3.18-.562-4.172c-.531-.828-1.646-1.342-2.914-1.266c-1.318.08-2.91.835-4.031 2.149a8.15 8.15 0 0 0-1.889 4.086c-.12.914-.283 2.11-.416 3.101m3.61-.086c.179-1.437.32-2.593.53-4.086c.142-.82.883-1.289 1.329-1.289c.639-.038.91.451.812 1.29c-.156 1.335-.304 2.617-.523 3.89c-.142.82-.711 1.334-1.35 1.373c-.532.031-.854-.334-.799-1.178" />
                        <path fill="url(#f730id9)" d="M19.843 13.07c-.11 1.203-.225 2.762.71 3.828c.86.97 1.68 1.18 3.235 1.086c1.524-.28 2.828-1.265 3.438-1.875c.89-.89 1.742-2.333 1.984-3.82c.182-.983.278-2.123.445-3.117c.305-1.813.164-3.18-.562-4.172c-.531-.828-1.646-1.342-2.914-1.266c-1.318.08-2.91.835-4.031 2.149a8.15 8.15 0 0 0-1.889 4.086c-.12.914-.283 2.11-.416 3.101m3.61-.086c.179-1.437.32-2.593.53-4.086c.142-.82.883-1.289 1.329-1.289c.639-.038.91.451.812 1.29c-.156 1.335-.304 2.617-.523 3.89c-.142.82-.711 1.334-1.35 1.373c-.532.031-.854-.334-.799-1.178" />
                        <g filter="url(#f730idl)">
                          <path stroke="url(#f730ida)" strokeLinecap="round" d="M25.398 5.36c.385-.157 1.337-.326 2.062.25c.906.718.781 1.75.656 2.406c-.1.525-.395 3.854-.656 5.406" />
                        </g>
                        <g filter="url(#f730idm)">
                          <path stroke="url(#f730idb)" strokeLinecap="round" d="M25.116 14.953c-.312.388-1.469.963-2.194.388c-.906-.719-.781-1.75-.656-2.406c.1-.525.396-2.149.656-3.7" />
                        </g>
                        <path fill="url(#f730idc)" fillRule="evenodd" d="M27.672 19.63a1.05 1.05 0 0 1-.814 1.242l-8.634 1.795l-6.586 1.467a1.05 1.05 0 0 1-.457-2.05l6.601-1.47l8.648-1.798a1.05 1.05 0 0 1 1.242.814" clipRule="evenodd" />
                        <path fill="url(#f730idd)" fillRule="evenodd" d="M25.53 23.844a1.05 1.05 0 0 1-.808 1.245l-8.792 1.874l-6.594 1.438a1.05 1.05 0 1 1-.447-2.052l6.599-1.439l8.797-1.875a1.05 1.05 0 0 1 1.245.808" clipRule="evenodd" />
                        <g filter="url(#f730idn)">
                          <circle cx="7.331" cy="9.344" r=".781" fill="#ff596f" />
                        </g>
                        <g filter="url(#f730ido)">
                          <path stroke="url(#f730ide)" strokeLinecap="round" strokeWidth="0.75" d="m5.785 21.516l1.53-11.032" />
                        </g>
                        <g filter="url(#f730idp)">
                          <path stroke="url(#f730idf)" strokeLinecap="round" strokeWidth="0.75" d="m3.66 13.184l1.937-2.313" />
                        </g>
                        <g filter="url(#f730idq)">
                          <path stroke="url(#f730idg)" strokeLinecap="round" d="M14.597 7.672c.386-.156 1.338-.325 2.063.25c.906.719.78 1.75.656 2.406c-.1.525-.396 3.854-.656 5.406" />
                        </g>
                        <g filter="url(#f730idr)">
                          <path stroke="url(#f730idh)" strokeLinecap="round" d="M14.316 17.266c-.313.387-1.47.962-2.194.387c-.907-.718-.782-1.75-.657-2.406c.1-.525.396-2.148.657-3.7" />
                        </g>
                        <g filter="url(#f730ids)">
                          <ellipse cx="26.753" cy="19.711" fill="url(#f730idi)" rx=".703" ry=".461" transform="rotate(-12.626 26.753 19.71)" />
                        </g>
                        <g filter="url(#f730idt)">
                          <ellipse cx="24.535" cy="23.992" fill="url(#f730idj)" rx=".703" ry=".461" transform="rotate(-12.626 24.535 23.992)" />
                        </g>
                        <defs>
                          <linearGradient id="f730id0" x1="6.812" x2="4.094" y1="23.903" y2="3.713" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ec008c" />
                            <stop offset="1" stopColor="#e81123" />
                          </linearGradient>
                          <linearGradient id="f730id1" x1="3.816" x2=".024" y1="14.359" y2="12.359" gradientUnits="userSpaceOnUse">
                            <stop offset=".151" stopColor="#a11749" stopOpacity="0" />
                            <stop offset=".895" stopColor="#a21749" />
                          </linearGradient>
                          <linearGradient id="f730id2" x1="5.941" x2="4.941" y1="11.797" y2="18.828" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#db1136" />
                            <stop offset="1" stopColor="#db1136" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="f730id3" x1="4.878" x2="3.3" y1="16.891" y2="16.672" gradientUnits="userSpaceOnUse">
                            <stop offset=".151" stopColor="#a11749" stopOpacity="0" />
                            <stop offset=".895" stopColor="#a21749" />
                          </linearGradient>
                          <linearGradient id="f730id4" x1="14.495" x2="13.984" y1="23.228" y2="6.484" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ec008c" />
                            <stop offset="1" stopColor="#e81123" />
                          </linearGradient>
                          <linearGradient id="f730id5" x1="11.152" x2="7.666" y1="11.823" y2="8.102" gradientUnits="userSpaceOnUse">
                            <stop offset=".151" stopColor="#a11749" stopOpacity="0" />
                            <stop offset=".895" stopColor="#a21749" />
                          </linearGradient>
                          <linearGradient id="f730id6" x1="15.566" x2="18.941" y1="16.797" y2="20.047" gradientUnits="userSpaceOnUse">
                            <stop offset=".151" stopColor="#a11749" stopOpacity="0" />
                            <stop offset=".895" stopColor="#a21749" />
                          </linearGradient>
                          <linearGradient id="f730id7" x1="25.296" x2="24.784" y1="20.916" y2="4.172" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ec008c" />
                            <stop offset="1" stopColor="#e81123" />
                          </linearGradient>
                          <linearGradient id="f730id8" x1="21.952" x2="18.467" y1="9.51" y2="5.789" gradientUnits="userSpaceOnUse">
                            <stop offset=".151" stopColor="#a11749" stopOpacity="0" />
                            <stop offset=".895" stopColor="#a21749" />
                          </linearGradient>
                          <linearGradient id="f730id9" x1="26.366" x2="29.741" y1="14.484" y2="17.734" gradientUnits="userSpaceOnUse">
                            <stop offset=".151" stopColor="#a11749" stopOpacity="0" />
                            <stop offset=".895" stopColor="#a21749" />
                          </linearGradient>
                          <linearGradient id="f730ida" x1="28.366" x2="28.491" y1="2.422" y2="16.141" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ff6579" stopOpacity="0" />
                            <stop offset=".367" stopColor="#ff6579" />
                            <stop offset="1" stopColor="#ff596f" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="f730idb" x1="22.016" x2="21.891" y1="18.528" y2="4.81" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ff6579" stopOpacity="0" />
                            <stop offset=".367" stopColor="#ff6579" />
                            <stop offset="1" stopColor="#ff596f" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="f730idc" x1="18.316" x2="17.628" y1="22.797" y2="19.172" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ec008c" />
                            <stop offset=".828" stopColor="#e81123" />
                          </linearGradient>
                          <linearGradient id="f730idd" x1="17.753" x2="16.517" y1="26.297" y2="21.505" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ec008c" />
                            <stop offset=".668" stopColor="#e81123" />
                          </linearGradient>
                          <linearGradient id="f730ide" x1="7.785" x2="5.378" y1="12.172" y2="28.109" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ff6579" />
                            <stop offset="1" stopColor="#ff596f" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="f730idf" x1="6.19" x2="6.105" y1="11.225" y2="14.64" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ff47b4" stopOpacity="0" />
                            <stop offset="1" stopColor="#ff47b4" />
                          </linearGradient>
                          <linearGradient id="f730idg" x1="17.566" x2="17.691" y1="4.734" y2="18.453" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ff6579" stopOpacity="0" />
                            <stop offset=".367" stopColor="#ff6579" />
                            <stop offset="1" stopColor="#ff596f" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="f730idh" x1="11.215" x2="11.09" y1="20.841" y2="7.122" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ff6579" stopOpacity="0" />
                            <stop offset=".367" stopColor="#ff6579" />
                            <stop offset="1" stopColor="#ff596f" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="f730idi" x1="27.607" x2="25.689" y1="19.902" y2="19.961" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ff5e84" />
                            <stop offset="1" stopColor="#ff698d" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="f730idj" x1="25.388" x2="23.47" y1="24.183" y2="24.242" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ff5e84" />
                            <stop offset="1" stopColor="#ff698d" stopOpacity="0" />
                          </linearGradient>
                          <filter id="f730idk" width="3.578" height="10.734" x="3.41" y="11.563" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feGaussianBlur result="effect1_foregroundBlur_7137_6158" stdDeviation=".125" />
                          </filter>
                          <filter id="f730idl" width="5.806" height="11.213" x="23.897" y="3.709" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feGaussianBlur result="effect1_foregroundBlur_7137_6158" stdDeviation=".5" />
                          </filter>
                          <filter id="f730idm" width="5.937" height="9.35" x="20.679" y="7.734" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feGaussianBlur result="effect1_foregroundBlur_7137_6158" stdDeviation=".5" />
                          </filter>
                          <filter id="f730idn" width="3.563" height="3.563" x="5.55" y="7.563" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feGaussianBlur result="effect1_foregroundBlur_7137_6158" stdDeviation=".5" />
                          </filter>
                          <filter id="f730ido" width="4.281" height="13.781" x="4.41" y="9.109" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feGaussianBlur result="effect1_foregroundBlur_7137_6158" stdDeviation=".5" />
                          </filter>
                          <filter id="f730idp" width="4.688" height="5.063" x="2.285" y="9.496" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feGaussianBlur result="effect1_foregroundBlur_7137_6158" stdDeviation=".5" />
                          </filter>
                          <filter id="f730idq" width="5.806" height="11.213" x="13.097" y="6.022" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feGaussianBlur result="effect1_foregroundBlur_7137_6158" stdDeviation=".5" />
                          </filter>
                          <filter id="f730idr" width="5.937" height="9.35" x="9.879" y="10.047" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feGaussianBlur result="effect1_foregroundBlur_7137_6158" stdDeviation=".5" />
                          </filter>
                          <filter id="f730ids" width="1.987" height="1.551" x="25.76" y="18.935" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feGaussianBlur result="effect1_foregroundBlur_7137_6158" stdDeviation=".15" />
                          </filter>
                          <filter id="f730idt" width="1.987" height="1.551" x="23.541" y="23.217" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feGaussianBlur result="effect1_foregroundBlur_7137_6158" stdDeviation=".15" />
                          </filter>
                          <radialGradient id="f730idu" cx="0" cy="0" r="1" gradientTransform="rotate(-172.166 7.451 6.232)scale(1.74657 4.54588)" gradientUnits="userSpaceOnUse">
                            <stop offset=".417" stopColor="#b50a47" />
                            <stop offset="1" stopColor="#ce0d52" stopOpacity="0" />
                          </radialGradient>
                          <radialGradient id="f730idv" cx="0" cy="0" r="1" gradientTransform="rotate(-172.166 12.772 4.706)scale(1.74657 4.54588)" gradientUnits="userSpaceOnUse">
                            <stop offset=".417" stopColor="#b50a47" />
                            <stop offset="1" stopColor="#ce0d52" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                      </g>
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-sm">Solve-to-earn</div>
                    <div className="font-normal text-xs text-gray-500 mt-1">Welcome to solve-to-earn <br />on Telegram.</div>
                  </div>
                </div>
                <div>
                  <button id="solvetoearnbutton" onClick={() => goToSolveToEarn()} disabled={remainingSolveToEarn == 0}
                    className=
                    {remainingSolveToEarn > 0 ?
                      "font-medium w-24 h-9 text-xs bg-white text-black rounded-full"
                      : "font-medium w-24 opacity-30 h-9 text-xs bg-white text-black rounded-full"
                    }>Solve (<div className="inline-flex items-center align-middle"><svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" className="mr-0.5" viewBox="0 0 32 32">
                      <g fill="none">
                        <g filter="url(#f1543id9)">
                          <path fill="url(#f1543id0)" d="m6.118 26.455l5.047-5.047l3.21 3.211a1.286 1.286 0 0 1-1.039 2.19l-1.08-.11a.87.87 0 0 0-.954.931l.084 1.072a1.214 1.214 0 0 1-2.069.952z" />
                        </g>
                        <g filter="url(#f1543ida)">
                          <path fill="url(#f1543id1)" d="m16.397 12.172l3.407 3.406L6.865 28.516a2.409 2.409 0 0 1-3.406-3.407z" />
                        </g>
                        <g filter="url(#f1543idb)">
                          <path fill="url(#f1543id2)" fillRule="evenodd" d="M21.882 18a7.969 7.969 0 1 0 0-15.937a7.969 7.969 0 0 0 0 15.937m0-4a3.969 3.969 0 1 0 0-7.937a3.969 3.969 0 0 0 0 7.937" clipRule="evenodd" />
                        </g>
                        <rect width="6.165" height="1.528" x="13.28" y="14.242" fill="url(#f1543id3)" rx=".764" transform="rotate(45 13.28 14.242)" />
                        <rect width="6.165" height="1.528" x="13.28" y="14.242" fill="url(#f1543idd)" rx=".764" transform="rotate(45 13.28 14.242)" />
                        <rect width="6.165" height="1.528" x="13.28" y="14.242" fill="url(#f1543id4)" rx=".764" transform="rotate(45 13.28 14.242)" />
                        <rect width="6.165" height="1.528" x="14.361" y="13.162" fill="url(#f1543id5)" rx=".764" transform="rotate(45 14.36 13.162)" />
                        <rect width="6.165" height="1.528" x="14.361" y="13.162" fill="url(#f1543ide)" rx=".764" transform="rotate(45 14.36 13.162)" />
                        <rect width="6.165" height="1.528" x="14.361" y="13.162" fill="url(#f1543id6)" rx=".764" transform="rotate(45 14.36 13.162)" />
                        <g filter="url(#f1543idc)">
                          <circle cx="22.309" cy="9.604" r="6.309" stroke="url(#f1543id7)" strokeWidth="1.25" />
                          <circle cx="22.309" cy="9.604" r="6.309" stroke="url(#f1543id8)" strokeWidth="1.25" />
                        </g>
                        <defs>
                          <linearGradient id="f1543id0" x1="11.632" x2="9.632" y1="27.875" y2="25.709" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#f4b954" />
                            <stop offset=".908" stopColor="#eca84f" />
                          </linearGradient>
                          <linearGradient id="f1543id1" x1="8.038" x2="11.279" y1="21.031" y2="24.188" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#f7c250" />
                            <stop offset="1" stopColor="#f8ab54" />
                          </linearGradient>
                          <linearGradient id="f1543id2" x1="21.882" x2="21.882" y1="2.813" y2="18" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#f8cf4d" />
                            <stop offset="1" stopColor="#ed9953" />
                          </linearGradient>
                          <linearGradient id="f1543id3" x1="14.087" x2="18.329" y1="15.107" y2="15.152" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#f6bf4e" />
                            <stop offset="1" stopColor="#ea994d" />
                          </linearGradient>
                          <linearGradient id="f1543id4" x1="16.683" x2="16.678" y1="15.98" y2="15.322" gradientUnits="userSpaceOnUse">
                            <stop offset=".186" stopColor="#e29226" />
                            <stop offset="1" stopColor="#ec9b4f" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="f1543id5" x1="15.167" x2="19.41" y1="14.027" y2="14.071" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#f6bf4e" />
                            <stop offset="1" stopColor="#ea994d" />
                          </linearGradient>
                          <linearGradient id="f1543id6" x1="17.764" x2="17.759" y1="14.9" y2="14.241" gradientUnits="userSpaceOnUse">
                            <stop offset=".186" stopColor="#e29226" />
                            <stop offset="1" stopColor="#e29226" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="f1543id7" x1="27.32" x2="21.468" y1="4.298" y2="9.259" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ffdd67" />
                            <stop offset="1" stopColor="#ffdd67" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="f1543id8" x1="17.632" x2="19.007" y1="14" y2="11.813" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#feb765" />
                            <stop offset="1" stopColor="#feb765" stopOpacity="0" />
                          </linearGradient>
                          <filter id="f1543id9" width="8.635" height="8.752" x="6.118" y="21.258" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                            <feOffset dy="-.15" />
                            <feGaussianBlur stdDeviation=".25" />
                            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                            <feColorMatrix values="0 0 0 0 0.839216 0 0 0 0 0.592157 0 0 0 0 0.34902 0 0 0 1 0" />
                            <feBlend in2="shape" result="effect1_innerShadow_18_23735" />
                          </filter>
                          <filter id="f1543ida" width="17.049" height="17.549" x="2.754" y="11.672" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                            <feOffset dy="-.5" />
                            <feGaussianBlur stdDeviation=".75" />
                            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                            <feColorMatrix values="0 0 0 0 0.85098 0 0 0 0 0.541176 0 0 0 0 0.34902 0 0 0 1 0" />
                            <feBlend in2="shape" result="effect1_innerShadow_18_23735" />
                          </filter>
                          <filter id="f1543idb" width="15.938" height="16.337" x="13.913" y="1.663" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                            <feOffset dy="-.4" />
                            <feGaussianBlur stdDeviation=".5" />
                            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                            <feColorMatrix values="0 0 0 0 0.815686 0 0 0 0 0.505882 0 0 0 0 0.337255 0 0 0 1 0" />
                            <feBlend in2="shape" result="effect1_innerShadow_18_23735" />
                          </filter>
                          <filter id="f1543idc" width="16.368" height="16.368" x="14.125" y="1.42" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                            <feFlood floodOpacity="0" result="BackgroundImageFix" />
                            <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                            <feGaussianBlur result="effect1_foregroundBlur_18_23735" stdDeviation=".625" />
                          </filter>
                          <radialGradient id="f1543idd" cx="0" cy="0" r="1" gradientTransform="matrix(-.01573 .32677 -1.89283 -.09112 16.743 14.626)" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#fcbc66" />
                            <stop offset="1" stopColor="#fcbc66" stopOpacity="0" />
                          </radialGradient>
                          <radialGradient id="f1543ide" cx="0" cy="0" r="1" gradientTransform="matrix(-.01573 .32677 -1.89283 -.09112 17.823 13.545)" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#fbb865" />
                            <stop offset="1" stopColor="#fbb865" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                      </g>
                    </svg> {solvetoearnRemaining})</div></button>
                </div>
              </div>
              {/*user completed tasks and limited task duration cards*/}
              <div className="space-x-3 flex">
                {/*card 1*/}
                <div className="flex-1 bg-[#202020] p-4 rounded-2xl mt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24">
                          <path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.474 17.306c3.013-3.224 5.922-5.411 9.576-8.508c1.094-.927 1.263-2.552.405-3.703c-.912-1.224-2.645-1.469-3.817-.496c-3.347 2.776-5.951 5.45-8.421 8.306c-.13.15-.195.225-.262.267a.52.52 0 0 1-.555.003c-.068-.041-.133-.115-.263-.262l-1.316-1.49a2.748 2.748 0 0 0-4.358.304a2.79 2.79 0 0 0 .253 3.406l2.064 2.29C6.323 19.135 7.095 19.992 8.022 20c.926.008 1.768-.892 3.452-2.694" color="#fff" />
                        </svg>
                      </div>
                      <div className="font-medium">
                        <div className="text-sm whitespace-nowrap">Completed</div>
                        <div className="text-sm animate-gradient-text">{completedTasks}</div>
                      </div>
                    </div>
                  </div>
                </div>
                {/*card 2*/}
                <div className="flex-1 bg-[#202020] p-4 rounded-2xl mt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="2.5em" height="2.5em" viewBox="0 0 32 32">
                          <g fill="none">
                            <path fill="url(#f448id5)" d="M30 16c0 7.732-6.268 14-14 14S2 23.732 2 16S8.268 2 16 2s14 6.268 14 14" />
                            <g filter="url(#f448id9)">
                              <path fill="#c1bec4" d="M15.029 8.016a1 1 0 0 1 1 1v6.274A1.988 1.988 0 0 1 15.03 19a1.99 1.99 0 0 1-1.738-2.956l-2.143-3.712a1 1 0 1 1 1.732-1l1.147 1.986V9.016a1 1 0 0 1 1-1" />
                            </g>
                            <g filter="url(#f448ida)">
                              <path fill="url(#f448id0)" fillRule="evenodd" d="M16 27c6.075 0 11-4.925 11-11S22.075 5 16 5S5 9.925 5 16s4.925 11 11 11m0 3c7.732 0 14-6.268 14-14S23.732 2 16 2S2 8.268 2 16s6.268 14 14 14" clipRule="evenodd" />
                            </g>
                            <g filter="url(#f448idb)">
                              <path fill="url(#f448id1)" fillRule="evenodd" d="M16.029 7.016a1 1 0 0 1 1 1v7.995a1 1 0 0 1-2 0V8.016a1 1 0 0 1 1-1" clipRule="evenodd" />
                            </g>
                            <path fill="url(#f448id2)" fillRule="evenodd" d="M12.516 9.966a1 1 0 0 1 1.366.366l2.984 5.168a1 1 0 1 1-1.732 1l-2.984-5.168a1 1 0 0 1 .366-1.366" clipRule="evenodd" />
                            <path fill="url(#f448id3)" fillRule="evenodd" d="M12.516 9.966a1 1 0 0 1 1.366.366l2.984 5.168a1 1 0 1 1-1.732 1l-2.984-5.168a1 1 0 0 1 .366-1.366" clipRule="evenodd" />
                            <path fill="url(#f448id6)" fillRule="evenodd" d="M12.516 9.966a1 1 0 0 1 1.366.366l2.984 5.168a1 1 0 1 1-1.732 1l-2.984-5.168a1 1 0 0 1 .366-1.366" clipRule="evenodd" />
                            <path fill="url(#f448id4)" fillRule="evenodd" d="M12.516 9.966a1 1 0 0 1 1.366.366l2.984 5.168a1 1 0 1 1-1.732 1l-2.984-5.168a1 1 0 0 1 .366-1.366" clipRule="evenodd" />
                            <circle cx="16.031" cy="16.011" r="1.989" fill="url(#f448id7)" />
                            <circle cx="16.031" cy="16.011" r="1.989" fill="url(#f448id8)" />
                            <defs>
                              <linearGradient id="f448id0" x1="24.511" x2="4.284" y1="4.013" y2="28.534" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#6d6b70" />
                                <stop offset="1" stopColor="#706c74" />
                              </linearGradient>
                              <linearGradient id="f448id1" x1="16.029" x2="16.029" y1="7.016" y2="17.011" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#f83f4c" />
                                <stop offset="1" stopColor="#f74093" />
                              </linearGradient>
                              <linearGradient id="f448id2" x1="12.516" x2="15.422" y1="9.966" y2="14.999" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#32183d" />
                                <stop offset="1" stopColor="#2c3a65" />
                              </linearGradient>
                              <linearGradient id="f448id3" x1="13.165" x2="14.031" y1="13.09" y2="12.59" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#2e2840" />
                                <stop offset="1" stopColor="#2e2840" stopOpacity="0" />
                              </linearGradient>
                              <linearGradient id="f448id4" x1="12.516" x2="12.875" y1="9.966" y2="10.588" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#3e1846" />
                                <stop offset="1" stopColor="#3e1846" stopOpacity="0" />
                              </linearGradient>
                              <radialGradient id="f448id5" cx="0" cy="0" r="1" gradientTransform="rotate(-46.212 33.496 1.03)scale(25.2966)" gradientUnits="userSpaceOnUse">
                                <stop offset=".598" stopColor="#dddadf" />
                                <stop offset="1" stopColor="#bdbabf" />
                              </radialGradient>
                              <radialGradient id="f448id6" cx="0" cy="0" r="1" gradientTransform="matrix(2.86513 4.96255 -.70605 .40764 13.24 10.001)" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#50375f" />
                                <stop offset="1" stopColor="#50375f" stopOpacity="0" />
                              </radialGradient>
                              <radialGradient id="f448id7" cx="0" cy="0" r="1" gradientTransform="rotate(134.039 5.258 11.405)scale(3.40442)" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#c9c6cc" />
                                <stop offset="1" stopColor="#928e95" />
                              </radialGradient>
                              <radialGradient id="f448id8" cx="0" cy="0" r="1" gradientTransform="rotate(139.399 5.43 10.822)scale(2.88111)" gradientUnits="userSpaceOnUse">
                                <stop offset=".527" stopColor="#776f7f" stopOpacity="0" />
                                <stop offset="1" stopColor="#776f7f" />
                              </radialGradient>
                              <filter id="f448id9" width="9.004" height="13.984" x="9.516" y="6.516" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                <feGaussianBlur result="effect1_foregroundBlur_18_13621" stdDeviation=".75" />
                              </filter>
                              <filter id="f448ida" width="28.8" height="28.8" x="1.6" y="1.6" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                                <feOffset dx=".4" dy="-.4" />
                                <feGaussianBlur stdDeviation=".3" />
                                <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                                <feColorMatrix values="0 0 0 0 0.282353 0 0 0 0 0.254902 0 0 0 0 0.313726 0 0 0 1 0" />
                                <feBlend in2="shape" result="effect1_innerShadow_18_13621" />
                                <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                                <feOffset dx="-.4" dy=".4" />
                                <feGaussianBlur stdDeviation=".3" />
                                <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                                <feColorMatrix values="0 0 0 0 0.533333 0 0 0 0 0.533333 0 0 0 0 0.533333 0 0 0 1 0" />
                                <feBlend in2="effect1_innerShadow_18_13621" result="effect2_innerShadow_18_13621" />
                              </filter>
                              <filter id="f448idb" width="2.6" height="9.995" x="15.029" y="7.016" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                                <feOffset dx=".6" />
                                <feGaussianBlur stdDeviation=".425" />
                                <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                                <feColorMatrix values="0 0 0 0 0.635294 0 0 0 0 0.227451 0 0 0 0 0.403922 0 0 0 1 0" />
                                <feBlend in2="shape" result="effect1_innerShadow_18_13621" />
                              </filter>
                            </defs>
                          </g>
                        </svg>
                      </div>
                      <div className="font-medium">
                        <div className="text-sm whitespace-nowrap">Limited duration</div>
                        <div className="text-sm animate-gradient-text">
                          <TaskTimer timestamp={limitedTimestamp} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="font-semibold mt-8 text-lg">Tasks</div>
            </div>
            {/*task navigation*/}
            <div className="flex w-full flex-col items-center justify-center px-4 py-4 gap-0 md:flex-row">
              <div className="inline-flex h-9 w-full items-baseline justify-start bg-[#202020] p-1 rounded-lg sm:w-auto">
                {[limitedTXT, ingameTXT, ParnersTXT].map((tab) => (
                  <button
                    key={tab}
                    className={`group inline-flex items-center justify-center whitespace-nowrap py-2 align-middle font-semibold transition-all duration-300 ease-in-out disabled:cursor-not-allowed
                  min-w-[32px] gap-1.5 text-xs h-7 w-full rounded-lg
                    px-3 drop-shadow sm:w-auto ${activeTab === tab ? "text-black bg-white" : "text-white"
                      } rounded-lg`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab} {" "}{/* Boşluk nasıl bırakılıyor bilemedim */}
                    {tab === limitedTXT && limitedTasks.filter(task => !task.completed).length >= 1
                      ? <div className="w-4 h-4 flex items-center justify-center rounded-full bg-[#808080]">{limitedTasks.filter(task => !task.completed).length}</div>
                      : tab === ingameTXT && ingameTasks.filter(task => !task.completed).length >= 1
                        ? <div className="w-4 h-4 flex items-center justify-center rounded-full bg-[#808080]">{ingameTasks.filter(task => !task.completed).length}</div>
                        : tab === ParnersTXT && partnersTasks.filter(task => !task.completed).length >= 1
                          ? <div className="w-4 h-4 flex items-center justify-center rounded-full bg-[#808080]">{partnersTasks.filter(task => !task.completed).length}</div>
                          : null
                    }
                  </button>
                ))}
              </div>

            </div>
            {/* Tasks */}

            {loading ? (
              <div className="flex justify-center items-center">
                <Loader />
              </div>
            ) : (
              taskS.length > 0 ? (


                taskS.map((task) => (
                  <div
                    key={task.id}
                  >
                    <div className="flex items-center px-4 py-2">
                      {/*Left Section */}
                      <div className="pr-4 pb-3">
                        {/*Icon*/}
                        <div>
                          {task.platform}
                        </div>
                      </div>
                      {/*Text*/}
                      <div className="flex flex-1 items-center border-b-[1px] border-[#222622] justify-between pr-2 pb-3">
                        <div>
                          <div className="text-white font-normal text-sm">{task.description}</div>
                          <div className="text-gray-400 font-normal text-sm">+{task.quant} QNTM</div>
                        </div>
                        {/*Right Section */}
                        <div>
                          <button id={task.id} onClick={() => handleJoinTask(task)} disabled={(activeTaskId !== null && activeTaskId != task.id) || (task.completed)}
                            className={
                              task.whichPlatform === "userMilestone" ? (
                                totalUsers && totalUsers >= 1000 ?
                                  (task.buttonText === "Claim" ? "bg-orange-500 text-white w-16 h-10 text-sm font-medium rounded-full"
                                    : task.buttonText === "Check" ? "bg-white font-medium text-black h-10 w-16 text-sm rounded-full"
                                      : task.buttonText === "Joined" ? "bg-black font-medium text-black w-16 h-10 text-sm flex items-center justify-center rounded-full"
                                        : "bg-white font-medium text-black h-10 w-16 text-sm rounded-full")
                                  : "bg-white text-black opacity-30 w-16 h-10 text-sm font-medium rounded-full"
                              ) :
                                (task.buttonText === "Claim"
                                  ? "bg-orange-500 text-white w-16 h-10 text-sm font-medium rounded-full" /*Claim */
                                  : task.buttonText === "Joined"
                                    ? "bg-black font-medium text-black w-16 h-10 text-sm flex items-center justify-center rounded-full" /*Joined */
                                    : "bg-white font-medium text-black h-10 w-16 text-sm rounded-full" /*Join */
                                )

                            }
                          >
                            {task.buttonText === "Joined" ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 16 16">
                                <path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m2.75 8.75l3.5 3.5l7-7.5" />
                              </svg>
                            ) : (
                              task.buttonText
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (<div className="flex justify-center items-center">No tasks available</div>)
            )}
          </motion.div>
        </AnimatePresence>) : (<div className="fixed inset-0 flex justify-center items-center"><Loader /></div>)}
    </div>

  );
};

export default EarnPageContent;
