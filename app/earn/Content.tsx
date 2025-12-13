"use client";
import React, { useEffect, useState } from "react";
import { dbfs } from "@/app/(firebase)/client";
import {
  updateDoc,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import Loader from "../(components)/Loader";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import { getAuth } from "firebase/auth";
import { ButtonLoader } from "../(components)/ButtonLoader";
import { getAllTasks } from "./tasks";
import { useRouter } from "next/navigation";
import { useLeaderboardContext } from "../(contexts)/LeaderboardContext";
import { EarnTask } from "@/lib/interfaces";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EarnContent = () => {
  const [tasks, setTasks] = useState<EarnTask[]>([]);
  const [loading, setLoading] = useState(true);
  const limitedTXT = "Limited";
  const ingameTXT = "In-app";
  const ParnersTXT = "Partners";
  const [completedTasks, setCompletedTasks] = useState(0);
  //const [limitedTimestamp, setLimitedstamp] = useState(0)
  const claimTEXT = "Claim";
  const {
    telegramId,
    SetMainQuantAmount /*remainingSolveToEarn, setRemainingSolveToEarn*/,
  } = useGameContext();
  const { totalUsers } = useLeaderboardContext();
  const [activeTaskId, setActiveTaskId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const totalCompletedCheck = async () => {
      const totalCompleted = collection(dbfs, `user/${telegramId}/tasks`);
      const snapshotTotalCompleted = await getDocs(totalCompleted);
      if (!snapshotTotalCompleted.empty) {
        setCompletedTasks(snapshotTotalCompleted.size);
      } else {
        setCompletedTasks(0);
      }
    };
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
        const tasksList: EarnTask[] = (
          await Promise.all(
            getAllTasks().map(async (task) => {
              const whichPlatform = task.whichPlatform;
              let description: string | React.ReactNode;
              if (whichPlatform == "userMilestone") {
                description = (
                  <div>
                    Road to 1K - <span>{totalUsers} / 1000</span>
                  </div>
                );
              } else {
                description = task.description;
              }
              const quantRef = doc(dbfs, `tasks/${task.id}`);
              const quantSnapshot = await getDoc(quantRef);
              const quant = quantSnapshot.data()?.quantReward
                ? quantSnapshot.data()?.quantReward
                : 0;
              const timestamp = quantSnapshot.data()?.timestamp
                ? quantSnapshot.data()?.timestamp
                : 0;
              const platform = task.platform;
              const category = task.category;
              const buttontitle = task.buttontitle;
              const url = task.url;
              const taskRef = doc(dbfs, `user/${telegramId}/tasks/${task.id}`);
              const taskSnapshot = await getDoc(taskRef);
              const completed =
                taskSnapshot.exists() && taskSnapshot.data().completed;
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
          )
        ).filter((task): task is EarnTask => task !== null);

        sessionStorage.setItem("tasks", JSON.stringify(tasksList));

        // Tüm task'ları state'e kaydet
        setTasks(tasksList);

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
  }, [telegramId, totalUsers]);
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
  /*useEffect(() => {
    if (activeTab === limitedTXT) {
      setTasks(limitedTasks);
    } else if (activeTab === ingameTXT) {
      setTasks(ingameTasks);
    } else if (activeTab === ParnersTXT) {
      setTasks(partnersTasks);
    }
  }, [activeTab, limitedTasks, ingameTasks, partnersTasks]);*/

  // Helper function to render task list
  const renderTaskList = (tasks: EarnTask[]) => (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader />
        </div>
      ) : tasks.length > 0 ? (
        tasks.map((task) => (
          <Card
            key={task.id}
            className={`border-[#333] bg-[#1a1a1a]/60 backdrop-blur-sm transition-all duration-300 ${task.completed
              ? "opacity-60"
              : "hover:bg-[#252525] hover:border-white/10"
              }`}
          >
            <CardContent className="p-4 flex items-center gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-[#252525] flex items-center justify-center border border-[#333] shadow-inner shrink-0">
                <div className="w-8 h-8 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full text-2xl">
                  {task.platform}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm mb-1 truncate">
                  {task.description}
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 px-2 py-0 h-5 text-[10px] font-bold uppercase tracking-wider"
                  >
                    +{task.quant} QNTM
                  </Badge>
                </div>
              </div>

              {/* Action Button */}
              <Button
                id={task.id}
                onClick={() => handleJoinTask(task)}
                disabled={
                  (activeTaskId !== null && activeTaskId != task.id) ||
                  task.completed
                }
                variant={task.completed ? "secondary" : "default"}
                className={`h-9 px-4 min-w-20 rounded-full font-medium text-xs transition-all duration-300 ${task.buttonText === "Claim"
                  ? "bg-orange-500 hover:bg-orange-600 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                  : task.completed
                    ? "bg-[#333] text-gray-400 hover:bg-[#333]"
                    : "bg-white text-black hover:bg-gray-200"
                  }`}
              >
                {task.buttonText === "Joined" ? (
                  <div className="flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="1.2em"
                      height="1.2em"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="currentColor"
                        d="m9 20.42l-6.21-6.21l2.83-2.83L9 14.77l9.88-9.89l2.83 2.83z"
                      />
                    </svg>
                    <span>Done</span>
                  </div>
                ) : (
                  task.buttonText
                )}
              </Button>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4 text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 48 48">
              <g fill="currentColor">
                <path d="M14.807 23.233c-.683-.438-1.183-1.145-1.064-1.883a.5.5 0 0 1 .668-.389c1.818.675 3.846.256 5.642-1.448a.5.5 0 0 1 .818.203c.231.689.024 1.618-.48 2.382a3.8 3.8 0 0 1-2.654 1.665c-1.198.177-2.216-.073-2.93-.53m17.947 0c.683-.438 1.184-1.145 1.065-1.883a.5.5 0 0 0-.668-.389c-1.818.675-3.846.256-5.642-1.448a.5.5 0 0 0-.818.203c-.232.689-.024 1.618.48 2.382a3.8 3.8 0 0 0 2.653 1.665c1.199.177 2.216-.073 2.93-.53m-15.789 8.943c.097-.355.245-.72.431-1.005C18.664 29.225 21.151 28 23.892 28c2.646 0 5.048 1.139 6.354 2.962l.017.023a4 4 0 0 1 .278.403c.164.285.284.637.357.973a3.6 3.6 0 0 1 .076 1.123c-.038.356-.17.9-.64 1.268c-.523.41-1.15.372-1.656.195c-2.394-.782-3.53-1.12-4.648-1.126c-1.116-.006-2.277.317-4.714 1.128l-.008.003l-.008.002c-.56.176-1.222.216-1.772-.187c-.527-.386-.668-.976-.698-1.377a3.7 3.7 0 0 1 .135-1.214" />
                <path fillRule="evenodd" d="M42 24c0 9.941-8.059 18-18 18S6 33.941 6 24S14.059 6 24 6s18 8.059 18 18m-2 0c0 8.837-7.163 16-16 16S8 32.837 8 24S15.163 8 24 8s16 7.163 16 16" clipRule="evenodd" />
              </g>
            </svg>
          </div>
          <p className="text-gray-400 font-medium">No tasks available</p>
          <p className="text-gray-600 text-sm mt-1">
            Check back later for new opportunities
          </p>
        </div>
      )}
    </div>
  );

  const handleJoinTask = (task: EarnTask) => {
    completeTask(task);
  };

  const completeTask = async (task: EarnTask) => {
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
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, buttonText: <ButtonLoader /> }
                : item
            )
          );
          setTimeout(() => {
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: claimTEXT } : item
              )
            );
            return;
          }, 2000);
        }
        if (task.buttonText === claimTEXT) {
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, buttonText: <ButtonLoader /> }
                : item
            )
          );
          try {
            const response = await fetch("/api/checkmembership", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                tgIdNumerical,
                channelUsername,
              }),
            });
            if (!response.ok) {
              const errorData = await response.json();
              setTasks((items) =>
                items.map((item) =>
                  item.id === task.id
                    ? { ...item, buttonText: task.buttontitle }
                    : item
                )
              );
              setActiveTaskId(null);
              task.completed = false;
              throw new Error(errorData.error || "Failed to check membership");
            }
            const data = await response.json();
            if (data.isMember) {
              const date = new Date(Date.now());
              const formattedDate = `${date
                .getDate()
                .toString()
                .padStart(2, "0")}/${(date.getMonth() + 1)
                  .toString()
                  .padStart(2, "0")}/${date.getFullYear()}`;
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
                const quantRef = doc(dbfs, `tasks/${task.id}`);
                const quantSnapshot = await getDoc(quantRef);
                const quantVal = quantSnapshot.data()?.quantReward;
                const updatedQuantAmount =
                  Number(currentQuantAmount) + Number(quantVal);
                await updateDoc(miningData, {
                  QuantAmount: updatedQuantAmount,
                });
                const formattedAmount = updatedQuantAmount.toLocaleString(
                  "en-US",
                  {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }
                );
                if (typeof window !== "undefined") {
                  localStorage.setItem("QAmount", formattedAmount);
                }
                SetMainQuantAmount(formattedAmount);
                setTasks((items) =>
                  items.map((item) =>
                    item.id === task.id
                      ? { ...item, buttonText: "Joined" }
                      : item
                  )
                );
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
              if (task && task.url) {
                openTelegramGroup(task.url, task);
                setTasks((items) =>
                  items.map((item) =>
                    item.id === task.id
                      ? { ...item, buttonText: <ButtonLoader /> }
                      : item
                  )
                );
                setTimeout(() => {
                  setTasks((items) =>
                    items.map((item) =>
                      item.id === task.id
                        ? { ...item, buttonText: task.buttontitle }
                        : item
                    )
                  );
                  return;
                }, 2000);
              }
            }
          } catch {
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id
                  ? { ...item, buttonText: task.buttontitle }
                  : item
              )
            );
            setActiveTaskId(null);
            task.completed = false;
          }
        }
      }
      if (task.whichPlatform === "checktelegramAgain") {
        if (task.buttonText === "Check") {
          try {
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id
                  ? { ...item, buttonText: <ButtonLoader /> }
                  : item
              )
            );
            const response = await fetch("/api/checkmembership", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                tgIdNumerical,
                channelUsername,
              }),
            });
            if (!response.ok) {
              const errorData = await response.json();
              setTasks((items) =>
                items.map((item) =>
                  item.id === task.id
                    ? { ...item, buttonText: task.buttontitle }
                    : item
                )
              );
              setActiveTaskId(null);
              task.completed = false;
              throw new Error(errorData.error || "Failed to check membership");
            }
            const data = await response.json();
            if (data.isMember) {
              setTasks((items) =>
                items.map((item) =>
                  item.id === task.id
                    ? { ...item, buttonText: claimTEXT }
                    : item
                )
              );
              return;
            } else {
              setTasks((items) =>
                items.map((item) =>
                  item.id === task.id
                    ? { ...item, buttonText: task.buttontitle }
                    : item
                )
              );
              setActiveTaskId(null);
              task.completed = false;
            }
          } catch {
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id
                  ? { ...item, buttonText: task.buttontitle }
                  : item
              )
            );
            setActiveTaskId(null);
            task.completed = false;
          }
        }
        if (task.buttonText === claimTEXT) {
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, buttonText: <ButtonLoader /> }
                : item
            )
          );
          const date = new Date(Date.now());
          const formattedDate = `${date
            .getDate()
            .toString()
            .padStart(2, "0")}/${(date.getMonth() + 1)
              .toString()
              .padStart(2, "0")}/${date.getFullYear()}`;
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
            const quantRef = doc(dbfs, `tasks/${task.id}`);
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount =
              Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: "Joined" } : item
              )
            );
            setTasks((prevTasks) => {
              const updatedTasks = prevTasks.map((t) =>
                t.id === task.id ? { ...t, completed: true } : t
              );

              setActiveTaskId(null);
              console.error("Task has been completed");
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
          if (
            task?.whichPlatform &&
            task.whichPlatform !== ("telegram" as string)
          ) {
            window.open(task.url, "_blank");
          }
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, buttonText: <ButtonLoader /> }
                : item
            )
          );
          setTimeout(() => {
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: claimTEXT } : item
              )
            );
            return;
          }, 2000);
        } else if (task.buttonText === claimTEXT) {
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, buttonText: <ButtonLoader /> }
                : item
            )
          );
          if (!taskSnapshot.exists()) {
            const date = new Date(Date.now());
            const formattedDate = `${date
              .getDate()
              .toString()
              .padStart(2, "0")}/${(date.getMonth() + 1)
                .toString()
                .padStart(2, "0")}/${date.getFullYear()}`;
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
            const quantRef = doc(dbfs, `tasks/${task.id}`);
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount =
              Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: "Joined" } : item
              )
            );
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            task.completed = true;
            setActiveTaskId(null);
            setCompletedTasks(completedTasks + 1);
            console.error(
              "The task has been created and completed successfully."
            );
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
          if (task.whichPlatform != ("telegram" as string)) {
            window.open(task.url, "_blank");
          }
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, buttonText: <ButtonLoader /> }
                : item
            )
          );
          setTimeout(() => {
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: claimTEXT } : item
              )
            );
            return;
          }, 2000);
        } else if (task.buttonText === claimTEXT) {
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, buttonText: <ButtonLoader /> }
                : item
            )
          );
          if (!taskSnapshot.exists()) {
            const date = new Date(Date.now());
            const formattedDate = `${date
              .getDate()
              .toString()
              .padStart(2, "0")}/${(date.getMonth() + 1)
                .toString()
                .padStart(2, "0")}/${date.getFullYear()}`;
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
            const quantRef = doc(dbfs, `tasks/${task.id}`);
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount =
              Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: "Joined" } : item
              )
            );
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            setCompletedTasks(completedTasks + 1);
            task.completed = true;
            setActiveTaskId(null);
            console.error(
              "The task has been successfully created and completed."
            );
          } else {
            console.error("This task has already been completed.");
          }
        }
      }
      if (task.whichPlatform === "referrals") {
        setTasks((items) =>
          items.map((item) =>
            item.id === task.id
              ? { ...item, buttonText: <ButtonLoader /> }
              : item
          )
        );
        const userReferalls = collection(dbfs, `user/${telegramId}/referrals`);
        const needRefValue = doc(dbfs, `tasks/${task.id}`);
        const snapshotNeedRefValue = await getDoc(needRefValue);
        const snapshotReferrals = await getDocs(userReferalls);
        if (snapshotNeedRefValue.exists() && !snapshotReferrals.empty) {
          const needRef = snapshotNeedRefValue.data().referralValue;
          if (snapshotReferrals.size >= needRef) {
            const date = new Date(Date.now());
            const formattedDate = `${date
              .getDate()
              .toString()
              .padStart(2, "0")}/${(date.getMonth() + 1)
                .toString()
                .padStart(2, "0")}/${date.getFullYear()}`;
            await setDoc(
              taskRef,
              {
                quant: task.quant,
                completed: true,
                Date: formattedDate,
                platform: task.whichPlatform,
              },
              { merge: true }
            );
            const miningSnapshot = await getDoc(miningData);
            const currentQuantAmount = miningSnapshot.exists()
              ? miningSnapshot.data().QuantAmount
              : 0;
            const quantRef = doc(dbfs, `tasks/${task.id}`);
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount =
              Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: "Joined" } : item
              )
            );
            setCompletedTasks(completedTasks + 1);
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            task.completed = true;
            setActiveTaskId(null);
          } else {
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: "Check" } : item
              )
            );
          }
        } else {
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id ? { ...item, buttonText: "Check" } : item
            )
          );
        }
      }
      if (task.whichPlatform === "referrals10") {
        setTasks((items) =>
          items.map((item) =>
            item.id === task.id
              ? { ...item, buttonText: <ButtonLoader /> }
              : item
          )
        );
        const userReferalls = collection(dbfs, `user/${telegramId}/referrals`);
        const needRefValue = doc(dbfs, `tasks/${task.id}`);
        const snapshotNeedRefValue = await getDoc(needRefValue);
        const snapshotReferrals = await getDocs(userReferalls);
        if (snapshotNeedRefValue.exists() && !snapshotReferrals.empty) {
          const needRef = snapshotNeedRefValue.data().referralValue;
          if (snapshotReferrals.size >= needRef) {
            const date = new Date(Date.now());
            const formattedDate = `${date
              .getDate()
              .toString()
              .padStart(2, "0")}/${(date.getMonth() + 1)
                .toString()
                .padStart(2, "0")}/${date.getFullYear()}`;
            await setDoc(
              taskRef,
              {
                quant: task.quant,
                completed: true,
                Date: formattedDate,
                platform: task.whichPlatform,
              },
              { merge: true }
            );
            const miningSnapshot = await getDoc(miningData);
            const currentQuantAmount = miningSnapshot.exists()
              ? miningSnapshot.data().QuantAmount
              : 0;
            const quantRef = doc(dbfs, `tasks/${task.id}`);
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount =
              Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: "Joined" } : item
              )
            );
            setCompletedTasks(completedTasks + 1);
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            task.completed = true;
            setActiveTaskId(null);
          } else {
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: "Check" } : item
              )
            );
          }
        } else {
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id ? { ...item, buttonText: "Check" } : item
            )
          );
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
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id
                  ? { ...item, buttonText: <ButtonLoader /> }
                  : item
              )
            );
            setTimeout(() => {
              setTasks((items) =>
                items.map((item) =>
                  item.id === task.id
                    ? { ...item, buttonText: claimTEXT }
                    : item
                )
              );
              return;
            }, 2000);
            return;
          } else {
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id
                  ? { ...item, buttonText: task.buttontitle }
                  : item
              )
            );
            return;
          }
        }
        if (task.buttonText === claimTEXT) {
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, buttonText: <ButtonLoader /> }
                : item
            )
          );
          if (!taskSnapshot.exists()) {
            const date = new Date(Date.now());
            const formattedDate = `${date
              .getDate()
              .toString()
              .padStart(2, "0")}/${(date.getMonth() + 1)
                .toString()
                .padStart(2, "0")}/${date.getFullYear()}`;
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
            const quantRef = doc(dbfs, `tasks/${task.id}`);
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount =
              Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: "Joined" } : item
              )
            );
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            setCompletedTasks(completedTasks + 1);
            task.completed = true;
            setActiveTaskId(null);
            console.error(
              "The task has been successfully created and completed."
            );
          } else {
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: "Joined" } : item
              )
            );
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
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, buttonText: <ButtonLoader /> }
                : item
            )
          );

          // Check for wallet from localStorage (QC Wallet)
          const savedWalletAddress = typeof window !== "undefined"
            ? localStorage.getItem("walletAddress")
            : null;

          if (savedWalletAddress && savedWalletAddress !== "") {
            // User has a wallet - show claim button
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id
                  ? { ...item, buttonText: claimTEXT }
                  : item
              )
            );
            return;
          } else {
            // User doesn't have a wallet - navigate to wallet page to create one
            router.push("/wallet");
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id
                  ? { ...item, buttonText: "Check" }
                  : item
              )
            );
            return;
          }
        } else if (task.buttonText === claimTEXT) {
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, buttonText: <ButtonLoader /> }
                : item
            )
          );
          if (!taskSnapshot.exists()) {
            const date = new Date(Date.now());
            const formattedDate = `${date
              .getDate()
              .toString()
              .padStart(2, "0")}/${(date.getMonth() + 1)
                .toString()
                .padStart(2, "0")}/${date.getFullYear()}`;
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
            const quantRef = doc(dbfs, `tasks/${task.id}`);
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount =
              Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: "Joined" } : item
              )
            );
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            setCompletedTasks(completedTasks + 1);
            task.completed = true;
            setActiveTaskId(null);
            console.error(
              "The task has been successfully created and completed."
            );
          } else {
            console.error("This task has already been completed.");
          }
        }
      }
      if (task.whichPlatform === "solvetoearnExplore") {
        if (task.buttonText === "Check") {
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, buttonText: <ButtonLoader /> }
                : item
            )
          );
          console.error(telegramId);
          const valueRef = doc(dbfs, `user/${telegramId}/miningData/values`);
          const snapshotWallet = await getDoc(valueRef);
          if (snapshotWallet.exists()) {
            const valueData = snapshotWallet.data();
            const remainingSolveToEarnDB = valueData.remainingSolveToEarn;
            if (remainingSolveToEarnDB < 7) {
              setTimeout(() => {
                setTasks((items) =>
                  items.map((item) =>
                    item.id === task.id
                      ? { ...item, buttonText: claimTEXT }
                      : item
                  )
                );
                return;
              }, 1000);
            } else {
              setTasks((items) =>
                items.map((item) =>
                  item.id === task.id
                    ? { ...item, buttonText: task.buttontitle }
                    : item
                )
              );
            }
          } else {
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id
                  ? { ...item, buttonText: task.buttontitle }
                  : item
              )
            );
          }
        } else if (task.buttonText === claimTEXT) {
          setTasks((items) =>
            items.map((item) =>
              item.id === task.id
                ? { ...item, buttonText: <ButtonLoader /> }
                : item
            )
          );
          if (!taskSnapshot.exists()) {
            const date = new Date(Date.now());
            const formattedDate = `${date
              .getDate()
              .toString()
              .padStart(2, "0")}/${(date.getMonth() + 1)
                .toString()
                .padStart(2, "0")}/${date.getFullYear()}`;
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
            const quantRef = doc(dbfs, `tasks/${task.id}`);
            const quantSnapshot = await getDoc(quantRef);
            const quantVal = quantSnapshot.data()?.quantReward;
            const updatedQuantAmount =
              Number(currentQuantAmount) + Number(quantVal);
            await updateDoc(miningData, { QuantAmount: updatedQuantAmount });
            const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", formattedAmount);
            }
            SetMainQuantAmount(formattedAmount);
            setTasks((items) =>
              items.map((item) =>
                item.id === task.id ? { ...item, buttonText: "Joined" } : item
              )
            );
            const taskElement = document.getElementById(task.id);
            if (taskElement) {
              (taskElement as HTMLButtonElement).disabled = true;
            }
            setCompletedTasks(completedTasks + 1);
            task.completed = true;
            setActiveTaskId(null);
            console.error(
              "The task has been successfully created and completed."
            );
          } else {
            console.error("This task has already been completed.");
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("The task could not be completed:", error);
      }
    }
  };

  const openTelegramGroup = (link: string, task: EarnTask) => {
    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      link = "https://" + link;
    }
    const tg = window.Telegram?.WebApp;
    if (tg) {
      completeTask(task);
    }
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
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent_50%)] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="relative z-10">
        {!loading ? (
          <>
            {/* Header */}
            <div className="p-6 pt-8">
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-gray-400">
                Earn
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Complete tasks to earn QNTM
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="px-4 mb-6">
              <Tabs
                defaultValue={limitedTXT}
                className="w-full"
              >
                <TabsList className="w-full bg-[#1a1a1a]/80 backdrop-blur-md border border-[#333] p-1 h-auto rounded-xl">
                  {[limitedTXT, ingameTXT, ParnersTXT].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="flex-1 data-[state=active]:bg-white data-[state=active]:text-black text-gray-400 py-[0.31rem] rounded-lg transition-all duration-300"
                    >
                      <div className="flex items-center justify-center gap-2">
                        {tab}
                        {tab === limitedTXT &&
                          tasks.filter((task) => task.category === limitedTXT && !task.completed).length >=
                          1 && (
                            <Badge
                              variant="secondary"
                              className="bg-red-500 text-white border-0 px-1.5 h-5 min-w-5 flex items-center justify-center"
                            >
                              {tasks.filter((task) => task.category === limitedTXT && !task.completed)
                                .length}
                            </Badge>
                          )}
                        {tab === ingameTXT &&
                          tasks.filter((task) => task.category === ingameTXT && !task.completed).length >=
                          1 && (
                            <Badge
                              variant="secondary"
                              className="bg-red-500 text-white border-0 px-1.5 h-5 min-w-5 flex items-center justify-center"
                            >
                              {tasks.filter((task) => task.category === ingameTXT && !task.completed)
                                .length}
                            </Badge>
                          )}
                        {tab === ParnersTXT &&
                          tasks.filter((task) => task.category === ParnersTXT && !task.completed).length >=
                          1 && (
                            <Badge
                              variant="secondary"
                              className="bg-red-500 text-white border-0 px-1.5 h-5 min-w-5 flex items-center justify-center"
                            >
                              {tasks.filter((task) => task.category === ParnersTXT && !task.completed)
                                .length}
                            </Badge>
                          )}
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="mt-6">
                  <TabsContent value={limitedTXT}>
                    {renderTaskList(tasks.filter((task) => task.category === limitedTXT))}
                  </TabsContent>
                  <TabsContent value={ingameTXT}>
                    {renderTaskList(tasks.filter((task) => task.category === ingameTXT))}
                  </TabsContent>
                  <TabsContent value={ParnersTXT}>
                    {renderTaskList(tasks.filter((task) => task.category === ParnersTXT))}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center h-screen">
            <Loader />
          </div>
        )}
      </div>
    </div>
  );
};

export default EarnContent;
