import { useQuery } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAllTasks } from "@/app/earn/tasks";
import type { EarnTask } from "@/lib/interfaces";

export interface EarnTasksData {
    /** All active tasks with completion status and reward amounts */
    tasks: EarnTask[];
    /** Number of tasks the user has completed */
    completedCount: number;
}

/**
 * TanStack Query hook that loads earn tasks from Firestore, enriched with
 * completion status and reward data for the current user.
 *
 * Used by:
 *  - earn/Content.tsx
 */
export function useEarnTasksQuery(
    telegramId: string | null,
    totalUsers: number | null,
) {
    return useQuery<EarnTasksData>({
        queryKey: ["earn-tasks", telegramId, totalUsers],
        queryFn: async () => {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error("Permission denied");

            // Completed task count
            const completedRef = collection(
                dbfs,
                `user/${telegramId}/tasks`,
            );
            const completedSnap = await getDocs(completedRef);
            const completedCount = completedSnap.empty
                ? 0
                : completedSnap.size;

            // Build full task list
            const tasks: EarnTask[] = (
                await Promise.all(
                    getAllTasks().map(async (task) => {
                        const whichPlatform = task.whichPlatform;
                        let description: string | React.ReactNode;
                        if (whichPlatform === "userMilestone") {
                            description = `Road to 1K - ${totalUsers ?? 0} / 1000`;
                        } else {
                            description = task.description;
                        }

                        const quantRef = doc(dbfs, `tasks/${task.id}`);
                        const quantSnapshot = await getDoc(quantRef);
                        const quant = quantSnapshot.data()?.quantReward ?? 0;
                        const timestamp =
                            quantSnapshot.data()?.timestamp ?? 0;

                        const taskRef = doc(
                            dbfs,
                            `user/${telegramId}/tasks/${task.id}`,
                        );
                        const taskSnapshot = await getDoc(taskRef);
                        const completed =
                            taskSnapshot.exists() &&
                            taskSnapshot.data().completed;

                        if (Date.now() > timestamp && timestamp !== 0)
                            return null;

                        return {
                            ...task,
                            id: task.id,
                            description,
                            completed,
                            category: task.category,
                            platform: task.platform,
                            buttontitle: task.buttontitle,
                            buttonText: completed
                                ? "Joined"
                                : whichPlatform === "connectwallet" &&
                                    typeof window !== "undefined" &&
                                    localStorage.getItem(
                                        "walletAddress_" + telegramId,
                                    )
                                  ? "Claim"
                                  : task.buttontitle,
                            url: task.url,
                            quant,
                            whichPlatform,
                            timestamp,
                        } as EarnTask;
                    }),
                )
            ).filter((t): t is EarnTask => t !== null);

            return { tasks, completedCount };
        },
        enabled: !!telegramId,
        staleTime: 60_000, // 1 minute
    });
}
