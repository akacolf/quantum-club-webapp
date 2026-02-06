'use client'
import { useEffect, useState } from "react";
import { dbfs } from "@/app/(firebase)/client";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { TaskHistory } from "@/lib/interfaces";
import { getDocs, collection } from "firebase/firestore";
import TasksSkeleton from "./(components)/TasksSkeleton";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

function getPlatformIcon(platform: string | null) {
  if (platform === "dailycheck-in-reward") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1.5em"
        height="1.5em"
        viewBox="0 0 16 16"
      >
        <path
          fill="#fff"
          fillRule="evenodd"
          d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16m3.65-10.857L6.91 9.8L4.35 7.286a.5.5 0 0 0-.7.714l2.909 2.857a.5.5 0 0 0 .7 0l5.091-5a.5.5 0 1 0-.7-.714"
        />
      </svg>
    );
  }
  if (
    platform === "telegram" ||
    platform === "ic:baseline-telegram" ||
    platform === "checktelegramAgain"
  ) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1.5em"
        height="1.5em"
        viewBox="0 0 24 24"
      >
        <path
          fill="#FFF"
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19c-.14.75-.42 1-.68 1.03c-.58.05-1.02-.38-1.58-.75c-.88-.58-1.38-.94-2.23-1.5c-.99-.65-.35-1.01.22-1.59c.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02c-.09.02-1.49.95-4.22 2.79c-.4.27-.76.41-1.08.4c-.36-.01-1.04-.2-1.55-.37c-.63-.2-1.12-.31-1.08-.66c.02-.18.27-.36.74-.55c2.92-1.27 4.86-2.11 5.83-2.51c2.78-1.16 3.35-1.36 3.73-1.36c.08 0 .27.02.39.12c.1.08.13.19.14.27c-.01.06.01.24 0 .38"
        />
      </svg>
    );
  }

  if (platform === "twitter" || platform === "pajamas:twitter") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1.5em"
        height="1.5em"
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
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1.5em"
        height="1.5em"
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
    return (
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1.5em"
          height="1.5em"
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
    return (
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1.5em"
          height="1.5em"
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
    return (
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1.5em"
          height="1.5em"
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

  if (platform === "onchain") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1.5em"
        height="1.5em"
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
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1.5em"
        height="1.5em"
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
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1.5em"
        height="1.5em"
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
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1.5em"
        height="1.5em"
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
  return null;
}

const convertToDate = (dateStr: string) => {
  const [day, month, year] = dateStr.split("/");
  return new Date(`${year}-${month}-${day}`);
};

export default function RewardsHistory() {
  useTelegramBackButton();
  const { telegramId } = useUserContext();
  const [taskhistoryList, setTaskhistoryList] = useState<TaskHistory[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasksRef = collection(dbfs, `user/${telegramId}/tasks`);
        const snapshotTasks = await getDocs(tasksRef);
        const rewardsRef = collection(
          dbfs,
          `user/${telegramId}/rewardsHistory`
        );
        const snapshotRewards = await getDocs(rewardsRef);

        // Task History
        const tasks = !snapshotTasks.empty
          ? snapshotTasks.docs.map((doc) => {
              let platform = doc.data().platform;
              if (
                platform === "telegram" ||
                platform === "ic:baseline-telegram"
              )
                platform = "telegram";
              if (platform === "twitter" || platform === "pajamas:twitter")
                platform = "twitter";
              if (platform === "chemist") platform = "chemist";
              if (platform === "instagram") platform = "instagram";
              if (platform === "referrals") platform = "referrals";
              if (platform === "referrals10") platform = "referrals10";
              if (platform === "checktelegramAgain")
                platform = "checktelegramAgain";
              if (platform === "onchain") platform = "onchain";
              if (platform === "userMilestone") platform = "userMilestone";
              if (platform === "connectwallet") platform = "connectwallet";
              if (platform === "solvetoearnExplore")
                platform = "solvetoearnExplore";
              return {
                id: doc.id,
                quant: doc.data().quant,
                date: doc.data().Date,
                platform,
                title: "Task reward",
              };
            })
          : [];

        // Rewards History
        const rewardsHistory = !snapshotRewards.empty
          ? snapshotRewards.docs.map((doc) => {
              let platform = doc.data().platform;
              if (platform === "dailycheck-in-reward")
                platform = "dailycheck-in-reward";
              else platform = "telegram";
              return {
                id: doc.id,
                quant: doc.data().quant,
                date: doc.data().Date,
                platform,
                title: "Daily check-in",
              };
            })
          : [];

        // Combine and sort
        const combinedList = [...tasks, ...rewardsHistory];
        const sortedList = combinedList.sort(
          (a, b) =>
            convertToDate(b.date).getTime() - convertToDate(a.date).getTime()
        );

        setTaskhistoryList(sortedList);
      } catch (error) {
        console.error(error);
      } finally {
        setTasksLoading(false);
      }
    };

    fetchTasks();
  }, [telegramId]);

   return (
      <div className="min-h-screen bg-black text-white p-4 pb-24">
        <div className="mb-6">
          <h1 className="font-bold text-3xl bg-linear-to-r from-white to-gray-500 bg-clip-text text-transparent">History</h1>
          <p className="text-gray-400 text-sm mt-1">Track your earnings and rewards</p>
        </div>

        {tasksLoading ? (
          <TasksSkeleton />
        ) : taskhistoryList.length > 0 ? (
          <ScrollArea className="h-[calc(100vh-150px)]">
            <div className="space-y-3 pr-2">
              {taskhistoryList.map((task) => (
                <Card key={task.id} className="bg-[#111] border-[#333] hover:bg-[#161616] transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#222] border border-[#333] shrink-0">
                        {getPlatformIcon(task.platform)}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="font-semibold text-white text-sm">{task.title}</p>
                        <p className="text-gray-500 text-xs font-medium">{task.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 bg-green-500/10 px-2.5 py-1 rounded-lg border border-green-500/20">
                        <span className="text-green-400 font-bold text-sm">
                          +{task.quant}
                        </span>
                        <span className="text-green-500/70 text-[10px] font-bold">QNTM</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 24 24" className="opacity-20">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67c0-.84.79-1.43 2.1-1.43c1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81c0 1.79 1.49 2.69 3.66 3.21c1.95.46 2.34 1.15 2.34 1.87c0 .53-.39 1.39-2.1 1.39c-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77c-.01-2.2-1.9-2.96-3.66-3.42z"/>
            </svg>
            <p>No rewards history yet</p>
          </div>
        )}
      </div>
  );
}
