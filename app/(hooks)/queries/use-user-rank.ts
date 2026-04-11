import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";

/**
 * Fetch a specific user's leaderboard rank directly from `userRanks/{userId}`.
 * Firestore rules on userRanks/** allow any authenticated read, so this works
 * for OTHER users — unlike getLeaderboardData which resolves rank from the
 * session's own encrypted telegram id.
 */
export function useUserRank(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["user-rank", userId],
    queryFn: async (): Promise<number | null> => {
      if (!userId) return null;
      const snap = await getDoc(doc(dbfs, "userRanks", userId));
      if (!snap.exists()) return null;
      const rank = snap.data()?.rank;
      return typeof rank === "number" && rank > 0 ? rank : null;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
