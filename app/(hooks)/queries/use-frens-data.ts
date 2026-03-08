import { useQuery } from "@tanstack/react-query";
import { fetchFrensData } from "@/app/frens/actions";

export interface FrensData {
    /** Total first-tier referral count */
    referralCount: number;
    /** Total second-tier referral count */
    secondTierCount: number;
    /** Unclaimed QNTM rewards from tier-2 referrals */
    pendingRewards: number;
    /** Unclaimed TON referral earnings */
    tonEarnings: number;
}

/**
 * TanStack Query hook that reads referral counts, pending rewards, and TON
 * earnings via server action (Admin SDK bypasses Firestore rules).
 */
export function useFrensDataQuery(telegramId: string | null) {
    return useQuery<FrensData>({
        queryKey: ["frens-data", telegramId],
        queryFn: async () => {
            const result = await fetchFrensData();
            if (result?.serverError) throw new Error(result.serverError);
            const data = result?.data;
            if (!data) throw new Error("Failed to fetch frens data");
            return data;
        },
        enabled: !!telegramId,
        staleTime: 30_000,
    });
}
