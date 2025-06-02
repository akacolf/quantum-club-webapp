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
import Loader from "../components/MainLoader";
import { useGameContext } from "@/app/contexts/MiningContext";
import { getAuth } from "firebase/auth";
import { ButtonLoader } from "../components/ButtonLoader";
import { getAllTasks } from "./tasks";
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from "next/navigation";
import { useLeaderboardContext } from "../contexts/LeaderboardContext";
import { EarnTask } from "@/lib/interfaces";
/*const calculateRemainingTime = (timestamp:number) => {
  const now:Date = new Date();
  const targetTime:Date = new Date(timestamp);
  const diffMs = targetTime.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const seconds = String(Math.floor((diffMs / 1000) % 60)).padStart(2, "0");
  const minutes = String(Math.floor((diffMs / 1000 / 60) % 60)).padStart(2, "0");
  const hours = String(Math.floor((diffMs / 1000 / 60 / 60) % 24)).padStart(2, "0");
  return ` ${hours}:${minutes}:${seconds}`;
};*/

const EarnPageContent = () => {
  const [taskS, setTasks] = useState<EarnTask[]>([]);
  const [loading, setLoading] = useState(true);
  const limitedTXT = 'Limited';
  const ingameTXT = 'In-app';
  const ParnersTXT = 'Partners';
  const [activeTab, setActiveTab] = useState(limitedTXT);
  const [limitedTasks, setLimitedTasks] = useState<EarnTask[]>([]);
  const [ingameTasks, setInGameTasks] = useState<EarnTask[]>([]);
  const [partnersTasks, setPartnersTasks] = useState<EarnTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState(0);
  //const [limitedTimestamp, setLimitedstamp] = useState(0)
  const claimTEXT = 'Claim';
  const { telegramId, SetMainQuantAmount, /*remainingSolveToEarn, setRemainingSolveToEarn*/ } = useGameContext();
  const { totalUsers } = useLeaderboardContext();
  const [activeTaskId, setActiveTaskId] = useState(null);
  const router = useRouter();
 
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
            //if(timestamp > 0){ setLimitedstamp(timestamp)};
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
  //const TaskTimer: React.FC<{ timestamp: number }> = ({ timestamp }) => {
    //const [remainingTime, setRemainingTime] = useState(calculateRemainingTime(timestamp));

    /*useEffect(() => {
      const interval = setInterval(() => {
        setRemainingTime(calculateRemainingTime(timestamp));
      }, 1000); // Her saniyede bir güncelle

      return () => clearInterval(interval);
    }, [timestamp]);
    return <div>{remainingTime ? remainingTime : "00:00:00"}</div>;
  };*/
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
          window.Telegram?.WebApp?.openTelegramLink(task.url);
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));

          
        }
        if (task.buttonText === claimTEXT) {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: task.buttontitle} : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Joined"} : item));
                setTasks((prevTasks) => {
                  const updatedTasks = prevTasks.map((t) =>
                    t.id === task.id ? { ...t, completed: true } : t
                  );

                  setActiveTaskId(null);
                  console.error("Task completed");
                  sessionStorage.setItem("tasks", JSON.stringify(updatedTasks));
                  setCompletedTasks(completedTasks + 1);
                  return updatedTasks;
                });
              }

            } else {
              if(task && task.url)
              {openTelegramGroup(task.url, task);
              setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
              setTimeout(() => {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: task.buttontitle} : item));
                return;
              }, 2000);}
            }
          } catch {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: task.buttontitle } : item));
            setActiveTaskId(null);
            task.completed = false;
          }
        }
      }
      if (task.whichPlatform === "checktelegramAgain") {
        if (task.buttonText === "Check") {
          try {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/>} : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: task.buttontitle} : item));
              setActiveTaskId(null);
              task.completed = false;
              throw new Error(errorData.error || 'Failed to check membership');
            }
            const data = await response.json();
            if (data.isMember) {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: claimTEXT} : item));
              return;
            } else {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: task.buttontitle} : item));
              setActiveTaskId(null);
              task.completed = false;
            }
          } catch {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: task.buttontitle} : item));
            setActiveTaskId(null);
            task.completed = false;
          }
        }
        if (task.buttonText === claimTEXT) {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Joined" } : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
          setTimeout(() => {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: claimTEXT} : item));
            return;
          }, 2000);
        } else if (task.buttonText === claimTEXT) {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
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
            setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Joined" } : item));
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            task.completed = true;
            setActiveTaskId(null);
            setCompletedTasks(completedTasks + 1);
            console.error("The task has been created and completed successfully.");
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
          setTimeout(() => {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: claimTEXT} : item));
            return;
          }, 2000);
        } else if (task.buttonText === claimTEXT) {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Joined" } : item));
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
        setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Joined"} : item));
            setCompletedTasks(completedTasks + 1);
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            task.completed = true;
            setActiveTaskId(null);
          } else {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Check"} : item));

          }
        } else {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Check"} : item));
        }
      }
      if (task.whichPlatform === "referrals10") {
        setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader /> } : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Joined" } : item));
            setCompletedTasks(completedTasks + 1);
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            task.completed = true;
            setActiveTaskId(null);
          } else {
        setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Check" } : item));

          }
        } else {
        setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Check" } : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
            setTimeout(() => {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: claimTEXT} : item));
              return;
            }, 2000);
            return;
          } else {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: task.buttontitle} : item));
            return;
          }
        }
        if (task.buttonText === claimTEXT) {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Joined" } : item));
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            setCompletedTasks(completedTasks + 1);
            task.completed = true;
            setActiveTaskId(null);
            console.error("The task has been successfully created and completed.");
          } else {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Joined" } : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: claimTEXT} : item));
              return;
            } else {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: task.buttontitle} : item));
            }
          } else {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: task.buttontitle} : item));
          }

        } else if (task.buttonText === claimTEXT) {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Joined" } : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
          console.error(telegramId)
          const valueRef = doc(dbfs, `user/${telegramId}/miningData/values`);
          const snapshotWallet = await getDoc(valueRef);
          if (snapshotWallet.exists()) {
            const valueData = snapshotWallet.data()
            const remainingSolveToEarnDB = valueData.remainingSolveToEarn
            if (remainingSolveToEarnDB < 7) {
              setTimeout(() => {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: claimTEXT} : item));
                return;
              }, 1000);

            } else {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: task.buttontitle} : item));
            }
          } else {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: task.buttontitle} : item));
          }

        } else if (task.buttonText === claimTEXT) {
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: <ButtonLoader/> } : item));
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
          setTasks(items => items.map(item => item.id === task.id ? { ...item, buttonText: "Joined" } : item));
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
    if(tg){completeTask(task);}
   

  };
  /*async function goToSolveToEarn() {
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
  };*/
  return (

    <div className="overflow-auto">
      {!loading ?
        (<AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/*top section card */}
            <div className="p-4">
              <div className="text-3xl font-bold">Earn</div>
            </div>
            {/*task navigation*/}
            <div className="flex w-full flex-col items-center justify-center p-4 gap-0 md:flex-row">
              <div className="inline-flex h-9 w-full items-baseline justify-start bg-base-200 p-1 rounded-lg sm:w-auto">
                {[limitedTXT, ingameTXT, ParnersTXT].map((tab) => (
                  <button
                    key={tab}
                    className={`group cursor-pointer inline-flex items-center justify-center whitespace-nowrap py-2 align-middle font-semibold transition-all duration-300 ease-in-out disabled:cursor-not-allowed
                  min-w-[32px] gap-1.5 text-xs h-7 w-full rounded-lg
                    px-3 drop-shadow sm:w-auto ${activeTab === tab ? "text-black bg-white" : "text-white"
                      } rounded-lg`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab} {" "}{/*  */}
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
