"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import Loader from "../loading";
import { useLeaderboardContext } from "@/app/contexts/LeaderboardContext";
import { useGameContext } from "@/app/contexts/MiningContext";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { dbfs } from "@/app/firebase/firebaseConfig";
import { bgLeaderboardCard } from "../images";
const LeaderboardPageContent = () => {
  const pathname = usePathname();
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
              throw new Error("Network response was not ok");
            }
            const data = await response.json();
            setLeaderboardContext(data.allValues);
            const totalquant:number = data.totalAmount;
            setTotalUsers(data.userCount);
            sessionStorage.setItem("lboard", JSON.stringify(data.allValues));
            const formattedAmount = (total:number) => {
              const amount = total;
              let totally:string = ""
              if (amount >= 100_000_000_000)
                totally= Math.round(amount / 1_000_000_000) + "B";
              if (amount >= 10_000_000_000)
                totally= Math.round(amount / 1_000_000_000) + "B";
              if (amount >= 1_000_000_000)
                totally= Math.round(amount / 1_000_000_000) + "B";
              if (amount >= 100_000_000)
                totally= (amount / 1_000_000).toFixed(1) + "M";
              if (amount >= 10_000_000)
                totally= (amount / 1_000_000).toFixed(1) + "M";
              if (amount >= 1_000_000)
                totally= (amount / 1_000_000).toFixed(1) + "M";
              if (amount >= 100_000) totally= Math.round(amount / 1_000) + "K";
              if (amount >= 10_000) totally= Math.round(amount / 1_000) + "K";
              if (amount >= 1_000) totally= Math.round(amount / 1_000) + "K";
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
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-black overflow-auto"
          >
            {/*welcoming card*/}
            <div className="px-4">
              <div
                className="flex items-center justify-between bg-cover bg-center p-6 rounded-2xl"
                style={{ backgroundImage: `url(${bgLeaderboardCard.src})` }}
              >
                <div className="flex flex-col">
                  <div className="font-medium text-xl">Leaderboard</div>
                  <div className="font-medium text-sm mt-1 text-gray-500">
                    Climb up the ranks with your frens.
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="4em"
                  height="4em"
                  viewBox="0 0 32 32"
                >
                  <g fill="none">
                    <g filter="url(#f2389idk)">
                      <path
                        fill="url(#f2389idf)"
                        d="M17.375 11.66c-.2-.02-.4-.04-.6-.08c-1.24-.22-2.4-.78-3.34-1.64c-2.74-2.11-6.01-4.77-7.68-7.78h-.35c-1.45 0-2.36 1.56-1.65 2.82c1.32 2.33 3.18 4.31 5.42 5.77c.76.59 4.546 2.869 5.506 2.869z"
                      />
                      <path
                        fill="url(#f2389idg)"
                        d="M17.375 11.66c-.2-.02-.4-.04-.6-.08c-1.24-.22-2.4-.78-3.34-1.64c-2.74-2.11-6.01-4.77-7.68-7.78h-.35c-1.45 0-2.36 1.56-1.65 2.82c1.32 2.33 3.18 4.31 5.42 5.77c.76.59 4.546 2.869 5.506 2.869z"
                      />
                    </g>
                    <path
                      fill="url(#f2389id0)"
                      d="m16.205 7.37l.176 1.239l-1.563 1.195L9.797 2.15h2.178c.67 0 1.29.35 1.62.93z"
                    />
                    <path
                      fill="url(#f2389id1)"
                      d="m19.282 8.656l-1.67 3.014h2.643c.97 0-.76 1.226 0 .636c2.457-1.03 6.77-4.986 8.08-7.316c.72-1.27-.2-2.83-1.64-2.83h-.35c-2.192 2.29-4.725 4.585-7.063 6.496"
                    />
                    <path
                      fill="url(#f2389id2)"
                      d="M16.015 11.629q-.146.017-.29.031l-.2.24l.21-.327a6.66 6.66 0 0 1-3.3-1.633c-2.74-2.11-5.218-4.78-6.888-7.79h4.388z"
                    />
                    <path
                      fill="url(#f2389id3)"
                      d="M16.015 11.629q-.146.017-.29.031l-.2.24l.21-.327a6.66 6.66 0 0 1-3.3-1.633c-2.74-2.11-5.218-4.78-6.888-7.79h4.388z"
                    />
                    <path
                      fill="url(#f2389id4)"
                      d="m16.609 10.211l.18 1.27a6.65 6.65 0 0 0 2.876-1.54c2.74-2.11 5.01-4.77 6.68-7.78h-4.57z"
                    />
                    <path
                      fill="url(#f2389id5)"
                      d="m16.609 10.211l.18 1.27a6.65 6.65 0 0 0 2.876-1.54c2.74-2.11 5.01-4.77 6.68-7.78h-4.57z"
                    />
                    <path
                      fill="url(#f2389id6)"
                      d="M16.421 11.66h-.046l.2.24z"
                    />
                    <path
                      fill="url(#f2389id7)"
                      d="M16.421 11.66h-.046l.2.24z"
                    />
                    <path
                      fill="url(#f2389id8)"
                      d="M22.155 2.16h-2.04c-.67 0-1.28.35-1.62.93l-5.22 8.58h2.78z"
                    />
                    <path
                      fill="url(#f2389id9)"
                      d="M22.155 2.16h-2.04c-.67 0-1.28.35-1.62.93l-5.22 8.58h2.78z"
                    />
                    <path
                      fill="url(#f2389ida)"
                      d="M16.037 30.094c5.545 0 10.04-4.607 10.04-10.29s-4.495-10.29-10.04-10.29s-10.04 4.607-10.04 10.29s4.495 10.29 10.04 10.29"
                    />
                    <path
                      fill="url(#f2389idb)"
                      d="M16.037 30.094c5.545 0 10.04-4.607 10.04-10.29s-4.495-10.29-10.04-10.29s-10.04 4.607-10.04 10.29s4.495 10.29 10.04 10.29"
                    />
                    <path
                      fill="url(#f2389idc)"
                      d="M16.037 28.244c4.545 0 8.23-3.779 8.23-8.44s-3.685-8.44-8.23-8.44s-8.23 3.779-8.23 8.44c0 4.662 3.685 8.44 8.23 8.44"
                    />
                    <path
                      fill="url(#f2389idh)"
                      d="M16.037 28.244c4.545 0 8.23-3.779 8.23-8.44s-3.685-8.44-8.23-8.44s-8.23 3.779-8.23 8.44c0 4.662 3.685 8.44 8.23 8.44"
                    />
                    <path
                      fill="url(#f2389idi)"
                      d="M16.037 28.244c4.545 0 8.23-3.779 8.23-8.44s-3.685-8.44-8.23-8.44s-8.23 3.779-8.23 8.44c0 4.662 3.685 8.44 8.23 8.44"
                    />
                    <path
                      fill="url(#f2389idd)"
                      d="M16.047 28.854c-2.36 0-4.58-.94-6.24-2.65a9.1 9.1 0 0 1-2.59-6.4c0-2.42.92-4.69 2.59-6.4a8.69 8.69 0 0 1 12.49 0c3.44 3.53 3.44 9.27 0 12.8c-1.68 1.71-3.9 2.65-6.25 2.65m-.01-16.87c-1.95 0-3.91.76-5.39 2.29a7.87 7.87 0 0 0-2.23 5.53c0 2.09.79 4.05 2.23 5.53a7.48 7.48 0 0 0 5.39 2.29c2.04 0 3.95-.81 5.39-2.29c2.97-3.05 2.97-8.01 0-11.06a7.46 7.46 0 0 0-5.39-2.29"
                    />
                    <g filter="url(#f2389idl)">
                      <path
                        fill="url(#f2389ide)"
                        d="m16.647 15.754l.83 1.72c.1.2.29.35.51.38l1.85.28c.55.08.78.78.37 1.18l-1.28 1.28c-.19.19-.25.47-.17.73l.59 1.71c.2.57-.36 1.11-.91.87l-2.14-.96a.64.64 0 0 0-.54 0l-2.14.96c-.54.24-1.11-.3-.91-.87l.59-1.71c.09-.26.02-.54-.17-.73l-1.28-1.28c-.4-.4-.18-1.1.37-1.18l1.85-.28c.22-.03.41-.17.51-.38l.83-1.72c.27-.52.99-.52 1.24 0"
                      />
                      <path
                        fill="url(#f2389idj)"
                        d="m16.647 15.754l.83 1.72c.1.2.29.35.51.38l1.85.28c.55.08.78.78.37 1.18l-1.28 1.28c-.19.19-.25.47-.17.73l.59 1.71c.2.57-.36 1.11-.91.87l-2.14-.96a.64.64 0 0 0-.54 0l-2.14.96c-.54.24-1.11-.3-.91-.87l.59-1.71c.09-.26.02-.54-.17-.73l-1.28-1.28c-.4-.4-.18-1.1.37-1.18l1.85-.28c.22-.03.41-.17.51-.38l.83-1.72c.27-.52.99-.52 1.24 0"
                      />
                    </g>
                    <defs>
                      <linearGradient
                        id="f2389id0"
                        x1="11.324"
                        x2="16.381"
                        y1="2.15"
                        y2="9.804"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#f53f56" />
                        <stop offset="1" stopColor="#ea3586" />
                      </linearGradient>
                      <linearGradient
                        id="f2389id1"
                        x1="25.661"
                        x2="25.148"
                        y1="3.874"
                        y2="10.387"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#fd4058" />
                        <stop offset="1" stopColor="#f62e9e" />
                      </linearGradient>
                      <linearGradient
                        id="f2389id2"
                        x1="13.307"
                        x2="7.764"
                        y1="2.996"
                        y2="11.7"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#e3d4f3" />
                        <stop offset="1" stopColor="#e3c2f5" />
                      </linearGradient>
                      <linearGradient
                        id="f2389id3"
                        x1="13.91"
                        x2="13.91"
                        y1="1.811"
                        y2="3.47"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#d3ccd9" />
                        <stop offset="1" stopColor="#d3ccd9" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient
                        id="f2389id4"
                        x1="23.49"
                        x2="17.766"
                        y1="3.005"
                        y2="11.255"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#e3d4f3" />
                        <stop offset="1" stopColor="#e3c2f5" />
                      </linearGradient>
                      <linearGradient
                        id="f2389id5"
                        x1="24.042"
                        x2="24.042"
                        y1="1.821"
                        y2="3.479"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#d3ccd9" />
                        <stop offset="1" stopColor="#d3ccd9" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient
                        id="f2389id6"
                        x1="23.49"
                        x2="17.766"
                        y1="3.005"
                        y2="11.255"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#e3d4f3" />
                        <stop offset="1" stopColor="#e3c2f5" />
                      </linearGradient>
                      <linearGradient
                        id="f2389id7"
                        x1="24.042"
                        x2="24.042"
                        y1="1.821"
                        y2="3.479"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#d3ccd9" />
                        <stop offset="1" stopColor="#d3ccd9" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient
                        id="f2389id8"
                        x1="20.93"
                        x2="16.305"
                        y1="2.713"
                        y2="10.838"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#3ea0f4" />
                        <stop offset="1" stopColor="#437ee0" />
                      </linearGradient>
                      <linearGradient
                        id="f2389id9"
                        x1="15.093"
                        x2="16.047"
                        y1="7.318"
                        y2="7.954"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#6c65c0" />
                        <stop offset="1" stopColor="#6c65c0" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient
                        id="f2389ida"
                        x1="21.404"
                        x2="13.341"
                        y1="16.157"
                        y2="29.782"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#f4c654" />
                        <stop offset="1" stopColor="#dc9729" />
                      </linearGradient>
                      <linearGradient
                        id="f2389idb"
                        x1="12.529"
                        x2="14.904"
                        y1="30.594"
                        y2="17.157"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#fa8547" />
                        <stop offset="1" stopColor="#fa8547" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient
                        id="f2389idc"
                        x1="12.232"
                        x2="24.509"
                        y1="18.734"
                        y2="18.734"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#faa945" />
                        <stop offset="1" stopColor="#ec9936" />
                      </linearGradient>
                      <linearGradient
                        id="f2389idd"
                        x1="24.092"
                        x2="16.047"
                        y1="18.224"
                        y2="18.224"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#f9a842" />
                        <stop offset="1" stopColor="#faa742" />
                        <stop offset="1" stopColor="#faa742" />
                      </linearGradient>
                      <linearGradient
                        id="f2389ide"
                        x1="15.082"
                        x2="18.4"
                        y1="19.075"
                        y2="24.242"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#864b60" />
                        <stop offset="1" stopColor="#5d3247" />
                      </linearGradient>
                      <radialGradient
                        id="f2389idf"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="rotate(124.323 3.672 5.69)scale(6.48778 12.8773)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset=".361" stopColor="#3fa0f7" />
                        <stop offset="1" stopColor="#2f60c2" />
                      </radialGradient>
                      <radialGradient
                        id="f2389idg"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="matrix(0 -3.22394 3.90129 0 10.734 12.268)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#3258bf" />
                        <stop offset="1" stopColor="#3258bf" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient
                        id="f2389idh"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="matrix(-10.9797 0 0 -9.59463 19.228 19.804)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop
                          offset=".844"
                          stopColor="#f7b44d"
                          stopOpacity="0"
                        />
                        <stop offset="1" stopColor="#f7b44d" />
                      </radialGradient>
                      <radialGradient
                        id="f2389idi"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="matrix(10.3667 0 0 9.34393 13.9 19.804)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop
                          offset=".826"
                          stopColor="#d2801f"
                          stopOpacity="0"
                        />
                        <stop offset="1" stopColor="#d2801f" />
                      </radialGradient>
                      <radialGradient
                        id="f2389idj"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="rotate(130.746 5.327 12.672)scale(2.68113 3.65655)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset=".201" stopColor="#602543" />
                        <stop offset="1" stopColor="#602543" stopOpacity="0" />
                      </radialGradient>
                      <filter
                        id="f2389idk"
                        width="14.016"
                        height="11.609"
                        x="3.509"
                        y="2.01"
                        colorInterpolationFilters="sRGB"
                        filterUnits="userSpaceOnUse"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
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
                        <feOffset dx=".15" dy="-.15" />
                        <feGaussianBlur stdDeviation=".25" />
                        <feComposite
                          in2="hardAlpha"
                          k2="-1"
                          k3="1"
                          operator="arithmetic"
                        />
                        <feColorMatrix values="0 0 0 0 0.254902 0 0 0 0 0.329412 0 0 0 0 0.729412 0 0 0 1 0" />
                        <feBlend
                          in2="shape"
                          result="effect1_innerShadow_18_1461"
                        />
                      </filter>
                      <filter
                        id="f2389idl"
                        width="9.224"
                        height="8.899"
                        x="11.342"
                        y="15.064"
                        colorInterpolationFilters="sRGB"
                        filterUnits="userSpaceOnUse"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
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
                        <feOffset dx="-.3" dy="-.3" />
                        <feGaussianBlur stdDeviation=".375" />
                        <feComposite
                          in2="hardAlpha"
                          k2="-1"
                          k3="1"
                          operator="arithmetic"
                        />
                        <feColorMatrix values="0 0 0 0 0.290196 0 0 0 0 0.14902 0 0 0 0 0.14902 0 0 0 1 0" />
                        <feBlend
                          in2="shape"
                          result="effect1_innerShadow_18_1461"
                        />
                        <feColorMatrix
                          in="SourceAlpha"
                          result="hardAlpha"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        />
                        <feOffset dx=".2" dy="-.2" />
                        <feGaussianBlur stdDeviation=".075" />
                        <feComposite
                          in2="hardAlpha"
                          k2="-1"
                          k3="1"
                          operator="arithmetic"
                        />
                        <feColorMatrix values="0 0 0 0 0.517647 0 0 0 0 0.372549 0 0 0 0 0.34902 0 0 0 1 0" />
                        <feBlend
                          in2="effect1_innerShadow_18_1461"
                          result="effect2_innerShadow_18_1461"
                        />
                      </filter>
                    </defs>
                  </g>
                </svg>
              </div>
            </div>
            {/*total user card and the other card*/}
            <div className="flex space-x-3 px-4">
              {/*card 1*/}
              <div className="flex-1 bg-[#202020] p-4 rounded-2xl mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="2.5em"
                        height="2.5em"
                        viewBox="0 0 32 32"
                      >
                        <g fill="none">
                          <circle
                            cx="15.999"
                            cy="15.966"
                            r="13.999"
                            fill="url(#f590id0)"
                          />
                          <circle
                            cx="15.999"
                            cy="15.966"
                            r="13.999"
                            fill="url(#f590id1)"
                          />
                          <circle
                            cx="15.999"
                            cy="15.966"
                            r="13.999"
                            fill="url(#f590id2)"
                          />
                          <circle
                            cx="15.999"
                            cy="15.966"
                            r="13.999"
                            fill="url(#f590id3)"
                          />
                          <circle
                            cx="15.999"
                            cy="15.966"
                            r="13.999"
                            fill="url(#f590id4)"
                          />
                          <circle
                            cx="15.999"
                            cy="15.966"
                            r="13.999"
                            fill="url(#f590id5)"
                          />
                          <circle
                            cx="15.999"
                            cy="15.966"
                            r="13.999"
                            fill="url(#f590id6)"
                          />
                          <g filter="url(#f590id18)">
                            <path
                              stroke="url(#f590idp)"
                              strokeWidth="0.2"
                              d="M29.7 17.034a2.497 2.497 0 0 0-1.187 4.838"
                            />
                          </g>
                          <path
                            fill="url(#f590id7)"
                            d="M29.955 17.09a13.9 13.9 0 0 1-1.281 4.829a2.498 2.498 0 1 1 1.28-4.828"
                          />
                          <path
                            fill="url(#f590id8)"
                            d="M29.955 17.09a13.9 13.9 0 0 1-1.281 4.829a2.498 2.498 0 1 1 1.28-4.828"
                          />
                          <path
                            fill="url(#f590id9)"
                            d="M29.955 17.09a13.9 13.9 0 0 1-1.281 4.829a2.498 2.498 0 1 1 1.28-4.828"
                          />
                          <g filter="url(#f590id19)">
                            <path
                              stroke="url(#f590idq)"
                              strokeWidth="0.2"
                              d="M19.78 29.092a3.651 3.651 0 0 1 6.205-3.724"
                            />
                          </g>
                          <path
                            fill="url(#f590ida)"
                            d="M26.157 25.6a14 14 0 0 1-6.224 3.805a3.651 3.651 0 0 1 6.224-3.805"
                          />
                          <path
                            fill="url(#f590idb)"
                            d="M26.157 25.6a14 14 0 0 1-6.224 3.805a3.651 3.651 0 0 1 6.224-3.805"
                          />
                          <path
                            fill="url(#f590idc)"
                            d="M26.157 25.6a14 14 0 0 1-6.224 3.805a3.651 3.651 0 0 1 6.224-3.805"
                          />
                          <path
                            fill="url(#f590idd)"
                            d="M26.157 25.6a14 14 0 0 1-6.224 3.805a3.651 3.651 0 0 1 6.224-3.805"
                          />
                          <g filter="url(#f590id1a)">
                            <path
                              stroke="url(#f590idr)"
                              strokeWidth="0.2"
                              d="M14.79 22.615c1.05.822 1.336 2.211.639 3.102c-.697.89-2.114.946-3.165.123c-1.05-.823-1.336-2.211-.64-3.102c.698-.89 2.115-.945 3.165-.123Z"
                            />
                          </g>
                          <path
                            fill="url(#f590ide)"
                            d="M14.79 22.615c1.05.822 1.336 2.211.639 3.102c-.697.89-2.114.946-3.165.123c-1.05-.823-1.336-2.211-.64-3.102c.698-.89 2.115-.945 3.165-.123"
                          />
                          <path
                            fill="url(#f590idf)"
                            d="M14.79 22.615c1.05.822 1.336 2.211.639 3.102c-.697.89-2.114.946-3.165.123c-1.05-.823-1.336-2.211-.64-3.102c.698-.89 2.115-.945 3.165-.123"
                          />
                          <path
                            fill="url(#f590idg)"
                            d="M14.79 22.615c1.05.822 1.336 2.211.639 3.102c-.697.89-2.114.946-3.165.123c-1.05-.823-1.336-2.211-.64-3.102c.698-.89 2.115-.945 3.165-.123"
                          />
                          <path
                            fill="url(#f590idh)"
                            d="M14.79 22.615c1.05.822 1.336 2.211.639 3.102c-.697.89-2.114.946-3.165.123c-1.05-.823-1.336-2.211-.64-3.102c.698-.89 2.115-.945 3.165-.123"
                          />
                          <g filter="url(#f590id1b)">
                            <path
                              stroke="url(#f590ids)"
                              strokeWidth="0.2"
                              d="M2.315 15.094q.4-.093.828-.094a3.651 3.651 0 0 1 .62 7.25"
                            />
                          </g>
                          <path
                            fill="url(#f590idi)"
                            d="M2.022 15.175a3.651 3.651 0 1 1 1.482 7.11a13.94 13.94 0 0 1-1.482-7.11"
                          />
                          <path
                            fill="url(#f590idj)"
                            d="M2.022 15.175a3.651 3.651 0 1 1 1.482 7.11a13.94 13.94 0 0 1-1.482-7.11"
                          />
                          <path
                            fill="url(#f590idk)"
                            d="M2.022 15.175a3.651 3.651 0 1 1 1.482 7.11a13.94 13.94 0 0 1-1.482-7.11"
                          />
                          <g filter="url(#f590id1c)">
                            <path
                              stroke="url(#f590idt)"
                              strokeWidth="0.3"
                              d="M15.493 8a2.497 2.497 0 1 0 0-4.994a2.497 2.497 0 0 0 0 4.994Z"
                            />
                          </g>
                          <path
                            fill="url(#f590idu)"
                            d="M15.493 8a2.497 2.497 0 1 0 0-4.994a2.497 2.497 0 0 0 0 4.994"
                          />
                          <path
                            fill="url(#f590idl)"
                            d="M15.493 8a2.497 2.497 0 1 0 0-4.994a2.497 2.497 0 0 0 0 4.994"
                          />
                          <path
                            fill="url(#f590idm)"
                            d="M15.493 8a2.497 2.497 0 1 0 0-4.994a2.497 2.497 0 0 0 0 4.994"
                          />
                          <g filter="url(#f590id1d)">
                            <path
                              fill="#aa7e32"
                              fillRule="evenodd"
                              d="M10.435 8.352a2.48 2.48 0 0 0-2.48 2.48a.5.5 0 0 1-1 0a3.48 3.48 0 0 1 3.48-3.48a.5.5 0 1 1 0 1"
                              clipRule="evenodd"
                            />
                          </g>
                          <g filter="url(#f590id1e)">
                            <path
                              fill="#443452"
                              fillRule="evenodd"
                              d="M10.67 8.04a2.48 2.48 0 0 0-2.48 2.48a.5.5 0 1 1-1 0a3.48 3.48 0 0 1 3.48-3.48a.5.5 0 1 1 0 1"
                              clipRule="evenodd"
                            />
                          </g>
                          <g filter="url(#f590id1f)">
                            <path
                              fill="#885f1f"
                              fillRule="evenodd"
                              d="M20.822 7.78a.36.36 0 0 1 .361-.36c1.383 0 2.755 1.518 2.755 2.91a.361.361 0 0 1-.723 0c0-.991-1.046-2.188-2.032-2.188a.36.36 0 0 1-.361-.361"
                              clipRule="evenodd"
                            />
                            <path
                              stroke="#e9b15a"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeMiterlimit="10"
                              strokeWidth="0.4"
                              d="M21.183 7.22a.561.561 0 1 0 0 1.122c.416 0 .874.257 1.238.657c.363.399.594.9.594 1.331a.561.561 0 1 0 1.122 0c0-.758-.37-1.532-.912-2.113c-.54-.581-1.279-.997-2.042-.997"
                            />
                          </g>
                          <g filter="url(#f590id1g)">
                            <path
                              fill="#443452"
                              fillRule="evenodd"
                              d="M20.55 7.54a.5.5 0 0 1 .5-.5a3.48 3.48 0 0 1 3.48 3.48a.5.5 0 1 1-1 0a2.48 2.48 0 0 0-2.48-2.48a.5.5 0 0 1-.5-.5"
                              clipRule="evenodd"
                            />
                          </g>
                          <g filter="url(#f590id1h)">
                            <path
                              fill="url(#f590idv)"
                              fillRule="evenodd"
                              d="M11.224 11.833a1.37 1.37 0 0 0-1.282.864a.75.75 0 0 1-1.396-.548a2.87 2.87 0 0 1 2.678-1.816c1.272 0 2.353.825 2.732 1.975a.75.75 0 0 1-1.425.47a1.38 1.38 0 0 0-1.307-.946"
                              clipRule="evenodd"
                            />
                          </g>
                          <g filter="url(#f590id1i)">
                            <path
                              fill="url(#f590idw)"
                              fillRule="evenodd"
                              d="M19.965 11.833a1.37 1.37 0 0 0-1.282.864a.75.75 0 0 1-1.396-.548a2.87 2.87 0 0 1 2.678-1.816c1.273 0 2.354.825 2.733 1.975a.75.75 0 0 1-1.425.47a1.38 1.38 0 0 0-1.308-.946"
                              clipRule="evenodd"
                            />
                          </g>
                          <path
                            fill="url(#f590idn)"
                            fillRule="evenodd"
                            d="M11.59 11.52a1.37 1.37 0 0 0-1.282.864a.75.75 0 1 1-1.396-.548a2.87 2.87 0 0 1 2.678-1.816c1.272 0 2.354.826 2.732 1.975a.75.75 0 0 1-1.424.47c-.182-.55-.7-.945-1.308-.945"
                            clipRule="evenodd"
                          />
                          <path
                            fill="url(#f590ido)"
                            fillRule="evenodd"
                            d="M20.21 11.52a1.37 1.37 0 0 0-1.282.864a.75.75 0 1 1-1.396-.548a2.87 2.87 0 0 1 2.678-1.816c1.272 0 2.354.826 2.732 1.975a.75.75 0 0 1-1.424.47c-.182-.55-.7-.945-1.308-.945"
                            clipRule="evenodd"
                          />
                          <g filter="url(#f590id1j)">
                            <path
                              fill="url(#f590idx)"
                              fillRule="evenodd"
                              d="M10.4 16.892a.75.75 0 0 1 1.06 0a5.52 5.52 0 0 0 7.81 0a.75.75 0 0 1 1.06 1.06a7.02 7.02 0 0 1-9.93 0a.75.75 0 0 1 0-1.06"
                              clipRule="evenodd"
                            />
                          </g>
                          <path
                            fill="url(#f590idy)"
                            fillRule="evenodd"
                            d="M10.91 16.58a.75.75 0 0 1 1.06 0a5.52 5.52 0 0 0 7.81 0a.75.75 0 0 1 1.06 1.06a7.02 7.02 0 0 1-9.93 0a.75.75 0 0 1 0-1.06"
                            clipRule="evenodd"
                          />
                          <g
                            strokeLinecap="round"
                            strokeWidth="0.5"
                            filter="url(#f590id1k)"
                          >
                            <path
                              stroke="url(#f590idz)"
                              d="M9.561 12.088c.1-.386.569-1.218 1.65-1.456c1.35-.299 2.333.649 2.631 1.456"
                            />
                            <path
                              stroke="url(#f590id10)"
                              d="M9.561 12.088c.1-.386.569-1.218 1.65-1.456c1.35-.299 2.333.649 2.631 1.456"
                            />
                          </g>
                          <g
                            strokeLinecap="round"
                            strokeWidth="0.5"
                            filter="url(#f590id1l)"
                          >
                            <path
                              stroke="url(#f590id11)"
                              d="M18.105 12.12c.16-.468.767-1.471 1.91-1.471c1.597 0 2.329.967 2.329 1.581"
                            />
                            <path
                              stroke="url(#f590id12)"
                              d="M18.105 12.12c.16-.468.767-1.471 1.91-1.471c1.597 0 2.329.967 2.329 1.581"
                            />
                          </g>
                          <g filter="url(#f590id1m)">
                            <path
                              stroke="url(#f590id13)"
                              strokeLinecap="round"
                              strokeWidth="0.5"
                              d="M11.634 17.25c.604.625 2.017 1.622 4.292 1.622s3.984-1.101 4.38-1.622"
                            />
                          </g>
                          <g
                            strokeLinecap="round"
                            strokeWidth="0.25"
                            filter="url(#f590id1n)"
                          >
                            <path
                              stroke="url(#f590id14)"
                              d="M21.157 7.5c1.13 0 2.838.604 2.948 3.017"
                            />
                            <path
                              stroke="url(#f590id15)"
                              d="M21.157 7.5c1.13 0 2.838.604 2.948 3.017"
                            />
                          </g>
                          <g
                            strokeLinecap="round"
                            strokeWidth="0.25"
                            filter="url(#f590id1o)"
                          >
                            <path
                              stroke="url(#f590id16)"
                              d="M10.69 7.5c-1.13 0-2.838.604-2.949 3.017"
                            />
                            <path
                              stroke="url(#f590id17)"
                              d="M10.69 7.5c-1.13 0-2.838.604-2.949 3.017"
                            />
                          </g>
                          <defs>
                            <radialGradient
                              id="f590id0"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(135.952 10.379 9.757)scale(21.858 24.4467)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#fff6a6" />
                              <stop offset=".87" stopColor="#f6b246" />
                            </radialGradient>
                            <radialGradient
                              id="f590id1"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(-155.287 13.913 7.224)scale(22.8347 27.1137)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".683"
                                stopColor="#ba9d76"
                                stopOpacity="0"
                              />
                              <stop offset="1" stopColor="#ba9d76" />
                            </radialGradient>
                            <radialGradient
                              id="f590id2"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(8.01445 -11.19665 21.31815 15.25931 8.68 27.852)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#ca7044" />
                              <stop
                                offset="1"
                                stopColor="#ca7044"
                                stopOpacity="0"
                              />
                            </radialGradient>
                            <radialGradient
                              id="f590id3"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(-3 17.37501 -17.82298 -3.07735 17.563 13.063)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".864"
                                stopColor="#c07583"
                                stopOpacity="0"
                              />
                              <stop offset="1" stopColor="#c07583" />
                            </radialGradient>
                            <radialGradient
                              id="f590id4"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(97.871 2.313 20.816)scale(8.67178)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#ffc94e" />
                              <stop
                                offset="1"
                                stopColor="#ffc94e"
                                stopOpacity="0"
                              />
                            </radialGradient>
                            <radialGradient
                              id="f590id5"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(46.521 -13.51 17.263)scale(4.9957)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#eb7f4d" />
                              <stop
                                offset=".96"
                                stopColor="#eb7f4d"
                                stopOpacity="0"
                              />
                            </radialGradient>
                            <radialGradient
                              id="f590id6"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(110.659 6.17 15.726)scale(4.0745)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#ffa95e" />
                              <stop
                                offset="1"
                                stopColor="#ffb370"
                                stopOpacity="0"
                              />
                            </radialGradient>
                            <radialGradient
                              id="f590id7"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(14.725 -58.914 111.353)scale(2.07067 4.57582)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#ffe486" />
                              <stop offset="1" stopColor="#ffd68b" />
                            </radialGradient>
                            <radialGradient
                              id="f590id8"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(-112.782 21.133 .172)scale(2.85426 3.23309)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".795"
                                stopColor="#e3b065"
                                stopOpacity="0"
                              />
                              <stop offset=".944" stopColor="#e3b065" />
                            </radialGradient>
                            <radialGradient
                              id="f590id9"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(118.811 9.342 17.97)scale(3.72923 3.20041)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".846"
                                stopColor="#fff1a6"
                                stopOpacity="0"
                              />
                              <stop offset="1" stopColor="#fff1a6" />
                            </radialGradient>
                            <radialGradient
                              id="f590ida"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(-.50873 5.40484 -8.11337 -.76367 22.821 24)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#feb862" />
                              <stop offset="1" stopColor="#d78b6c" />
                            </radialGradient>
                            <radialGradient
                              id="f590idb"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(2.18266 4.04231 -10.57376 5.70934 21.612 24)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".727"
                                stopColor="#d8a294"
                                stopOpacity="0"
                              />
                              <stop offset="1" stopColor="#d8a294" />
                            </radialGradient>
                            <radialGradient
                              id="f590idc"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(155.573 8.778 16.331)scale(4.4348 3.92197)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".662"
                                stopColor="#efa970"
                                stopOpacity="0"
                              />
                              <stop offset=".979" stopColor="#efa970" />
                            </radialGradient>
                            <radialGradient
                              id="f590idd"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(1.88567 -4.65993 4.82606 1.9529 22.643 28.539)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".778"
                                stopColor="#c17967"
                                stopOpacity="0"
                              />
                              <stop offset=".951" stopColor="#c17967" />
                            </radialGradient>
                            <radialGradient
                              id="f590ide"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(-.65625 3.7662 -3.91748 -.68261 13.844 22.656)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#d97c5e" />
                              <stop offset="1" stopColor="#f79965" />
                            </radialGradient>
                            <radialGradient
                              id="f590idf"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(110.163 -.89 16.432)scale(3.72007 3.18028)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".742"
                                stopColor="#ffa969"
                                stopOpacity="0"
                              />
                              <stop offset="1" stopColor="#ffa969" />
                            </radialGradient>
                            <radialGradient
                              id="f590idg"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(-104.912 16.176 7.422)scale(3.48795 3.28978)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".626"
                                stopColor="#c16653"
                                stopOpacity="0"
                              />
                              <stop offset="1" stopColor="#c16653" />
                            </radialGradient>
                            <radialGradient
                              id="f590idh"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(-158.194 10.423 11.55)scale(2.45915 2.55794)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#ce8050" />
                              <stop
                                offset="1"
                                stopColor="#ce8050"
                                stopOpacity="0"
                              />
                            </radialGradient>
                            <radialGradient
                              id="f590idi"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(58.664 -13.067 9.229)scale(7.83768 5.15808)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#a98861" />
                              <stop offset="1" stopColor="#b1724d" />
                            </radialGradient>
                            <radialGradient
                              id="f590idj"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(2.58901 -4.26912 3.9074 2.36965 2.887 19.27)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".696"
                                stopColor="#9c6544"
                                stopOpacity="0"
                              />
                              <stop offset="1" stopColor="#9c6544" />
                            </radialGradient>
                            <radialGradient
                              id="f590idk"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(0 5.04143 -3.31783 0 4.397 17.243)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".821"
                                stopColor="#af7d6f"
                                stopOpacity="0"
                              />
                              <stop offset="1" stopColor="#af7d6f" />
                            </radialGradient>
                            <radialGradient
                              id="f590idl"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(3.28125 0 0 3.94765 14.875 5.503)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".6"
                                stopColor="#c59853"
                                stopOpacity="0"
                              />
                              <stop offset="1" stopColor="#c59853" />
                            </radialGradient>
                            <radialGradient
                              id="f590idm"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(-4.99377 0 0 -3.78436 17.99 5.503)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".899"
                                stopColor="#fff4a4"
                                stopOpacity="0"
                              />
                              <stop offset="1" stopColor="#fff4a4" />
                            </radialGradient>
                            <radialGradient
                              id="f590idn"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(-41.987 21.47 -6.406)scale(3.15319 2.71026)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#3a2d43" />
                              <stop offset="1" stopColor="#342d3a" />
                            </radialGradient>
                            <radialGradient
                              id="f590ido"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(0 -1.28499 2.69079 0 20.027 11.978)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#3e294c" />
                              <stop offset="1" stopColor="#483c4e" />
                            </radialGradient>
                            <linearGradient
                              id="f590idp"
                              x1="29.156"
                              x2="27.594"
                              y1="16.719"
                              y2="22"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#f2be70" />
                              <stop offset="1" stopColor="#ffec98" />
                            </linearGradient>
                            <linearGradient
                              id="f590idq"
                              x1="24.344"
                              x2="18.764"
                              y1="24"
                              y2="28.235"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#dfa055" />
                              <stop offset="1" stopColor="#e1945d" />
                            </linearGradient>
                            <linearGradient
                              id="f590idr"
                              x1="14.841"
                              x2="12.252"
                              y1="22.742"
                              y2="25.813"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#d47c4b" />
                              <stop offset="1" stopColor="#e28050" />
                            </linearGradient>
                            <linearGradient
                              id="f590ids"
                              x1="4.554"
                              x2="4.554"
                              y1="15"
                              y2="22.25"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#a2723b" />
                              <stop offset="1" stopColor="#ac6e43" />
                            </linearGradient>
                            <linearGradient
                              id="f590idt"
                              x1="14.764"
                              x2="17.989"
                              y1="5.503"
                              y2="5.503"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#ffe27e" />
                              <stop offset="1" stopColor="#f1b966" />
                            </linearGradient>
                            <linearGradient
                              id="f590idu"
                              x1="18.25"
                              x2="12.996"
                              y1="5.503"
                              y2="5.503"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#ffc770" />
                              <stop offset="1" stopColor="#ffdf81" />
                            </linearGradient>
                            <linearGradient
                              id="f590idv"
                              x1="9.429"
                              x2="12.481"
                              y1="12.413"
                              y2="11.027"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#c06e3f" />
                              <stop offset="1" stopColor="#9b672e" />
                            </linearGradient>
                            <linearGradient
                              id="f590idw"
                              x1="22.735"
                              x2="19.421"
                              y1="13.293"
                              y2="13.864"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#c06e3f" />
                              <stop offset="1" stopColor="#9b672e" />
                            </linearGradient>
                            <linearGradient
                              id="f590idx"
                              x1="10.18"
                              x2="15.365"
                              y1="17.688"
                              y2="20.01"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#b2673e" />
                              <stop offset="1" stopColor="#ba6e47" />
                            </linearGradient>
                            <linearGradient
                              id="f590idy"
                              x1="15.875"
                              x2="15.875"
                              y1="17.79"
                              y2="19.698"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#4a393e" />
                              <stop offset="1" stopColor="#391e47" />
                            </linearGradient>
                            <linearGradient
                              id="f590idz"
                              x1="13.946"
                              x2="11.401"
                              y1="12.367"
                              y2="10.808"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#51495a" />
                              <stop
                                offset="1"
                                stopColor="#51495a"
                                stopOpacity="0"
                              />
                            </linearGradient>
                            <linearGradient
                              id="f590id10"
                              x1="9.561"
                              x2="10.079"
                              y1="12.524"
                              y2="11.332"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#51495a" />
                              <stop
                                offset="1"
                                stopColor="#51495a"
                                stopOpacity="0"
                              />
                            </linearGradient>
                            <linearGradient
                              id="f590id11"
                              x1="22.447"
                              x2="19.852"
                              y1="12.522"
                              y2="11.019"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop offset=".185" stopColor="#564a62" />
                              <stop
                                offset="1"
                                stopColor="#564a62"
                                stopOpacity="0"
                              />
                            </linearGradient>
                            <linearGradient
                              id="f590id12"
                              x1="18.105"
                              x2="20.564"
                              y1="12.687"
                              y2="10.273"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#5f4c6f" />
                              <stop
                                offset="1"
                                stopColor="#5f4c6f"
                                stopOpacity="0"
                              />
                            </linearGradient>
                            <linearGradient
                              id="f590id13"
                              x1="13.072"
                              x2="17.512"
                              y1="17.771"
                              y2="18.646"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#463e4c" />
                              <stop offset="1" stopColor="#4f425a" />
                            </linearGradient>
                            <linearGradient
                              id="f590id14"
                              x1="21.463"
                              x2="23.944"
                              y1="7.687"
                              y2="9.183"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#594c63" />
                              <stop
                                offset="1"
                                stopColor="#594c63"
                                stopOpacity="0"
                              />
                            </linearGradient>
                            <linearGradient
                              id="f590id15"
                              x1="23.944"
                              x2="23.842"
                              y1="10.517"
                              y2="8.563"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#594c63" />
                              <stop
                                offset="1"
                                stopColor="#594c63"
                                stopOpacity="0"
                              />
                            </linearGradient>
                            <linearGradient
                              id="f590id16"
                              x1="10.917"
                              x2="8.827"
                              y1="7.5"
                              y2="8.393"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#594c63" />
                              <stop
                                offset="1"
                                stopColor="#594c63"
                                stopOpacity="0"
                              />
                            </linearGradient>
                            <linearGradient
                              id="f590id17"
                              x1="7.903"
                              x2="9.031"
                              y1="10.517"
                              y2="8.121"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#594c63" />
                              <stop
                                offset="1"
                                stopColor="#594c63"
                                stopOpacity="0"
                              />
                            </linearGradient>
                            <filter
                              id="f590id18"
                              width="3.428"
                              height="5.467"
                              x="26.488"
                              y="16.7"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".1"
                              />
                            </filter>
                            <filter
                              id="f590id19"
                              width="7.078"
                              height="5.631"
                              x="19.185"
                              y="23.7"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".1"
                              />
                            </filter>
                            <filter
                              id="f590id1a"
                              width="5.367"
                              height="5.19"
                              x="10.843"
                              y="21.633"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".15"
                              />
                            </filter>
                            <filter
                              id="f590id1b"
                              width="5.202"
                              height="8.048"
                              x="1.992"
                              y="14.6"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".15"
                              />
                            </filter>
                            <filter
                              id="f590id1c"
                              width="5.894"
                              height="5.894"
                              x="12.546"
                              y="2.556"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".15"
                              />
                            </filter>
                            <filter
                              id="f590id1d"
                              width="5.98"
                              height="5.98"
                              x="5.955"
                              y="6.352"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".5"
                              />
                            </filter>
                            <filter
                              id="f590id1e"
                              width="4.13"
                              height="4.13"
                              x="7.19"
                              y="6.89"
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
                              <feOffset dx=".15" dy="-.15" />
                              <feGaussianBlur stdDeviation=".15" />
                              <feComposite
                                in2="hardAlpha"
                                k2="-1"
                                k3="1"
                                operator="arithmetic"
                              />
                              <feColorMatrix values="0 0 0 0 0.27451 0 0 0 0 0.203922 0 0 0 0 0.160784 0 0 0 1 0" />
                              <feBlend
                                in2="shape"
                                result="effect1_innerShadow_18_14713"
                              />
                            </filter>
                            <filter
                              id="f590id1f"
                              width="4.916"
                              height="5.072"
                              x="19.922"
                              y="6.52"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".25"
                              />
                            </filter>
                            <filter
                              id="f590id1g"
                              width="4.13"
                              height="4.13"
                              x="20.55"
                              y="6.89"
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
                              <feOffset dx=".15" dy="-.15" />
                              <feGaussianBlur stdDeviation=".15" />
                              <feComposite
                                in2="hardAlpha"
                                k2="-1"
                                k3="1"
                                operator="arithmetic"
                              />
                              <feColorMatrix values="0 0 0 0 0.27451 0 0 0 0 0.203922 0 0 0 0 0.160784 0 0 0 1 0" />
                              <feBlend
                                in2="shape"
                                result="effect1_innerShadow_18_14713"
                              />
                            </filter>
                            <filter
                              id="f590id1h"
                              width="6.3"
                              height="3.76"
                              x="8.093"
                              y="9.933"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".2"
                              />
                            </filter>
                            <filter
                              id="f590id1i"
                              width="6.3"
                              height="3.76"
                              x="16.835"
                              y="9.933"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".2"
                              />
                            </filter>
                            <filter
                              id="f590id1j"
                              width="12.37"
                              height="5.338"
                              x="9.18"
                              y="15.673"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".5"
                              />
                            </filter>
                            <filter
                              id="f590id1k"
                              width="5.781"
                              height="3.013"
                              x="8.811"
                              y="9.825"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".25"
                              />
                            </filter>
                            <filter
                              id="f590id1l"
                              width="5.739"
                              height="3.082"
                              x="17.355"
                              y="9.899"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".25"
                              />
                            </filter>
                            <filter
                              id="f590id1m"
                              width="10.172"
                              height="3.123"
                              x="10.884"
                              y="16.5"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".25"
                              />
                            </filter>
                            <filter
                              id="f590id1n"
                              width="3.699"
                              height="3.767"
                              x="20.782"
                              y="7.125"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".125"
                              />
                            </filter>
                            <filter
                              id="f590id1o"
                              width="3.699"
                              height="3.767"
                              x="7.366"
                              y="7.125"
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
                              <feGaussianBlur
                                result="effect1_foregroundBlur_18_14713"
                                stdDeviation=".125"
                              />
                            </filter>
                          </defs>
                        </g>
                      </svg>
                    </div>
                    <div className="font-medium">
                      <div className="text-sm whitespace-nowrap">
                        Total users
                      </div>
                      <div className="text-sm animate-gradient-text">
                        {totalUsers}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/*card 2*/}
              <div className="flex-1 bg-[#202020] p-4 rounded-2xl mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="2.5em"
                        height="2.5em"
                        viewBox="0 0 32 32"
                      >
                        <path
                          fill="#fff"
                          d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667"
                        />
                      </svg>
                    </div>
                    <div className="font-medium">
                      <div className="text-sm whitespace-nowrap">
                        Total QNTM
                      </div>
                      <div className="text-sm animate-gradient-text">
                        {totalQuant}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/*user stats card*/}
            <div className="px-4">
              <div className="font-semibold mt-4">Your stats</div>
              <div className="bg-orange-200 p-6 rounded-2xl mt-2">
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
            <div className="font-semibold px-4 mt-4">Ranks</div>
            {/*leaderboard list*/}
            <div className="mt-3 space-y-0 rounded-2xl">
              {leaderboardContext ? (
                leaderboardContext.length > 0 ? (
                  leaderboardContext.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-black"
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
