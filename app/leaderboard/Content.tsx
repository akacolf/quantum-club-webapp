"use client";

import React, { useEffect } from "react";
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

  const { data, isLoading } = useLeaderboardQuery(telegramId);

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

    setLeaderboardContext(data.allValues);

    if (typeof data.rank === "number") {
      setUserRank(data.rank);
    }

    setTotalUsers(data.userCount);
    setTotalQuant(formattedAmount(data.totalAmount));
  }, [data, setLeaderboardContext, setTotalQuant, setTotalUsers, setUserRank]);

  // Firestore side-effect: update QuantAmount on the userRank doc
  useEffect(() => {
    if (!telegramId) return;

    const syncQuantAmount = async () => {
      try {
        const userRankRef = doc(dbfs, `userRanks/${telegramId}`);
        const rankSnapshot = await getDoc(userRankRef);
        if (rankSnapshot.exists()) {
          const userRef = doc(dbfs, `user/${telegramId}/miningData/values`);
          const snapshotValue = await getDoc(userRef);
          const quantValue = snapshotValue.data()?.QuantAmount;
          updateDoc(userRankRef, { QuantAmount: quantValue });
        }
      } catch (error) {
        console.error("Error syncing QuantAmount:", error);
      }
    };

    syncQuantAmount();
  }, [telegramId]);

  return (
    isLoading ? (
      <LeaderboardUISkeleton />
  ) : (
    <>
      <LeaderboardHeader />
      <LeaderboardStats />
      <UserStatsCard />
      <LeaderboardList />
    </>
  )
  );
};

export default LeaderboardContent;
