import { useQuery } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import { collection, getDocs } from "firebase/firestore";
import type { ServerAchievement } from "@/lib/achievements";

export function useServerAchievementsQuery(telegramId: string | null) {
    return useQuery<ServerAchievement[]>({
        queryKey: ["server-achievements", telegramId],
        queryFn: async () => {
            if (!telegramId) return [];
            const badgesRef = collection(dbfs, `user/${telegramId}/badges`);
            const snapshot = await getDocs(badgesRef);
            return snapshot.docs.map((doc) => ({
                achievementId: doc.id,
                earnedAt: doc.data().earnedAt?.toDate() || new Date(),
            }));
        },
        enabled: !!telegramId,
        staleTime: 60_000,
    });
}
