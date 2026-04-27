"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { dbfs } from "@/app/(firebase)/client";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { ButtonLoader } from "../(components)/ButtonLoader";
import { useRouter } from "next/navigation";
import { useLeaderboardContext } from "../(contexts)/LeaderboardContext";
import { EarnTask } from "@/lib/interfaces";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "../(contexts)/auth";
import { toast } from "sonner";
import { confirmTask, checkMembership, setEarnTaskCookie } from "./actions";
import { useEarnTasksQuery } from "@/app/(hooks)/queries/use-earn-tasks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { haptics } from "@/lib/haptics";
import { Icon } from "@iconify/react";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// -------------------------------------------------------------------
// Mutation: confirm a task on the server and update local quant balance
// -------------------------------------------------------------------
interface CompleteTaskParams {
  taskId: string;
  platform: string;
  telegramId: string;
}

interface CompleteTaskResult {
  quant: number;
  formattedAmount: string;
}

function useCompleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation<CompleteTaskResult, Error, CompleteTaskParams>({
    mutationFn: async ({ taskId, platform, telegramId }) => {
      // Read current quant balance from client cache for optimistic display
      const miningData = doc(dbfs, `user/${telegramId}/miningData/values`);
      const miningSnapshot = await getDoc(miningData);
      const currentQuantAmount = miningSnapshot.exists()
        ? miningSnapshot.data().QuantAmount
        : 0;

      const quantRef = doc(dbfs, `tasks/${taskId}`);
      const quantSnapshot = await getDoc(quantRef);
      const quantVal = quantSnapshot.data()?.quantReward ?? 0;

      const updatedQuantAmount = Number(currentQuantAmount) + Number(quantVal);

      // Server-side authoritative write
      const response = await confirmTask({ taskId, platform });
      if (response?.serverError || response?.data?.error) {
        throw new Error(
          response?.serverError ?? response?.data?.message ?? "Error completing task"
        );
      }

      const formattedAmount = updatedQuantAmount.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      return { quant: quantVal, formattedAmount };
    },
    onSuccess: (_data, { telegramId }) => {
      // Invalidate earn tasks so the list refetches with updated completion status
      queryClient.invalidateQueries({ queryKey: ["earn-tasks"] });
      // Also invalidate any user-related queries that depend on quant balance
      queryClient.invalidateQueries({ queryKey: ["user", telegramId] });
    },
  });
}

const EarnContent = () => {
  const limitedTXT = "Limited";
  const ingameTXT = "In-app";
  const ParnersTXT = "Partners";
  const claimTEXT = "Claim";
  const {
    telegramId,
    username,
    SetMainQuantAmount /*remainingSolveToEarn, setRemainingSolveToEarn*/,
  } = useUserContext();
  const { totalUsers } = useLeaderboardContext();
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [tab, setTab] = useQueryState(
    "tab",
    { ...parseAsStringLiteral(["Limited", "In-app", "Partners"] as const).withDefault("Limited"), history: "replace" as const }
  );
  const auth = useAuth();
  const router = useRouter();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const tgFirstName = mounted
    ? window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || username || "Quantum User"
    : "Quantum User";

  // Fetch tasks and completed count via TanStack Query
  const { data: earnData, isLoading: loading } = useEarnTasksQuery(telegramId, totalUsers);

  // Derive tasks and completedCount directly from query data (no redundant sync)
  const queryTasks = earnData?.tasks ?? [];
  const queryCompletedCount = earnData?.completedCount ?? 0;

  // Local overrides for optimistic UI (button text / completed status during flows)
  // Key: task.id, Value: partial override for buttonText / completed
  const [taskOverrides, setTaskOverrides] = useState<
    Record<string, Partial<Pick<EarnTask, "buttonText" | "completed">>>
  >({});

  // Merge query data with local overrides
  const tasks = queryTasks.map((task) => {
    const override = taskOverrides[task.id];
    return override ? { ...task, ...override } : task;
  });
  const getIncompleteCount = (category: string) =>
    tasks.filter((task) => task.category === category && !task.completed).length;
  const completedTasks =
    queryCompletedCount +
    Object.values(taskOverrides).filter((o) => o.completed === true).length;

  // Clear overrides when query data refreshes (server is now source of truth)
  useEffect(() => {
    if (earnData) {
      queueMicrotask(() => setTaskOverrides({}));
    }
  }, [earnData]);

  // Mutation for completing tasks
  const completeTaskMutation = useCompleteTaskMutation();

  // Helper to set button text override for a single task
  const setButtonText = useCallback(
    (taskId: string, buttonText: React.ReactNode | string) => {
      setTaskOverrides((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], buttonText },
      }));
    },
    []
  );

  // Helper to mark task completed in overrides
  const markCompleted = useCallback(
    (taskId: string) => {
      setTaskOverrides((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], buttonText: "Joined", completed: true },
      }));
    },
    []
  );

  // Hide Telegram back button on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      window?.Telegram?.WebApp.BackButton.hide();
    }
  }, []);

  // Helper function to render task list
  const renderTaskList = (tasks: EarnTask[]) => (
    <div className="space-y-3">
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <Card
            key={task.id}
            className={`bg-[#1a1a1a]/60 backdrop-blur-sm transition-all duration-300 ${task.completed
              ? "opacity-60"
              : "hover:bg-[#252525]"
              }`}
          >
            <CardContent className="p-4 flex items-center gap-4">
              {/* Icon */}
              <div className="w-10 h-10 flex items-center justify-center shrink-0 text-2xl text-neutral-400 [&_svg]:w-7 [&_svg]:h-7 [&_svg]:text-neutral-400">
                {task.platform}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm mb-1 truncate">
                  {task.description}
                </div>
                <div className="text-[11px] font-semibold text-amber-400">
                  +{task.quant} QNTM
                </div>
              </div>

              {/* Action Button */}
              <Button
                id={task.id}
                onClick={() => handleJoinTask(task)}
                disabled={
                  (activeTaskId !== null && activeTaskId != task.id) ||
                  task.completed ||
                  completeTaskMutation.isPending
                }
                variant={task.completed ? "secondary" : "default"}
                className={`h-9 px-4 min-w-20 rounded-xl font-bold text-xs transition-all duration-300 active:scale-95 ${task.buttonText === "Claim"
                    ? "bg-white text-black hover:bg-white/90 shadow-lg"
                  : task.completed
                    ? "bg-white/5 text-neutral-500 hover:bg-white/5"
                    : "bg-white text-black hover:bg-white/90"
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
          <Icon icon="healthicons:no" width="40" height="40" className="mb-4 text-neutral-600" />
          <p className="text-neutral-400 font-medium">No tasks available</p>
          <p className="text-neutral-600 text-sm mt-1">
            Check back later for new opportunities
          </p>
        </div>
      )}
    </div>
  );

  const handleJoinTask = (task: EarnTask) => {
    completeTask(task);
  };

  /**
   * Runs the confirm-task mutation and handles the shared post-success logic
   * (update local storage, set quant display, mark task completed).
   */
  const claimTask = (task: EarnTask) => {
    if (!telegramId) return;
    setButtonText(task.id, <ButtonLoader />);

    completeTaskMutation.mutate(
      { taskId: task.id, platform: task.whichPlatform, telegramId },
      {
        onSuccess: ({ formattedAmount }) => {
          if (typeof window !== "undefined") {
            localStorage.setItem(`QAmount_${telegramId}`, formattedAmount);
          }
          SetMainQuantAmount(formattedAmount);
          markCompleted(task.id);
          setActiveTaskId(null);
          haptics.success();
          toast.success("Task completed!");
        },
        onError: (error) => {
          setButtonText(task.id, task.buttontitle);
          setActiveTaskId(null);
          haptics.error();
          toast.error("Error!", { description: error.message });
        },
      }
    );
  };

  const completeTask = async (task: EarnTask) => {
    try {
      if (!telegramId) {
        return router.push("/");
      }
      const taskId = task.id;
      const taskRef = doc(dbfs, `user/${telegramId}/tasks/${taskId}`);
      const taskSnapshot = await getDoc(taskRef);
      let tgIdNumerical;
      const channelUsername = "quantumclubinc";
      router.prefetch("/earn/9CXx152NbBKOKE2");
      if (typeof window !== "undefined") {
        tgIdNumerical = window?.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      }
      const token = await auth?.currentUser?.getIdToken();
      if (!token) {
        haptics.error();
        return toast.error("Still connecting — try again in a moment");
      }
      if (task.whichPlatform === "telegram") {
        if (task.buttonText === "Join" && task.url) {
          window.Telegram?.WebApp?.openTelegramLink(task.url);
          setButtonText(task.id, <ButtonLoader />);
          setTimeout(() => {
            setButtonText(task.id, claimTEXT);
            return;
          }, 2000);
        }
        if (task.buttonText === claimTEXT) {
          setButtonText(task.id, <ButtonLoader />);
          try {
            if (!tgIdNumerical) throw new Error("Telegram user ID not available");
            const memberResult = await checkMembership({ tgIdNumerical, channelUsername });
            if (memberResult?.serverError) {
              setButtonText(task.id, task.buttontitle);
              setActiveTaskId(null);
              haptics.error();
              throw new Error(memberResult.serverError);
            }
            if (memberResult?.data?.isMember) {
              if (!taskSnapshot.exists()) {
                claimTask(task);
              }
            } else {
              if (task && task.url) {
                openTelegramGroup(task.url!);
                setButtonText(task.id, <ButtonLoader />);
                setTimeout(() => {
                  setButtonText(task.id, task.buttontitle);
                  return;
                }, 2000);
              }
            }
          } catch {
            setButtonText(task.id, task.buttontitle);
            setActiveTaskId(null);
            haptics.error();
          }
        }
      }
      if (task.whichPlatform === "checktelegramAgain") {
        if (task.buttonText === "Check") {
          try {
            setButtonText(task.id, <ButtonLoader />);
            if (!tgIdNumerical) throw new Error("Telegram user ID not available");
            const memberResult2 = await checkMembership({ tgIdNumerical, channelUsername });
            if (memberResult2?.serverError) {
              setButtonText(task.id, task.buttontitle);
              setActiveTaskId(null);
              haptics.error();
              throw new Error(memberResult2.serverError);
            }
            if (memberResult2?.data?.isMember) {
              setButtonText(task.id, claimTEXT);
              return;
            } else {
              setButtonText(task.id, task.buttontitle);
              setActiveTaskId(null);
              haptics.error();
            }
          } catch {
            setButtonText(task.id, task.buttontitle);
            setActiveTaskId(null);
            haptics.error();
          }
        }
        if (task.buttonText === claimTEXT) {
          if (!taskSnapshot.exists()) {
            claimTask(task);
          }
        }
      }
      if (task.whichPlatform === "twitter") {
        if (task.buttonText === "Follow") {
          let taskUrl = task.url ?? "";
          if (
            !taskUrl.startsWith("http://") &&
            !taskUrl.startsWith("https://")
          ) {
            taskUrl = "https://" + taskUrl;
          }
          if (
            task?.whichPlatform &&
            task.whichPlatform !== ("telegram" as string)
          ) {
            window.open(taskUrl, "_blank");
          }
          setButtonText(task.id, <ButtonLoader />);
          setTimeout(() => {
            setButtonText(task.id, claimTEXT);
            return;
          }, 2000);
        } else if (task.buttonText === claimTEXT) {
          if (!taskSnapshot.exists()) {
            claimTask(task);
          }
        }
      }
      if (task.whichPlatform === "chemist") {
        if (task.buttonText === "Check") {
          try {
            const cookieResult = await setEarnTaskCookie({ taskId: task.id });
            if (cookieResult?.serverError) throw new Error(cookieResult.serverError);
            router.push("/earn/9CXx152NbBKOKE2");
          } catch (error) {
            if (error instanceof Error) {
              haptics.error();
            }
          }
        }
      }
      if (task.whichPlatform === "instagram") {
        if (task.buttonText === "Check") {
          let taskUrl = task.url ?? "";
          if (
            !taskUrl.startsWith("http://") &&
            !taskUrl.startsWith("https://")
          ) {
            taskUrl = "https://" + taskUrl;
          }
          if (task.whichPlatform != ("telegram" as string)) {
            window.open(taskUrl, "_blank");
          }
          setButtonText(task.id, <ButtonLoader />);
          setTimeout(() => {
            setButtonText(task.id, claimTEXT);
            return;
          }, 2000);
        } else if (task.buttonText === claimTEXT) {
          if (!taskSnapshot.exists()) {
            claimTask(task);
          }
        }
      }
      if (task.whichPlatform === "referrals") {
        setButtonText(task.id, <ButtonLoader />);
        const userReferalls = collection(dbfs, `user/${telegramId}/referrals`);
        const needRefValue = doc(dbfs, `tasks/${task.id}`);
        const snapshotNeedRefValue = await getDoc(needRefValue);
        const snapshotReferrals = await getDocs(userReferalls);
        if (snapshotNeedRefValue.exists() && !snapshotReferrals.empty) {
          const needRef = snapshotNeedRefValue.data().referralValue;
          if (snapshotReferrals.size >= needRef) {
            claimTask(task);
          } else {
            setButtonText(task.id, "Check");
          }
        } else {
          setButtonText(task.id, "Check");
        }
      }
      if (task.whichPlatform === "referrals10") {
        setButtonText(task.id, <ButtonLoader />);
        const userReferalls = collection(dbfs, `user/${telegramId}/referrals`);
        const needRefValue = doc(dbfs, `tasks/${task.id}`);
        const snapshotNeedRefValue = await getDoc(needRefValue);
        const snapshotReferrals = await getDocs(userReferalls);
        if (snapshotNeedRefValue.exists() && !snapshotReferrals.empty) {
          const needRef = snapshotNeedRefValue.data().referralValue;
          if (snapshotReferrals.size >= needRef) {
            claimTask(task);
          } else {
            setButtonText(task.id, "Check");
          }
        } else {
          setButtonText(task.id, "Check");
        }
      }
      if (task.whichPlatform === "onchain") {
        if (task.buttonText === "Check") {
          try {
            const cookieResult = await setEarnTaskCookie({ taskId: task.id });
            if (cookieResult?.serverError) throw new Error(cookieResult.serverError);
            router.push("/earn/9CXx152NbBKOKE2");
          } catch (error) {
            if (error instanceof Error) {
              haptics.error();
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
            setButtonText(task.id, <ButtonLoader />);
            setTimeout(() => {
              setButtonText(task.id, claimTEXT);
              return;
            }, 2000);
            return;
          } else {
            setButtonText(task.id, task.buttontitle);
            return;
          }
        }
        if (task.buttonText === claimTEXT) {
          if (!taskSnapshot.exists()) {
            claimTask(task);
          } else {
            markCompleted(task.id);
            setActiveTaskId(null);
          }
        }
      }
      if (task.whichPlatform === "connectwallet") {
        if (task.buttonText === "Check") {
          setButtonText(task.id, <ButtonLoader />);

          // Check for wallet from localStorage (QC Wallet)
          const storedWallet = localStorage.getItem(`quantum_wallet_address_${telegramId}`);
          if (storedWallet && storedWallet !== "") {
            // User has a wallet - show claim button
            setButtonText(task.id, claimTEXT);
            return;
          } else {
            // User doesn't have a wallet - navigate to wallet page to create one
            router.push("/wallet");
            setButtonText(task.id, "Check");
            return;
          }
        } else if (task.buttonText === claimTEXT) {
          if (!taskSnapshot.exists()) {
            claimTask(task);
          }
        }
      }
      if (task.whichPlatform === "solvetoearnExplore") {
        if (task.buttonText === "Check") {
          setButtonText(task.id, <ButtonLoader />);
          const valueRef = doc(dbfs, `user/${telegramId}/miningData/values`);
          const snapshotWallet = await getDoc(valueRef);
          if (snapshotWallet.exists()) {
            const valueData = snapshotWallet.data();
            const remainingSolveToEarnDB = valueData.remainingSolveToEarn;
            if (remainingSolveToEarnDB < 7) {
              setTimeout(() => {
                setButtonText(task.id, claimTEXT);
                return;
              }, 1000);
            } else {
              setButtonText(task.id, task.buttontitle);
            }
          } else {
            setButtonText(task.id, task.buttontitle);
          }
        } else if (task.buttonText === claimTEXT) {
          if (!taskSnapshot.exists()) {
            claimTask(task);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        haptics.error();
        toast.error("Task could not be completed", { description: error.message });
      }
    }
  };

  const openTelegramGroup = (link: string) => {
    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      link = "https://" + link;
    }
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(link);
    } else {
      window.open(link, "_blank");
    }
  };
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="relative z-10">
        {!loading ? (
          <>
            {/* Header */}
            <div className="p-6 pt-8">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Time to stash those QNTMs, {tgFirstName}.
              </h1>
              <p className="text-neutral-400 text-sm mt-1">
                Simply complete tasks to earn your QNTM.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="px-4 mb-6">
              <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as typeof tab)}
                className="w-full"
              >
                <TabsList className="w-full bg-[#1a1a1a]/80 backdrop-blur-md p-1 h-auto rounded-xl border-0">
                  {[limitedTXT, ingameTXT, ParnersTXT].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="group flex-1 data-[state=active]:bg-white data-[state=active]:text-black text-neutral-400 py-[0.31rem]"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        {tab}
                        {getIncompleteCount(tab) > 0 ? (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-white text-black group-data-[state=active]:bg-neutral-700 group-data-[state=active]:text-white text-[10px] font-bold leading-5">
                            {getIncompleteCount(tab)}
                          </span>
                        ) : null}
                      </span>
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
          <>
            <div className="p-6 pt-8">
              <Skeleton className="h-16 w-[88%]" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
            <div className="px-4 mb-6">
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="px-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="bg-[#1a1a1a]/60">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-9 w-16 rounded-lg shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EarnContent;
