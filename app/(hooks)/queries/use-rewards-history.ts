import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";
import type { TaskHistory } from "@/lib/interfaces";

function convertToDate(dateStr: string | undefined) {
    if (!dateStr || !dateStr.includes("/")) return new Date(0);
    const [day, month, year] = dateStr.split("/");
    return new Date(`${year}-${month}-${day}`);
}

async function fetchRewardsHistory(
    telegramId: string,
): Promise<TaskHistory[]> {
    const tasksRef = collection(dbfs, `user/${telegramId}/tasks`);
    const snapshotTasks = await getDocs(tasksRef);
    const rewardsRef = collection(dbfs, `user/${telegramId}/rewardsHistory`);
    const snapshotRewards = await getDocs(rewardsRef);

    // Task History
    const tasks: TaskHistory[] = !snapshotTasks.empty
        ? snapshotTasks.docs.map((doc) => {
              let platform = doc.data().platform;
              if (
                  platform === "telegram" ||
                  platform === "ic:baseline-telegram"
              )
                  platform = "telegram";
              if (platform === "twitter" || platform === "pajamas:twitter")
                  platform = "twitter";
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
    const rewardsHistory: TaskHistory[] = !snapshotRewards.empty
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
    combinedList.sort(
        (a, b) =>
            convertToDate(b.date).getTime() - convertToDate(a.date).getTime(),
    );

    return combinedList;
}

/**
 * TanStack Query hook that loads combined task rewards and daily check-in
 * rewards history from Firestore, sorted by date descending.
 *
 * Used by:
 *  - home/rewardshistory/page.tsx
 */
export function useRewardsHistoryQuery(telegramId: string | null | undefined) {
    return useQuery<TaskHistory[]>({
        queryKey: ["rewards-history", telegramId],
        queryFn: () => fetchRewardsHistory(telegramId!),
        enabled: !!telegramId,
        staleTime: 60_000,
    });
}
