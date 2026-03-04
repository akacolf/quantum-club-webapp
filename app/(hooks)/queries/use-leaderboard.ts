import { useQuery } from "@tanstack/react-query";

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

async function fetchLeaderboard(telegramId: string): Promise<LeaderboardData> {
  const response = await fetch("/api/getUserValues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId }),
  });
  if (!response.ok) throw new Error("Failed to fetch leaderboard");
  return response.json();
}

export function useLeaderboardQuery(telegramId: string | undefined | null) {
  return useQuery({
    queryKey: ["leaderboard", telegramId],
    queryFn: () => fetchLeaderboard(telegramId!),
    enabled: !!telegramId,
    staleTime: 2 * 60 * 1000,
  });
}
