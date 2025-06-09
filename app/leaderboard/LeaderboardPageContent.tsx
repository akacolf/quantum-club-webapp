"use client";
import React, { useEffect, useRef, useState } from "react";
import Loader from "../components/MainLoader";
import { useLeaderboardContext } from "@/app/contexts/LeaderboardContext";
import { useGameContext } from "@/app/contexts/MiningContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { dbfs } from "@/app/firebase/firebaseConfig";
import { firstPlaceMedal, leaderboardStatImg, secondPlaceMedal, thirdPlaceMedal } from "../../public/images";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import trophyAnimationData from "@/public/images/trophy-lottie.json";
import smilingAnimationData from "@/public/images/smiling-lottie.json";
import { useRouter } from "next/navigation";
import Image from "next/image";
const LeaderboardPageContent = () => {
  const [loadingImage, setLoadingImage] = useState(0);
  useEffect(() => {
    if (loadingImage >= 1) return;

    const userStatsImg = new window.Image();

    userStatsImg.src = leaderboardStatImg.src;
    const handleLoad = () => {
      setLoadingImage((prev) => {
        if (prev >= 1) return 1;
        return prev + 1;
      });
    };
    userStatsImg.onload = handleLoad;
  }, []);
  const router = useRouter();
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      const handleBackButtonClick = () => {
        router.replace("/home");
      };
      tg.BackButton.show();
      tg.BackButton.onClick(handleBackButtonClick);
      return () => {
        tg.BackButton.offClick(handleBackButtonClick);
      };
    } else {
      console.error("Telegram WebApp is not available");
    }
  }, [router]);

  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const {
    leaderboardContext,
    setLeaderboardContext,
    userRank,
    totalUsers,
    setTotalUsers,
    totalQuant,
    setTotalQuant,
  } = useLeaderboardContext();
  const { MainQuantAmount, telegramId, username } = useGameContext();
  const [pageLoading, setPageLoading] = useState(true);
  useEffect(() => {
    {
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
            const formattedAmount = (total: number) => {
              const amount = total;
              let totally: string = "";
              if (amount >= 100_000_000_000) {
                return (totally = Math.round(amount / 1_000_000_000) + "B");
              } else if (amount >= 10_000_000_000) {
                return (totally = Math.round(amount / 1_000_000_000) + "B");
              } else if (amount >= 1_000_000_000) {
                return (totally = Math.round(amount / 1_000_000_000) + "B");
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
            };
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
    }
  });

  return (
    <div>
      <div className="p-4 flex items-center justify-between">
            <div className="flex items-center justify-center space-x-2">
              <div>
                <Lottie
                  lottieRef={lottieRef}
                  animationData={trophyAnimationData}
                  loop={1}
                  autoplay={true}
                  style={{ width: "3em", height: "3em" }}
                />
              </div>
              <div>
                <div className="text-2xl font-bold">Leaderboard</div>
                <div className="text-base font-normal text-zinc-500">
                  Climb up the ranks with your frens.
                </div>
              </div>
            </div>
          </div>
          {/*leaderboard stats*/}
          <div className="stats mt-8">
            <div className="stat">
              <div className="stat-figure text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="2.5em"
                  height="2.5em"
                  className="inline-block"
                  viewBox="0 0 32 32"
                >
                  <path
                    fill="currentColor"
                    d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667"
                  />
                </svg>
              </div>
              <div className="stat-title">Total QNTM</div>
              <div className="stat-value text-primary">{totalQuant}</div>
            </div>

            <div className="stat">
              <div className="stat-figure text-secondary">
                <Lottie
                  animationData={smilingAnimationData}
                  lottieRef={lottieRef}
                  autoplay={true}
                  loop={1}
                  style={{ width: "2.5em", height: "2.5em" }}
                />
              </div>
              <div className="stat-title">Total Users</div>
              <div className="stat-value text-secondary">{totalUsers}</div>
            </div>
          </div>

          {/*user stats card*/}
          <div className="pl-6 flex flex-col mt-5">
            <div className="font-medium">Your stats</div>
            {loadingImage >= 1 ? (
              <div
                className="bg-cover bg-center p-6 rounded-xl max-w-xs mt-3"
                style={{ backgroundImage: `url(${leaderboardStatImg.src})` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="3em"
                        height="3em"
                        viewBox="0 0 32 32"
                      >
                        <path
                          fill="#fff"
                          d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667"
                        />
                      </svg>
                    </div>
                    <div className="font-medium">
                      <div className="text-white text-base">
                        {username ? username : "Quantum User"}
                      </div>
                      <div className="text-white text-sm">
                        {MainQuantAmount} QNTM
                      </div>
                    </div>
                  </div>
                  <div className="font-medium text-white">#{userRank}</div>
                </div>
              </div>
            ) : (
              <Loader />
            )}
          </div>
          <div className="font-semibold mt-5 pl-6">Ranks</div>
          <div className="pl-2 mt-3 space-y-0 rounded-2xl">
            {leaderboardContext ? (
              leaderboardContext.length > 0 ? (
                leaderboardContext.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between p-4 bg-black"
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="2em"
                          height="2em"
                          viewBox="0 0 32 32"
                        >
                          <path
                            fill="#fff"
                            d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {item.username}
                        </div>
                        <div className="font-medium text-sm text-gray-500">
                          {item.QuantAmount} QNTM
                        </div>
                      </div>
                    </div>
                    <div className="font-medium text-sm">
                      {index === 0 && (
                        <Image 
                        src={firstPlaceMedal}
                        alt="1st place medal"
                        width={24}
                        height={24}
                        />
                      )}
                      {index === 1 && (
                        <Image 
                        src={secondPlaceMedal}
                        alt="2nd place medal"
                        width={24}
                        height={24}
                        />
                      )}
                      {index === 2 && (
                        <Image 
                        src={thirdPlaceMedal}
                        alt="3rd place medal"
                        width={24}
                        height={24}
                        />
                      )}
                      {index > 2 && <div>#{index + 1}</div>}
                    </div>
                  </div>
                ))
  );
};

export default LeaderboardPageContent;
