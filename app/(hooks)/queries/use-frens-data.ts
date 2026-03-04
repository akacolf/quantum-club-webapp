import { useQuery } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getCountFromServer,
    query,
    where,
} from "firebase/firestore";

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
 * earnings from Firestore for the frens page.
 *
 * Used by:
 *  - frens/Content.tsx
 */
export function useFrensDataQuery(telegramId: string | null) {
    return useQuery<FrensData>({
        queryKey: ["frens-data", telegramId],
        queryFn: async () => {
            // First-tier count
            const referralsRef = collection(
                dbfs,
                `user/${telegramId}/referrals`,
            );
            const countSnap = await getCountFromServer(referralsRef);
            const referralCount = countSnap.data().count;

            // Second-tier count
            const secondTierRef = collection(
                dbfs,
                `user/${telegramId}/secondTierReferrals`,
            );
            const secondTierSnap = await getCountFromServer(secondTierRef);
            const secondTierCount = secondTierSnap.data().count;

            // Pending (unclaimed) tier-2 rewards
            const unclaimedQuery = query(
                secondTierRef,
                where("claimed", "==", false),
            );
            const unclaimedSnap = await getDocs(unclaimedQuery);
            let pendingRewards = 0;
            unclaimedSnap.forEach((d) => {
                pendingRewards += Number(d.data().reward) || 0;
            });

            // TON referral earnings
            let tonEarnings = 0;
            try {
                const earningsRef = doc(
                    dbfs,
                    `user/${telegramId}/referralEarnings/ton`,
                );
                const earningsDoc = await getDoc(earningsRef);
                if (earningsDoc.exists()) {
                    tonEarnings =
                        Number(earningsDoc.data()?.pendingAmount) || 0;
                }
            } catch (e) {
                console.error("Error fetching TON earnings:", e);
            }

            return {
                referralCount,
                secondTierCount,
                pendingRewards,
                tonEarnings,
            };
        },
        enabled: !!telegramId,
        staleTime: 30_000, // 30 seconds
    });
}
