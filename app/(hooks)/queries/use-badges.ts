import { useQuery } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import { collection, getDocs } from "firebase/firestore";
import type { UserBadge } from "@/lib/badges";

export function useUserBadgesQuery(telegramId: string | null) {
    return useQuery<UserBadge[]>({
        queryKey: ["user-badges", telegramId],
        queryFn: async () => {
            if (!telegramId) return [];
            const badgesRef = collection(dbfs, `user/${telegramId}/badges`);
            const snapshot = await getDocs(badgesRef);
            return snapshot.docs.map((doc) => ({
                badgeId: doc.id,
                earnedAt: doc.data().earnedAt?.toDate() || new Date(),
            }));
        },
        enabled: !!telegramId,
        staleTime: 60_000, // 1 minute
    });
}
