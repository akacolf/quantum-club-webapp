import { useQuery } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { useUserStore } from "@/stores/user-store";

export interface UserStats {
  totalQntm: number;
  referralCount: number;
  tasksCompleted: number;
  dailyStreak: number;
  walletCreated: boolean;
}

async function fetchUserStats(
  telegramId: string,
  daily: number,
  walletCreated: boolean
): Promise<UserStats> {
  const [referralsSnapshot, tasksSnapshot, valuesSnapshot] = await Promise.all([
    getDocs(collection(dbfs, `user/${telegramId}/referrals`)),
    getDocs(collection(dbfs, `user/${telegramId}/tasks`)),
    getDoc(doc(dbfs, `user/${telegramId}/miningData/values`)),
  ]);

  const totalQntm = valuesSnapshot.exists()
    ? valuesSnapshot.data()?.QuantAmount || 0
    : 0;

  return {
    totalQntm,
    referralCount: referralsSnapshot.size,
    tasksCompleted: tasksSnapshot.size,
    dailyStreak: daily || 0,
    walletCreated,
  };
}

export function useUserStatsQuery(
  telegramId: string | undefined | null,
  daily: number
) {
  const walletAddress = useUserStore((s) => s.walletAddress);
  return useQuery({
    queryKey: ["user-stats", telegramId],
    queryFn: () => fetchUserStats(telegramId!, daily, !!walletAddress),
    enabled: !!telegramId,
    staleTime: 2 * 60 * 1000,
  });
}
