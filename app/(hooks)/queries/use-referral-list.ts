import { useQuery } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import type { Referral } from "@/lib/interfaces";

const MAX_REFERRALS = 20;

async function fetchReferralList(telegramId: string): Promise<Referral[]> {
    const referralsRef = collection(dbfs, `user/${telegramId}/referrals`);
    const snapshot = await getDocs(referralsRef);

    if (snapshot.empty) return [];

    const referrals: Referral[] = [];
    let count = 0;

    for (const docSnapshot of snapshot.docs) {
        if (count >= MAX_REFERRALS) break;
        const referredTelegramId = docSnapshot.id;
        try {
            const referredRef = doc(dbfs, `user/${referredTelegramId}`);
            const referredData = await getDoc(referredRef);
            const username = referredData.data()?.username ?? "";

            const coinsRef = doc(
                dbfs,
                `user/${referredTelegramId}/miningData/values`,
            );
            const coinsSnapshot = await getDoc(coinsRef);
            const coins =
                coinsSnapshot.exists() && coinsSnapshot.data().firstQuant
                    ? parseFloat(coinsSnapshot.data().firstQuant).toFixed(0)
                    : "0";

            referrals.push({
                id: referredTelegramId,
                username,
                quantamount: Number(coins),
            });
            count++;
        } catch (error) {
            console.error("Error fetching referral:", error);
        }
    }

    return referrals;
}

export function useReferralListQuery(telegramId: string | null) {
    return useQuery<Referral[]>({
        queryKey: ["referral-list", telegramId],
        queryFn: () => fetchReferralList(telegramId!),
        enabled: !!telegramId,
        staleTime: 60_000,
    });
}
