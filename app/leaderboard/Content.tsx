"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useLeaderboardContext } from "@/app/contexts/LeaderboardContext";
import { useGameContext } from "@/app/contexts/MiningContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { dbfs } from "@/app/firebase/firebaseConfig";
import { useTelegramBackButton } from "../hooks/useBackButton";
import LeaderboardHeader from "./components/Header";
import LeaderboardStats from "./components/Stats";
import UserStatsCard from "./components/UserStatsCard";
import LeaderboardList from "./components/Leaderboard";
import LeaderboardUISkeleton from "./components/UISkeleton";

const LeaderboardContent = () => {

  useTelegramBackButton();

  const {
    leaderboardContext,
    setLeaderboardContext,
    setTotalUsers,
    setTotalQuant,
  } = useLeaderboardContext();
  const { telegramId } = useGameContext();
  const [pageLoading, setPageLoading] = useState(true);

  const formattedAmount = useCallback((total: number) => {
    const amount = total;
    let totally: string = "";
    if (amount >= 100_000_000_000) {
      return (totally = Math.round(amount / 1_000_000_000) + "B");
    } else if (amount >= 10_000_000_000) {
      return (totally = Math.round(amount / 1_000_000_000) + "B");
    } else if (amount >= 1_000_000_000) {
      return (totally = Math.round(amount / 1_000_000) + "M");
    } else if (amount >= 100_000_000) {
      return (totally = (amount / 1_000_000).toFixed(1) + "M");
    } else if (amount >= 10_000_000) {
      return (totally = (amount / 1_000_000).toFixed(1) + "M");
    } else if (amount >= 1_000_000) {
      return (totally = (amount / 1_000_000).toFixed(1) + "M");
    } else if (amount >= 100_000) {
      return (totally = Math.round(amount / 1_000) + "K");
    } else if (amount >= 10_000) {
      return (totally = Math.round(amount / 1_000) + "K");
    } else if (amount >= 1_000) {
      return (totally = Math.round(amount / 1_000) + "K");
    }
    return totally;
  }, []);

  useEffect(() => {
      const fetchData = async () => {
        try {
          if (leaderboardContext.length === 0) {
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
  }, [formattedAmount, leaderboardContext, setLeaderboardContext, setTotalQuant, setTotalUsers, telegramId]);

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
