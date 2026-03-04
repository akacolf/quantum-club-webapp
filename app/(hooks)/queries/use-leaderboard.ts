import { useQuery } from "@tanstack/react-query";
import { getLeaderboardData } from "@/app/(hooks)/actions";

interface LeaderboardEntry {
  rank: number;
  username: string;
  QuantAmount: number;
  miningActive: boolean;
  telegramId: string;
}

interface LeaderboardData {
  allValues: LeaderboardEntry[];
  rank: number | null;
  totalAmount: number;
  userCount: number;
}

export function useLeaderboardQuery(telegramId: string | undefined | null) {
  return useQuery<LeaderboardData>({
    queryKey: ["leaderboard", telegramId],
    queryFn: async () => {
      const result = await getLeaderboardData({ telegramId: telegramId || undefined });
      if (result?.serverError) throw new Error(result.serverError);
      if (!result?.data) throw new Error("Failed to fetch leaderboard");
      return result.data as LeaderboardData;
    },
    enabled: !!telegramId,
    staleTime: 2 * 60 * 1000,
  });
}
