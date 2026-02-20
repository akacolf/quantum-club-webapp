"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useLeaderboardContext } from "@/app/(contexts)/LeaderboardContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";
import { useTelegramBackButton } from "../(hooks)/useBackButton";
import LeaderboardHeader from "./(components)/Header";
import LeaderboardStats from "./(components)/Stats";
import UserStatsCard from "./(components)/UserStatsCard";
import LeaderboardList from "./(components)/Leaderboard";
import LeaderboardUISkeleton from "./(components)/UISkeleton";

const LeaderboardContent = () => {

  useTelegramBackButton();

  const {
    leaderboardContext,
    setLeaderboardContext,
    userRank,
    setUserRank,
    setTotalUsers,
    setTotalQuant,
  } = useLeaderboardContext();
  const { telegramId } = useUserContext();
  const [pageLoading, setPageLoading] = useState(true);

  const formattedAmount = useCallback((total: number) => {
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
  }, []);

  useEffect(() => {
      const fetchData = async () => {
        try {
          const shouldRefresh = leaderboardContext.length === 0 || !userRank || userRank < 1;
          if (shouldRefresh) {
            const userRankRef = doc(dbfs, `userRanks/${telegramId}`);
            const rankSnapshot = await getDoc(userRankRef);
            if (rankSnapshot.exists()) {
              const userRef = doc(dbfs, `user/${telegramId}/miningData/values`);
              const snapshotValue = await getDoc(userRef);
              const quantValue = snapshotValue.data()?.QuantAmount;
              updateDoc(userRankRef, {
                QuantAmount: quantValue,
              });
            }
            const response = await fetch("/api/getUserValues", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ telegramId: telegramId }),
            });
            if (!response.ok) {
              throw new Error("Network response was not okay");
            }
            const data = await response.json();
            setLeaderboardContext(data.allValues);
            if (typeof data.rank === "number") {
              setUserRank(data.rank);
              sessionStorage.setItem("userLeaderRank", String(data.rank));
            }
            const totalquant: number = data.totalAmount;
            setTotalUsers(data.userCount);
            sessionStorage.setItem(
              "totalusers",
              JSON.stringify(data.userCount)
            );
            sessionStorage.setItem("lboard", JSON.stringify(data.allValues));
            const total: string = formattedAmount(totalquant);
            sessionStorage.setItem("totalquant", total);
            setTotalQuant(total);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setPageLoading(false);
        }
      };

      fetchData();
  }, [formattedAmount, leaderboardContext, setLeaderboardContext, setTotalQuant, setTotalUsers, setUserRank, telegramId, userRank]);

  return (
    pageLoading ? (
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
