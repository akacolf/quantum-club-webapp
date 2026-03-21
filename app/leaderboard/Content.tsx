"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLeaderboardContext } from "@/app/(contexts)/LeaderboardContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";
import { useTelegramBackButton } from "../(hooks)/useBackButton";
import { useLeaderboardQuery } from "@/app/(hooks)/queries/use-leaderboard";
import LeaderboardHeader from "./(components)/Header";
import LeaderboardStats from "./(components)/Stats";
import UserStatsCard from "./(components)/UserStatsCard";
import LeaderboardList from "./(components)/Leaderboard";
import LeaderboardUISkeleton from "./(components)/UISkeleton";

const LeaderboardContent = () => {

  useTelegramBackButton();

  const {
    setLeaderboardContext,
    setUserRank,
    setTotalUsers,
    setTotalQuant,
  } = useLeaderboardContext();
  const { telegramId } = useUserContext();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLeaderboardQuery(telegramId);

  // Sync query data to the Zustand leaderboard store
  useEffect(() => {
    if (!data) return;

    const formattedAmount = (total: number) => {
      const amount = total;
      if (amount >= 100_000_000_000) {
        return Math.round(amount / 1_000_000_000) + "B";
      } else if (amount >= 10_000_000_000) {
        return Math.round(amount / 1_000_000_000) + "B";
      } else if (amount >= 1_000_000_000) {
        return Math.round(amount / 1_000_000) + "M";
      } else if (amount >= 100_000_000) {
        return (amount / 1_000_000).toFixed(1) + "M";
      } else if (amount >= 10_000_000) {
        return (amount / 1_000_000).toFixed(1) + "M";
      } else if (amount >= 1_000_000) {
        return (amount / 1_000_000).toFixed(1) + "M";
      } else if (amount >= 100_000) {
        return Math.round(amount / 1_000) + "K";
      } else if (amount >= 10_000) {
        return Math.round(amount / 1_000) + "K";
      } else if (amount >= 1_000) {
        return Math.round(amount / 1_000) + "K";
      }
      return Math.round(amount).toLocaleString("en-US");
    };

    // Flatten all pages into a single leaderboard list
    const allEntries = data.pages.flatMap(page => page.allValues);
    setLeaderboardContext(allEntries);

    // Stats come from the first page only
    const firstPage = data.pages[0];
    if (firstPage) {
      if (typeof firstPage.rank === "number") {
        setUserRank(firstPage.rank);
      }
      if (firstPage.userCount !== undefined) {
        setTotalUsers(firstPage.userCount);
      }
      if (firstPage.totalAmount !== undefined) {
        setTotalQuant(formattedAmount(firstPage.totalAmount));
      }
    }
  }, [data, setLeaderboardContext, setTotalQuant, setTotalUsers, setUserRank]);

  // Firestore side-effect: update QuantAmount on the userRank doc
  const syncQuantMutation = useMutation({
    mutationFn: async (tid: string) => {
      const userRankRef = doc(dbfs, `userRanks/${tid}`);
      const rankSnapshot = await getDoc(userRankRef);
      if (rankSnapshot.exists()) {
        const userRef = doc(dbfs, `user/${tid}/miningData/values`);
        const snapshotValue = await getDoc(userRef);
        const quantValue = snapshotValue.data()?.QuantAmount;
        await updateDoc(userRankRef, { QuantAmount: quantValue });
      }
    },
  });

  useEffect(() => {
    if (telegramId) syncQuantMutation.mutate(telegramId);
  }, [telegramId]);

  return (
    isLoading ? (
      <LeaderboardUISkeleton />
  ) : (
    <>
      <LeaderboardHeader />
      <LeaderboardStats />
      <UserStatsCard />
      <LeaderboardList
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </>
  )
  );
};

export default LeaderboardContent;
