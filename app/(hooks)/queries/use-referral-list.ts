import { useQuery } from "@tanstack/react-query";
import { fetchReferralList } from "@/app/frens/actions";
import type { Referral } from "@/lib/interfaces";

/**
 * TanStack Query hook that fetches the referral list via server action
 * (Admin SDK bypasses Firestore rules for cross-user reads).
 */
export function useReferralListQuery(telegramId: string | null) {
    return useQuery<Referral[]>({
        queryKey: ["referral-list", telegramId],
        queryFn: async () => {
            const result = await fetchReferralList();
            if (result?.serverError) throw new Error(result.serverError);
            return result?.data?.referrals ?? [];
        },
        enabled: !!telegramId,
        staleTime: 60_000,
    });
}
