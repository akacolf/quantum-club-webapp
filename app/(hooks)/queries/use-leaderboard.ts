import { useInfiniteQuery } from "@tanstack/react-query";
import { getLeaderboardData } from "@/app/(hooks)/actions";

export interface LeaderboardEntry {
  id: string;
  username: string;
  QuantAmount: number;
}

interface LeaderboardPage {
  allValues: LeaderboardEntry[];
  rank?: number | null;
  totalAmount?: number;
  userCount?: number;
  nextCursor?: string;
}

export function useLeaderboardQuery(telegramId: string | undefined | null) {
  return useInfiniteQuery({
    queryKey: ["leaderboard", telegramId],
    queryFn: async ({ pageParam }) => {
      const result = await getLeaderboardData({
        telegramId: telegramId || undefined,
        lastDocId: pageParam,
      });
      if (result?.serverError) throw new Error(result.serverError);
      if (!result?.data) throw new Error("Failed to fetch leaderboard");
      return result.data as LeaderboardPage;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!telegramId,
    staleTime: 2 * 60 * 1000,
  });
}
