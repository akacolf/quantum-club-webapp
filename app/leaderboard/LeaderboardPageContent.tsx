"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Loader from "../components/MainLoader";
import { useLeaderboardContext } from "@/app/contexts/LeaderboardContext";
import { useGameContext } from "@/app/contexts/MiningContext";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { dbfs } from "@/app/firebase/firebaseConfig";
import Image from 'next/image';
import { trophy, smiling } from "../../public/images";
const LeaderboardPageContent = () => {
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
            const totalquant:number = data.totalAmount;
            setTotalUsers(data.userCount);
            sessionStorage.setItem("totalusers", JSON.stringify(data.userCount));
            sessionStorage.setItem("lboard", JSON.stringify(data.allValues));
            const formattedAmount = (total:number) => {
              const amount = total;
              let totally:string = ""
              if (amount >= 100_000_000_000) {return totally= Math.round(amount / 1_000_000_000) + "B";}
              else if (amount >= 10_000_000_000){ return totally= Math.round(amount / 1_000_000_000) + "B";}
              else if (amount >= 1_000_000_000) {return totally= Math.round(amount / 1_000_000_000) + "B";}
              else if (amount >= 100_000_000) {return totally= (amount / 1_000_000).toFixed(1) + "M";}
              else if (amount >= 10_000_000){ return totally= (amount / 1_000_000).toFixed(1) + "M";}
              else if (amount >= 1_000_000) { return totally= (amount / 1_000_000).toFixed(1) + "M";}
              else if (amount >= 100_000) {return totally= Math.round(amount / 1_000) + "K";}
              else if (amount >= 10_000){ return totally= Math.round(amount / 1_000) + "K";}
              else if (amount >= 1_000){ return totally= Math.round(amount / 1_000) + "K";}
              return totally;
            };
            const total:string = formattedAmount(totalquant);
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
      {!pageLoading ? (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-black flex flex-col pl-4 overflow-auto"
          >
          {/*leaderboard page header*/}
          <div className="flex items-center">
            <Image 
            src={trophy}
            alt="trophy"
            width={45}
            height={45}
            />
          <div className="flex flex-col pl-2">
            <div className="text-2xl font-bold">Leaderboard</div>
            <div className="text-base font-normal text-zinc-500">Climb up the ranks with your frens.</div>
          </div>
          </div>
            {/*general stats: total users and total QNTM*/}
            <div className="flex flex-col mt-8">
              <div className="text-base font-medium">General stats</div>
                <div className="flex items-center justify-center gap-x-16 mt-5">
                  <div className="flex flex-col items-center">
                  <Image 
                  src={smiling}
                  alt="smiling"
                  width={40}
                  height={40}
                  />
                <div className="text-sm">Total Users</div>
                <div className="text-sm bg-gradient-to-r from-teal-400 to-yellow-200 bg-clip-text text-transparent">{totalUsers}</div>
                </div>
                <div className="flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="2.5em" height="2.5em" viewBox="0 0 32 32">
	<path fill="currentColor" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667" />
</svg>
                <div className="text-sm">Total QNTM</div>
                <div className="text-sm bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">{totalQuant}</div>
                </div>
                </div>
              </div>
            {/*user stats card*/}
            <div className="mt-5">
              <div className="font-medium">Your stats</div>
              <div className="bg-orange-200 p-6 rounded-2xl max-w-xs mt-3">
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
                          fill="#000"
                          d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667"
                        />
                      </svg>
                    </div>
                    <div className="font-medium">
                      <div className="text-black text-base">
                        {username ? username : "Quantum User"}
                      </div>
                      <div className="text-black text-sm">
                        {MainQuantAmount} QNTM
                      </div>
                    </div>
                  </div>
                  <div className="font-medium text-black">#{userRank}</div>
                </div>
              </div>
            </div>
            {/*leaderboard list*/}
            <div className="font-semibold mt-5">Ranks</div>
            <div className="mt-3 space-y-0 rounded-2xl">
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
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="2em"
                            height="2em"
                            viewBox="0 0 32 32"
                          >
                            <g fill="none">
                              <g filter="url(#f0idc)">
                                <path
                                  fill="#4686ec"
                                  d="m14.035 3.552l4.264 7.284l-6.016 1.71C8.128 11.173 5.681 8.53 4.205 5.814c-.622-1.146-.617-3.25 1.856-3.25h6.248a2 2 0 0 1 1.726.989"
                                />
                                <path
                                  fill="url(#f0id8)"
                                  d="m14.035 3.552l4.264 7.284l-6.016 1.71C8.128 11.173 5.681 8.53 4.205 5.814c-.622-1.146-.617-3.25 1.856-3.25h6.248a2 2 0 0 1 1.726.989"
                                />
                                <path
                                  fill="url(#f0id0)"
                                  d="m14.035 3.552l4.264 7.284l-6.016 1.71C8.128 11.173 5.681 8.53 4.205 5.814c-.622-1.146-.617-3.25 1.856-3.25h6.248a2 2 0 0 1 1.726.989"
                                />
                              </g>
                              <g filter="url(#f0idd)">
                                <path
                                  fill="#4686ec"
                                  d="m17.812 3.552l-4.264 7.284l6.016 1.71c4.155-1.374 6.602-4.017 8.078-6.733c.622-1.146.617-3.25-1.856-3.25h-6.248a2 2 0 0 0-1.726.989"
                                />
                                <path
                                  fill="url(#f0id9)"
                                  d="m17.812 3.552l-4.264 7.284l6.016 1.71c4.155-1.374 6.602-4.017 8.078-6.733c.622-1.146.617-3.25-1.856-3.25h-6.248a2 2 0 0 0-1.726.989"
                                />
                                <path
                                  fill="url(#f0id1)"
                                  d="m17.812 3.552l-4.264 7.284l6.016 1.71c4.155-1.374 6.602-4.017 8.078-6.733c.622-1.146.617-3.25-1.856-3.25h-6.248a2 2 0 0 0-1.726.989"
                                />
                              </g>
                              <path
                                fill="url(#f0id2)"
                                d="m17.812 3.552l-4.264 7.284l6.016 1.71c4.155-1.374 6.602-4.017 8.078-6.733c.622-1.146.617-3.25-1.856-3.25h-6.248a2 2 0 0 0-1.726.989"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="10.048"
                                fill="url(#f0id3)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="10.048"
                                fill="url(#f0id4)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="8.688"
                                fill="url(#f0id5)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="7.585"
                                fill="url(#f0id6)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="7.585"
                                fill="url(#f0ida)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="7.585"
                                fill="url(#f0idb)"
                              />
                              <g filter="url(#f0ide)">
                                <path
                                  fill="#6f3955"
                                  d="M17.22 16.8a.8.8 0 0 0-.8-.8h-1.94a.4.4 0 0 0-.4.4v1.177c0 .22.178.4.4.4h.443a.25.25 0 0 1 .25.25V24a.5.5 0 0 0 .5.5h1.047a.5.5 0 0 0 .5-.5z"
                                />
                              </g>
                              <path
                                fill="url(#f0id7)"
                                d="M17.22 16.8a.8.8 0 0 0-.8-.8h-1.94a.4.4 0 0 0-.4.4v1.177c0 .22.178.4.4.4h.443a.25.25 0 0 1 .25.25V24a.5.5 0 0 0 .5.5h1.047a.5.5 0 0 0 .5-.5z"
                              />
                              <defs>
                                <linearGradient
                                  id="f0id0"
                                  x1="6.582"
                                  x2="8.377"
                                  y1="2.023"
                                  y2="6.493"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#3d89ec" />
                                  <stop
                                    offset="1"
                                    stopColor="#3d89ec"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                                <linearGradient
                                  id="f0id1"
                                  x1="25.265"
                                  x2="23.47"
                                  y1="2.023"
                                  y2="6.493"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#3d89ec" />
                                  <stop
                                    offset="1"
                                    stopColor="#3d89ec"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                                <linearGradient
                                  id="f0id2"
                                  x1="15.749"
                                  x2="16.086"
                                  y1="7.063"
                                  y2="7.25"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#1a6dd8" />
                                  <stop
                                    offset="1"
                                    stopColor="#1a6dd8"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                                <linearGradient
                                  id="f0id3"
                                  x1="21.418"
                                  x2="14.413"
                                  y1="16.57"
                                  y2="23.434"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#f4c654" />
                                  <stop offset="1" stopColor="#dc9729" />
                                </linearGradient>
                                <linearGradient
                                  id="f0id4"
                                  x1="12.536"
                                  x2="14.802"
                                  y1="30.668"
                                  y2="17.527"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#fa8547" />
                                  <stop
                                    offset="1"
                                    stopColor="#fa8547"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                                <linearGradient
                                  id="f0id5"
                                  x1="23.963"
                                  x2="16.047"
                                  y1="18.613"
                                  y2="18.613"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#f9a842" />
                                  <stop offset="1" stopColor="#faa742" />
                                  <stop offset="1" stopColor="#faa742" />
                                </linearGradient>
                                <linearGradient
                                  id="f0id6"
                                  x1="12.541"
                                  x2="23.855"
                                  y1="19.17"
                                  y2="19.17"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#faa945" />
                                  <stop offset="1" stopColor="#ec9936" />
                                </linearGradient>
                                <linearGradient
                                  id="f0id7"
                                  x1="16.423"
                                  x2="16.423"
                                  y1="24.5"
                                  y2="23.683"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#693b2e" />
                                  <stop
                                    offset="1"
                                    stopColor="#693b2e"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                                <radialGradient
                                  id="f0id8"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="rotate(-123.321 9.745 2.387)scale(4.60352 17.1923)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#3669d9" />
                                  <stop
                                    offset="1"
                                    stopColor="#3669d9"
                                    stopOpacity="0"
                                  />
                                </radialGradient>
                                <radialGradient
                                  id="f0id9"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="rotate(-57.265 20.217 -11.245)scale(3.0487 6.68733)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#3669d9" />
                                  <stop
                                    offset="1"
                                    stopColor="#3669d9"
                                    stopOpacity="0"
                                  />
                                </radialGradient>
                                <radialGradient
                                  id="f0ida"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="matrix(-10.5257 0 0 -8.96905 18.988 20.132)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop
                                    offset=".893"
                                    stopColor="#f7b44d"
                                    stopOpacity="0"
                                  />
                                  <stop offset="1" stopColor="#f7b44d" />
                                </radialGradient>
                                <radialGradient
                                  id="f0idb"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="matrix(10.128 0 0 8.88135 14.078 20.132)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop
                                    offset=".879"
                                    stopColor="#d2801f"
                                    stopOpacity="0"
                                  />
                                  <stop offset=".983" stopColor="#d2801f" />
                                </radialGradient>
                                <filter
                                  id="f0idc"
                                  width="14.889"
                                  height="10.434"
                                  x="3.61"
                                  y="2.362"
                                  colorInterpolationFilters="sRGB"
                                  filterUnits="userSpaceOnUse"
                                >
                                  <feFlood
                                    floodOpacity="0"
                                    result="BackgroundImageFix"
                                  />
                                  <feBlend
                                    in="SourceGraphic"
                                    in2="BackgroundImageFix"
                                    result="shape"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.2" dy="-.2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.317647 0 0 0 0 0.458824 0 0 0 0 0.886275 0 0 0 1 0" />
                                  <feBlend
                                    in2="shape"
                                    result="effect1_innerShadow_18_1526"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx=".2" dy=".2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.317647 0 0 0 0 0.458824 0 0 0 0 0.886275 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect1_innerShadow_18_1526"
                                    result="effect2_innerShadow_18_1526"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.25" dy=".25" />
                                  <feGaussianBlur stdDeviation=".25" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.372549 0 0 0 0 0.607843 0 0 0 0 0.960784 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect2_innerShadow_18_1526"
                                    result="effect3_innerShadow_18_1526"
                                  />
                                </filter>
                                <filter
                                  id="f0idd"
                                  width="14.889"
                                  height="10.434"
                                  x="13.298"
                                  y="2.362"
                                  colorInterpolationFilters="sRGB"
                                  filterUnits="userSpaceOnUse"
                                >
                                  <feFlood
                                    floodOpacity="0"
                                    result="BackgroundImageFix"
                                  />
                                  <feBlend
                                    in="SourceGraphic"
                                    in2="BackgroundImageFix"
                                    result="shape"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.2" dy="-.2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.317647 0 0 0 0 0.458824 0 0 0 0 0.886275 0 0 0 1 0" />
                                  <feBlend
                                    in2="shape"
                                    result="effect1_innerShadow_18_1526"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx=".2" dy=".2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.317647 0 0 0 0 0.458824 0 0 0 0 0.886275 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect1_innerShadow_18_1526"
                                    result="effect2_innerShadow_18_1526"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.25" dy=".25" />
                                  <feGaussianBlur stdDeviation=".25" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.372549 0 0 0 0 0.607843 0 0 0 0 0.960784 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect2_innerShadow_18_1526"
                                    result="effect3_innerShadow_18_1526"
                                  />
                                </filter>
                                <filter
                                  id="f0ide"
                                  width="3.641"
                                  height="9"
                                  x="13.779"
                                  y="15.8"
                                  colorInterpolationFilters="sRGB"
                                  filterUnits="userSpaceOnUse"
                                >
                                  <feFlood
                                    floodOpacity="0"
                                    result="BackgroundImageFix"
                                  />
                                  <feBlend
                                    in="SourceGraphic"
                                    in2="BackgroundImageFix"
                                    result="shape"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.3" dy=".3" />
                                  <feGaussianBlur stdDeviation=".3" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.392157 0 0 0 0 0.164706 0 0 0 0 0.254902 0 0 0 1 0" />
                                  <feBlend
                                    in2="shape"
                                    result="effect1_innerShadow_18_1526"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx=".2" dy="-.2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.501961 0 0 0 0 0.333333 0 0 0 0 0.360784 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect1_innerShadow_18_1526"
                                    result="effect2_innerShadow_18_1526"
                                  />
                                </filter>
                              </defs>
                            </g>
                          </svg>
                        )}
                        {index === 1 && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="2em"
                            height="2em"
                            viewBox="0 0 32 32"
                          >
                            <g fill="none">
                              <g filter="url(#f1idc)">
                                <path
                                  fill="#4686ec"
                                  d="m14.035 3.552l4.264 7.284l-6.016 1.71C8.128 11.173 5.681 8.53 4.205 5.814c-.622-1.146-.617-3.25 1.856-3.25h6.248a2 2 0 0 1 1.726.989"
                                />
                                <path
                                  fill="url(#f1id7)"
                                  d="m14.035 3.552l4.264 7.284l-6.016 1.71C8.128 11.173 5.681 8.53 4.205 5.814c-.622-1.146-.617-3.25 1.856-3.25h6.248a2 2 0 0 1 1.726.989"
                                />
                                <path
                                  fill="url(#f1id0)"
                                  d="m14.035 3.552l4.264 7.284l-6.016 1.71C8.128 11.173 5.681 8.53 4.205 5.814c-.622-1.146-.617-3.25 1.856-3.25h6.248a2 2 0 0 1 1.726.989"
                                />
                              </g>
                              <g filter="url(#f1idd)">
                                <path
                                  fill="#4686ec"
                                  d="m17.812 3.552l-4.264 7.284l6.016 1.71c4.155-1.374 6.602-4.017 8.078-6.733c.622-1.146.617-3.25-1.856-3.25h-6.248a2 2 0 0 0-1.726.989"
                                />
                                <path
                                  fill="url(#f1id8)"
                                  d="m17.812 3.552l-4.264 7.284l6.016 1.71c4.155-1.374 6.602-4.017 8.078-6.733c.622-1.146.617-3.25-1.856-3.25h-6.248a2 2 0 0 0-1.726.989"
                                />
                                <path
                                  fill="url(#f1id1)"
                                  d="m17.812 3.552l-4.264 7.284l6.016 1.71c4.155-1.374 6.602-4.017 8.078-6.733c.622-1.146.617-3.25-1.856-3.25h-6.248a2 2 0 0 0-1.726.989"
                                />
                              </g>
                              <path
                                fill="url(#f1id2)"
                                d="m17.812 3.552l-4.264 7.284l6.016 1.71c4.155-1.374 6.602-4.017 8.078-6.733c.622-1.146.617-3.25-1.856-3.25h-6.248a2 2 0 0 0-1.726.989"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="10.048"
                                fill="url(#f1id3)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="10.048"
                                fill="url(#f1id4)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="8.688"
                                fill="url(#f1id5)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="7.585"
                                fill="url(#f1id6)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="7.585"
                                fill="url(#f1id9)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="7.585"
                                fill="url(#f1ida)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="7.585"
                                fill="url(#f1idb)"
                              />
                              <g filter="url(#f1ide)">
                                <path
                                  fill="#6a6372"
                                  d="M18.037 24.572h-3.97a1 1 0 0 1-.91-.58a1 1 0 0 1 .13-1.07l3.3-4.05c.26-.32.14-.66.1-.76a.64.64 0 0 0-.58-.4h-.05c-.32 0-.61.15-.8.41c-.32.45-.95.56-1.41.24a1.01 1.01 0 0 1-.24-1.41c.56-.79 1.47-1.26 2.44-1.26h.13c1.02.05 1.91.66 2.33 1.59c.43.96.29 2.05-.37 2.86l-1.95 2.4h1.84c.56 0 1.01.45 1.01 1.01s-.44 1.02-1 1.02"
                                />
                              </g>
                              <defs>
                                <linearGradient
                                  id="f1id0"
                                  x1="6.582"
                                  x2="8.377"
                                  y1="2.023"
                                  y2="6.493"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#3d89ec" />
                                  <stop
                                    offset="1"
                                    stopColor="#3d89ec"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                                <linearGradient
                                  id="f1id1"
                                  x1="25.265"
                                  x2="23.47"
                                  y1="2.023"
                                  y2="6.493"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#3d89ec" />
                                  <stop
                                    offset="1"
                                    stopColor="#3d89ec"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                                <linearGradient
                                  id="f1id2"
                                  x1="15.749"
                                  x2="16.086"
                                  y1="7.063"
                                  y2="7.25"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#1a6dd8" />
                                  <stop
                                    offset="1"
                                    stopColor="#1a6dd8"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                                <linearGradient
                                  id="f1id3"
                                  x1="23.797"
                                  x2="14.45"
                                  y1="14.938"
                                  y2="23.484"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#efeaf6" />
                                  <stop offset="1" stopColor="#b5a8c3" />
                                </linearGradient>
                                <linearGradient
                                  id="f1id4"
                                  x1="12.536"
                                  x2="14.802"
                                  y1="30.668"
                                  y2="17.527"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#d0a9f4" />
                                  <stop
                                    offset="1"
                                    stopColor="#d0a9f4"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                                <linearGradient
                                  id="f1id5"
                                  x1="23.963"
                                  x2="16.047"
                                  y1="18.613"
                                  y2="18.613"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#d3c6e2" />
                                  <stop offset="1" stopColor="#d6c6e8" />
                                </linearGradient>
                                <linearGradient
                                  id="f1id6"
                                  x1="11.286"
                                  x2="23.909"
                                  y1="22.103"
                                  y2="18.283"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#e0d3ef" />
                                  <stop offset="1" stopColor="#c1b0d4" />
                                </linearGradient>
                                <radialGradient
                                  id="f1id7"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="rotate(-123.321 9.745 2.387)scale(4.60352 17.1923)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#3669d9" />
                                  <stop
                                    offset="1"
                                    stopColor="#3669d9"
                                    stopOpacity="0"
                                  />
                                </radialGradient>
                                <radialGradient
                                  id="f1id8"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="rotate(-57.265 20.217 -11.245)scale(3.0487 6.68733)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#3669d9" />
                                  <stop
                                    offset="1"
                                    stopColor="#3669d9"
                                    stopOpacity="0"
                                  />
                                </radialGradient>
                                <radialGradient
                                  id="f1id9"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="rotate(156.644 7.501 11.447)scale(11.397 9.71148)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop
                                    offset=".837"
                                    stopColor="#f6ecfe"
                                    stopOpacity="0"
                                  />
                                  <stop offset="1" stopColor="#f6ecfe" />
                                </radialGradient>
                                <radialGradient
                                  id="f1ida"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="rotate(-41.294 35.446 -9.492)scale(8.96398 8.60716)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop
                                    offset=".91"
                                    stopColor="#b396cf"
                                    stopOpacity="0"
                                  />
                                  <stop offset=".992" stopColor="#b796d5" />
                                </radialGradient>
                                <radialGradient
                                  id="f1idb"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="matrix(6.65625 5.1875 -5.87867 7.54311 15.828 19.5)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop
                                    offset=".926"
                                    stopColor="#ab9cbb"
                                    stopOpacity="0"
                                  />
                                  <stop offset="1" stopColor="#ab9cbb" />
                                </radialGradient>
                                <filter
                                  id="f1idc"
                                  width="14.889"
                                  height="10.434"
                                  x="3.61"
                                  y="2.362"
                                  colorInterpolationFilters="sRGB"
                                  filterUnits="userSpaceOnUse"
                                >
                                  <feFlood
                                    floodOpacity="0"
                                    result="BackgroundImageFix"
                                  />
                                  <feBlend
                                    in="SourceGraphic"
                                    in2="BackgroundImageFix"
                                    result="shape"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.2" dy="-.2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.317647 0 0 0 0 0.458824 0 0 0 0 0.886275 0 0 0 1 0" />
                                  <feBlend
                                    in2="shape"
                                    result="effect1_innerShadow_18_1566"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx=".2" dy=".2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.317647 0 0 0 0 0.458824 0 0 0 0 0.886275 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect1_innerShadow_18_1566"
                                    result="effect2_innerShadow_18_1566"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.25" dy=".25" />
                                  <feGaussianBlur stdDeviation=".25" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.372549 0 0 0 0 0.607843 0 0 0 0 0.960784 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect2_innerShadow_18_1566"
                                    result="effect3_innerShadow_18_1566"
                                  />
                                </filter>
                                <filter
                                  id="f1idd"
                                  width="14.889"
                                  height="10.434"
                                  x="13.298"
                                  y="2.362"
                                  colorInterpolationFilters="sRGB"
                                  filterUnits="userSpaceOnUse"
                                >
                                  <feFlood
                                    floodOpacity="0"
                                    result="BackgroundImageFix"
                                  />
                                  <feBlend
                                    in="SourceGraphic"
                                    in2="BackgroundImageFix"
                                    result="shape"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.2" dy="-.2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.317647 0 0 0 0 0.458824 0 0 0 0 0.886275 0 0 0 1 0" />
                                  <feBlend
                                    in2="shape"
                                    result="effect1_innerShadow_18_1566"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx=".2" dy=".2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.317647 0 0 0 0 0.458824 0 0 0 0 0.886275 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect1_innerShadow_18_1566"
                                    result="effect2_innerShadow_18_1566"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.25" dy=".25" />
                                  <feGaussianBlur stdDeviation=".25" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.372549 0 0 0 0 0.607843 0 0 0 0 0.960784 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect2_innerShadow_18_1566"
                                    result="effect3_innerShadow_18_1566"
                                  />
                                </filter>
                                <filter
                                  id="f1ide"
                                  width="6.48"
                                  height="9.38"
                                  x="12.757"
                                  y="15.492"
                                  colorInterpolationFilters="sRGB"
                                  filterUnits="userSpaceOnUse"
                                >
                                  <feFlood
                                    floodOpacity="0"
                                    result="BackgroundImageFix"
                                  />
                                  <feBlend
                                    in="SourceGraphic"
                                    in2="BackgroundImageFix"
                                    result="shape"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.3" dy=".3" />
                                  <feGaussianBlur stdDeviation=".3" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.286275 0 0 0 0 0.223529 0 0 0 0 0.345098 0 0 0 1 0" />
                                  <feBlend
                                    in2="shape"
                                    result="effect1_innerShadow_18_1566"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx=".2" dy="-.2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.482353 0 0 0 0 0.47451 0 0 0 0 0.490196 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect1_innerShadow_18_1566"
                                    result="effect2_innerShadow_18_1566"
                                  />
                                </filter>
                              </defs>
                            </g>
                          </svg>
                        )}
                        {index === 2 && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="2em"
                            height="2em"
                            viewBox="0 0 32 32"
                          >
                            <g fill="none">
                              <g filter="url(#f2idc)">
                                <path
                                  fill="#4686ec"
                                  d="m14.035 3.552l4.264 7.284l-6.016 1.71C8.128 11.173 5.681 8.53 4.205 5.814c-.622-1.146-.617-3.25 1.856-3.25h6.248a2 2 0 0 1 1.726.989"
                                />
                                <path
                                  fill="url(#f2id7)"
                                  d="m14.035 3.552l4.264 7.284l-6.016 1.71C8.128 11.173 5.681 8.53 4.205 5.814c-.622-1.146-.617-3.25 1.856-3.25h6.248a2 2 0 0 1 1.726.989"
                                />
                                <path
                                  fill="url(#f2id0)"
                                  d="m14.035 3.552l4.264 7.284l-6.016 1.71C8.128 11.173 5.681 8.53 4.205 5.814c-.622-1.146-.617-3.25 1.856-3.25h6.248a2 2 0 0 1 1.726.989"
                                />
                              </g>
                              <g filter="url(#f2idd)">
                                <path
                                  fill="#4686ec"
                                  d="m17.812 3.552l-4.264 7.284l6.016 1.71c4.155-1.374 6.602-4.017 8.078-6.733c.622-1.146.617-3.25-1.856-3.25h-6.248a2 2 0 0 0-1.726.989"
                                />
                                <path
                                  fill="url(#f2id8)"
                                  d="m17.812 3.552l-4.264 7.284l6.016 1.71c4.155-1.374 6.602-4.017 8.078-6.733c.622-1.146.617-3.25-1.856-3.25h-6.248a2 2 0 0 0-1.726.989"
                                />
                                <path
                                  fill="url(#f2id1)"
                                  d="m17.812 3.552l-4.264 7.284l6.016 1.71c4.155-1.374 6.602-4.017 8.078-6.733c.622-1.146.617-3.25-1.856-3.25h-6.248a2 2 0 0 0-1.726.989"
                                />
                              </g>
                              <path
                                fill="url(#f2id2)"
                                d="m17.812 3.552l-4.264 7.284l6.016 1.71c4.155-1.374 6.602-4.017 8.078-6.733c.622-1.146.617-3.25-1.856-3.25h-6.248a2 2 0 0 0-1.726.989"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="10.048"
                                fill="url(#f2id3)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="10.048"
                                fill="url(#f2id4)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="8.688"
                                fill="url(#f2id5)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="7.585"
                                fill="url(#f2id6)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="7.585"
                                fill="url(#f2id9)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="7.585"
                                fill="url(#f2ida)"
                              />
                              <circle
                                cx="16.047"
                                cy="20.132"
                                r="7.585"
                                fill="url(#f2idb)"
                              />
                              <g filter="url(#f2ide)">
                                <path
                                  fill="#6c3f48"
                                  d="m17.46 18.675l1.046-1.81a.98.98 0 0 0 0-.976a.97.97 0 0 0-.843-.489H14.57a.976.976 0 0 0 0 1.953h.972a.25.25 0 0 1 .217.374l-.538.938a.96.96 0 0 0-.214.6c0 .539.438.976.977.976c.61 0 1.108.498 1.108 1.108s-.498 1.109-1.108 1.109a1.1 1.1 0 0 1-1.038-.732a.975.975 0 0 0-1.24-.59a.966.966 0 0 0-.59 1.24a3.06 3.06 0 0 0 2.867 2.024a3.053 3.053 0 0 0 3.051-3.05a3.07 3.07 0 0 0-1.576-2.675"
                                />
                              </g>
                              <defs>
                                <linearGradient
                                  id="f2id0"
                                  x1="6.582"
                                  x2="8.377"
                                  y1="2.023"
                                  y2="6.493"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#3d89ec" />
                                  <stop
                                    offset="1"
                                    stopColor="#3d89ec"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                                <linearGradient
                                  id="f2id1"
                                  x1="25.265"
                                  x2="23.47"
                                  y1="2.023"
                                  y2="6.493"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#3d89ec" />
                                  <stop
                                    offset="1"
                                    stopColor="#3d89ec"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                                <linearGradient
                                  id="f2id2"
                                  x1="15.749"
                                  x2="16.086"
                                  y1="7.063"
                                  y2="7.25"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#1a6dd8" />
                                  <stop
                                    offset="1"
                                    stopColor="#1a6dd8"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                                <linearGradient
                                  id="f2id3"
                                  x1="23.797"
                                  x2="14.45"
                                  y1="14.938"
                                  y2="23.484"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#f6bc7f" />
                                  <stop offset="1" stopColor="#a76740" />
                                </linearGradient>
                                <linearGradient
                                  id="f2id4"
                                  x1="12.536"
                                  x2="14.802"
                                  y1="30.668"
                                  y2="17.527"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#b05b5b" />
                                  <stop
                                    offset="1"
                                    stopColor="#b05b5b"
                                    stopOpacity="0"
                                  />
                                </linearGradient>
                                <linearGradient
                                  id="f2id5"
                                  x1="23.963"
                                  x2="16.047"
                                  y1="18.613"
                                  y2="18.613"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#cd8858" />
                                  <stop offset="1" stopColor="#d28d59" />
                                </linearGradient>
                                <linearGradient
                                  id="f2id6"
                                  x1="11.286"
                                  x2="23.909"
                                  y1="22.103"
                                  y2="18.283"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#d38e5f" />
                                  <stop offset="1" stopColor="#be794e" />
                                </linearGradient>
                                <radialGradient
                                  id="f2id7"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="rotate(-123.321 9.745 2.387)scale(4.60352 17.1923)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#3669d9" />
                                  <stop
                                    offset="1"
                                    stopColor="#3669d9"
                                    stopOpacity="0"
                                  />
                                </radialGradient>
                                <radialGradient
                                  id="f2id8"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="rotate(-57.265 20.217 -11.245)scale(3.0487 6.68733)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop stopColor="#3669d9" />
                                  <stop
                                    offset="1"
                                    stopColor="#3669d9"
                                    stopOpacity="0"
                                  />
                                </radialGradient>
                                <radialGradient
                                  id="f2id9"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="rotate(156.644 7.501 11.447)scale(11.397 9.71148)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop
                                    offset=".837"
                                    stopColor="#e5ac75"
                                    stopOpacity="0"
                                  />
                                  <stop offset="1" stopColor="#e5ac75" />
                                </radialGradient>
                                <radialGradient
                                  id="f2ida"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="rotate(-41.294 35.446 -9.492)scale(8.96398 8.60716)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop
                                    offset=".91"
                                    stopColor="#b36441"
                                    stopOpacity="0"
                                  />
                                  <stop offset="1" stopColor="#b36441" />
                                </radialGradient>
                                <radialGradient
                                  id="f2idb"
                                  cx="0"
                                  cy="0"
                                  r="1"
                                  gradientTransform="matrix(6.65625 5.1875 -5.87867 7.54311 15.828 19.5)"
                                  gradientUnits="userSpaceOnUse"
                                >
                                  <stop
                                    offset=".926"
                                    stopColor="#ab662b"
                                    stopOpacity="0"
                                  />
                                  <stop offset="1" stopColor="#ab662b" />
                                </radialGradient>
                                <filter
                                  id="f2idc"
                                  width="14.889"
                                  height="10.434"
                                  x="3.61"
                                  y="2.362"
                                  colorInterpolationFilters="sRGB"
                                  filterUnits="userSpaceOnUse"
                                >
                                  <feFlood
                                    floodOpacity="0"
                                    result="BackgroundImageFix"
                                  />
                                  <feBlend
                                    in="SourceGraphic"
                                    in2="BackgroundImageFix"
                                    result="shape"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.2" dy="-.2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.317647 0 0 0 0 0.458824 0 0 0 0 0.886275 0 0 0 1 0" />
                                  <feBlend
                                    in2="shape"
                                    result="effect1_innerShadow_18_1616"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx=".2" dy=".2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.317647 0 0 0 0 0.458824 0 0 0 0 0.886275 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect1_innerShadow_18_1616"
                                    result="effect2_innerShadow_18_1616"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.25" dy=".25" />
                                  <feGaussianBlur stdDeviation=".25" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.372549 0 0 0 0 0.607843 0 0 0 0 0.960784 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect2_innerShadow_18_1616"
                                    result="effect3_innerShadow_18_1616"
                                  />
                                </filter>
                                <filter
                                  id="f2idd"
                                  width="14.889"
                                  height="10.434"
                                  x="13.298"
                                  y="2.362"
                                  colorInterpolationFilters="sRGB"
                                  filterUnits="userSpaceOnUse"
                                >
                                  <feFlood
                                    floodOpacity="0"
                                    result="BackgroundImageFix"
                                  />
                                  <feBlend
                                    in="SourceGraphic"
                                    in2="BackgroundImageFix"
                                    result="shape"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.2" dy="-.2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.317647 0 0 0 0 0.458824 0 0 0 0 0.886275 0 0 0 1 0" />
                                  <feBlend
                                    in2="shape"
                                    result="effect1_innerShadow_18_1616"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx=".2" dy=".2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.317647 0 0 0 0 0.458824 0 0 0 0 0.886275 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect1_innerShadow_18_1616"
                                    result="effect2_innerShadow_18_1616"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.25" dy=".25" />
                                  <feGaussianBlur stdDeviation=".25" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.372549 0 0 0 0 0.607843 0 0 0 0 0.960784 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect2_innerShadow_18_1616"
                                    result="effect3_innerShadow_18_1616"
                                  />
                                </filter>
                                <filter
                                  id="f2ide"
                                  width="6.477"
                                  height="9.5"
                                  x="12.759"
                                  y="15.2"
                                  colorInterpolationFilters="sRGB"
                                  filterUnits="userSpaceOnUse"
                                >
                                  <feFlood
                                    floodOpacity="0"
                                    result="BackgroundImageFix"
                                  />
                                  <feBlend
                                    in="SourceGraphic"
                                    in2="BackgroundImageFix"
                                    result="shape"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx="-.3" dy=".3" />
                                  <feGaussianBlur stdDeviation=".3" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.270588 0 0 0 0 0.113725 0 0 0 0 0.0745098 0 0 0 1 0" />
                                  <feBlend
                                    in2="shape"
                                    result="effect1_innerShadow_18_1616"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx=".2" dy="-.2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.490196 0 0 0 0 0.352941 0 0 0 0 0.321569 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect1_innerShadow_18_1616"
                                    result="effect2_innerShadow_18_1616"
                                  />
                                  <feColorMatrix
                                    in="SourceAlpha"
                                    result="hardAlpha"
                                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                  />
                                  <feOffset dx=".2" dy=".2" />
                                  <feGaussianBlur stdDeviation=".2" />
                                  <feComposite
                                    in2="hardAlpha"
                                    k2="-1"
                                    k3="1"
                                    operator="arithmetic"
                                  />
                                  <feColorMatrix values="0 0 0 0 0.270588 0 0 0 0 0.113725 0 0 0 0 0.0745098 0 0 0 1 0" />
                                  <feBlend
                                    in2="effect2_innerShadow_18_1616"
                                    result="effect3_innerShadow_18_1616"
                                  />
                                </filter>
                              </defs>
                            </g>
                          </svg>
                        )}
                        {index > 2 && <div>#{index + 1}</div>}
                      </div>
                    </div>
                  ))
                ) : (
                  <Loader />
                )
              ) : (
                <div>
                  <Loader />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="fixed inset-0 flex items-center justify-center">
          <Loader />
        </div>
      )}
    </div>
  );
};

export default LeaderboardPageContent;
