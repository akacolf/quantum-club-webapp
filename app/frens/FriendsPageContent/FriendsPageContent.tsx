"use client";
import React, {  useEffect, useState } from "react";
import { dbfs } from "@/app/firebase/firebaseConfig";
import { useFrenContext } from "@/app/contexts/FrensContext";
import CopyLinkNotification from "./copied-notification-info";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { bgFrensPageCard } from "@/public/images";
import { useRouter } from "next/navigation";
import { useGameContext } from "@/app/contexts/MiningContext";
import Loader from "@/app/components/Loader";
import { collection, doc, getDoc, getDocs,getCountFromServer } from 'firebase/firestore';
import { ButtonLoader } from "@/app/components/ButtonLoader";
const FriendsPageContent = () => {
  const { referralsNum, setReferralNum } = useFrenContext();
  const router = useRouter();
  const pathname = usePathname();
  const { telegramId } = useGameContext();
    const {
      referralsContext,
      addReferral,
    } = useFrenContext();
    const [errorMessage, setErrorMessage] = useState<string | React.ReactNode>("");
    const [loading, setLoading] = useState(true);
    const [totalReferralSize, setTotalReferralSize] = useState(0)
    const [viewButton, setViewButton] = useState<string |React.ReactNode>("View more")
    useEffect(() => {
      const tg = window.Telegram?.WebApp;
      if(tg){
      tg.ready();
      const handleBackButtonClick = () => {
        router.replace('/frens');
      };
      tg.BackButton.show();
      tg.BackButton.onClick(handleBackButtonClick);
      return () => {
        tg.BackButton.offClick(handleBackButtonClick);
       
      };
      }else{
        console.error("Telegram WebApp not available");
      }
      
      
    }, [router])
    useEffect(() => {
      router.prefetch("/frens/referrals");
    const getReferralsNum = async () => {
      const referralsRef = collection(dbfs, `user/${telegramId}/referrals`);
      const snapshot = await getCountFromServer(referralsRef);
      setReferralNum(snapshot.data().count);
    };
    getReferralsNum();
      const fetchReferralsData = async () => {
        try {
          // if(referralsContext.length > 0) return;
          if (sessionStorage.getItem("FrenLoad") == "InviteFren") {
            setErrorMessage(
              <div className="flex flex-col font-bold text-lg justify-center">
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 48 48">
                    <ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="7.024" ry="21.5" />
                    <ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="21.5" ry="7.024" transform="rotate(-30 24 24)" />
                    <ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="7.024" ry="21.5" transform="rotate(-60 24 24)" />
                    <circle cx="24" cy="24.001" r="2.695" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m33.527 6.827l-8.221 14.82m9.072 8.512l-8.069-4.789" />
                  </svg>
                </div>
                <div className="flex justify-center mt-4">
                  <span className="font-semibold text-base">Invite some frens to see them here!</span>
                </div>
              </div>
            );
            setLoading(false);
            return;
          }
  
          const referralsRef = collection(dbfs, `user/${telegramId}/referrals`);
          const snapshot = await getDocs(referralsRef);
          if (!snapshot.empty) {
            const snapshotSize = Number(snapshot.size)
            setTotalReferralSize(snapshotSize)
  
            sessionStorage.setItem("Num", String(snapshot.size));
            const referralLocalSize = Number(referralsContext.length)
            if (snapshotSize === referralLocalSize || (snapshotSize !== referralLocalSize && referralsContext.length % 2 === 0 && referralsContext.length !== 0)) {
              return;
            }
            if (snapshotSize !== referralLocalSize) {
              let checkUser = 1
              for (const docSnapshot of snapshot.docs) {
                if (checkUser === 21) break;
                const referredTelegramId = docSnapshot.id;
                try {
                  let username="";
                  const referredRef = doc(dbfs, `user/${referredTelegramId}`)
                  const referredData = await getDoc(referredRef)
                  username = referredData.data()?.username;
                  const coinsRef = doc(
                    dbfs,
                    `user/${referredTelegramId}/miningData/values`
                  );
                  const coinsSnapshot = await getDoc(coinsRef);
                  const coins =
                    coinsSnapshot.exists() && coinsSnapshot.data().firstQuant
                      ? parseFloat(coinsSnapshot.data().firstQuant).toFixed(0)
                      : "0.00";
                  const amount = Number(coins);
                  const newReferral = { id: referredTelegramId, username: username, quantamount: amount };
                  addReferral(newReferral);
                  checkUser++
                } catch (error) {
                  console.error(error);
                  return {
                    id: referredTelegramId,
                    username: "Error",
                    coins: "0.00",
                  };
                }
  
              }
            }
  
          } else {
            setLoading(false);
            sessionStorage.setItem("FrenLoad", "InviteFren");
            setErrorMessage(
              <div className="flex flex-col font-bold text-lg justify-center">
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 48 48">
                    <ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="7.024" ry="21.5" />
                    <ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="21.5" ry="7.024" transform="rotate(-30 24 24)" />
                    <ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="7.024" ry="21.5" transform="rotate(-60 24 24)" />
                    <circle cx="24" cy="24.001" r="2.695" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m33.527 6.827l-8.221 14.82m9.072 8.512l-8.069-4.789" />
                  </svg>
                </div>
                <div className="flex justify-center mt-4">
                  <span className="font-semibold text-base">Invite some frens to see them here!</span>
                </div>
              </div>
            );
          }
        } catch (error) {
          console.error(error)
          setErrorMessage(
            "There was an error when loading your invited frens: " + error
          );
        } finally {
          setLoading(false);
        }
      };
  
      fetchReferralsData();
    },[]); // referralsContext'e de bağımlılık ekledik
  
    async function lookViewMore() {
      try {
        setViewButton(<ButtonLoader />)
        const referralsRef = collection(dbfs, `user/${telegramId}/referrals`);
        const snapshot = await getDocs(referralsRef);
        const checkReferral = referralsContext.length
        let contextTotal = referralsContext.length
        if (!snapshot.empty) {
          try {
            for (const docSnapshot of snapshot.docs) {
              const referredTelegramId = docSnapshot.id;
              try {
                if (contextTotal >= checkReferral + 20) {
                  return;
                }
                let username="";
                const foundUser = referralsContext.find(user => user.id === referredTelegramId);
                if (foundUser) {
                  continue;
                }
                const referredRef = doc(dbfs, `user/${referredTelegramId}`)
                const referredData = await getDoc(referredRef)
                username = referredData.data()?.username;
                const coinsRef = doc(
                  dbfs,
                  `user/${referredTelegramId}/miningData/values`
                );
                const coinsSnapshot = await getDoc(coinsRef);
                const coins =
                  coinsSnapshot.exists() && coinsSnapshot.data().firstQuant
                    ? parseFloat(coinsSnapshot.data().firstQuant).toFixed(0)
                    : "0.00";
                const amount = Number(coins);
                const newReferral = { id: referredTelegramId, username: username, quantamount: amount };
                addReferral(newReferral);
                contextTotal++
              } catch (error) {
                console.error(error);
                return {
                  id: referredTelegramId,
                  username: "Error",
                  coins: "0.00",
                };
              }
            }
          } finally {
            setViewButton("View more")
          }
  
        } else {
          setLoading(false);
          sessionStorage.setItem("FrenLoad", "InviteFren");
          setErrorMessage(
            <div className="flex flex-col font-bold text-lg justify-center">
              <div className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 48 48">
                  <ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="7.024" ry="21.5" />
                  <ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="21.5" ry="7.024" transform="rotate(-30 24 24)" />
                  <ellipse cx="24" cy="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" rx="7.024" ry="21.5" transform="rotate(-60 24 24)" />
                  <circle cx="24" cy="24.001" r="2.695" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m33.527 6.827l-8.221 14.82m9.072 8.512l-8.069-4.789" />
                </svg>
              </div>
              <div className="flex justify-center mt-4">
                <span className="font-semibold text-base">Invite some frens to see them here!</span>
              </div>
            </div>
          );
        }
      } catch (error) {
        console.error(error)
      }
    }
  return (
    <div className="frens overflow-auto">
      <CopyLinkNotification />
      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/*welcome card*/}
            <div className="px-4">
              <div
                className="flex items-center justify-between bg-cover bg-center p-6 rounded-2xl"
                style={{ backgroundImage: `url(${bgFrensPageCard.src})` }}
              >
                <div className="flex flex-col">
                  <div className="font-medium text-xl">Frens</div>
                  <div className="font-medium text-sm mt-1 text-gray-500">
                    Invite your friends to Quantum Club and earn more.
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="4em"
                  height="4em"
                  viewBox="0 0 32 32"
                >
                  <g fill="none">
                    <g clipPath="url(#f2397idm)">
                      <path
                        fill="url(#f2397id0)"
                        d="M15.999 29.998c9.334 0 13.999-6.268 13.999-14c0-7.73-4.665-13.998-14-13.998C6.665 2 2 8.268 2 15.999s4.664 13.999 13.999 13.999"
                      />
                      <path
                        fill="url(#f2397id1)"
                        d="M15.999 29.998c9.334 0 13.999-6.268 13.999-14c0-7.73-4.665-13.998-14-13.998C6.665 2 2 8.268 2 15.999s4.664 13.999 13.999 13.999"
                      />
                      <path
                        fill="url(#f2397id2)"
                        d="M15.999 29.998c9.334 0 13.999-6.268 13.999-14c0-7.73-4.665-13.998-14-13.998C6.665 2 2 8.268 2 15.999s4.664 13.999 13.999 13.999"
                      />
                      <path
                        fill="url(#f2397id3)"
                        fillOpacity="0.6"
                        d="M15.999 29.998c9.334 0 13.999-6.268 13.999-14c0-7.73-4.665-13.998-14-13.998C6.665 2 2 8.268 2 15.999s4.664 13.999 13.999 13.999"
                      />
                      <path
                        fill="url(#f2397id4)"
                        d="M15.999 29.998c9.334 0 13.999-6.268 13.999-14c0-7.73-4.665-13.998-14-13.998C6.665 2 2 8.268 2 15.999s4.664 13.999 13.999 13.999"
                      />
                      <path
                        fill="url(#f2397id5)"
                        d="M15.999 29.998c9.334 0 13.999-6.268 13.999-14c0-7.73-4.665-13.998-14-13.998C6.665 2 2 8.268 2 15.999s4.664 13.999 13.999 13.999"
                      />
                      <path
                        fill="url(#f2397id6)"
                        d="M15.999 29.998c9.334 0 13.999-6.268 13.999-14c0-7.73-4.665-13.998-14-13.998C6.665 2 2 8.268 2 15.999s4.664 13.999 13.999 13.999"
                      />
                      <path
                        fill="url(#f2397id7)"
                        d="M15.999 29.998c9.334 0 13.999-6.268 13.999-14c0-7.73-4.665-13.998-14-13.998C6.665 2 2 8.268 2 15.999s4.664 13.999 13.999 13.999"
                      />
                      <g filter="url(#f2397idi)">
                        <path
                          fill="url(#f2397idb)"
                          d="M25.5 18L19 12.5l6-1.5z"
                        />
                      </g>
                      <g filter="url(#f2397idj)">
                        <path
                          fill="url(#f2397idc)"
                          d="M13.5 14.5L7 14l4.5-4z"
                        />
                      </g>
                      <g filter="url(#f2397idk)">
                        <path
                          fill="url(#f2397id8)"
                          d="M16.5 6h2c1.6 1.6 1.333 4.667 1 6l-3 1L18 9.5z"
                        />
                      </g>
                      <g filter="url(#f2397idl)">
                        <path
                          fill="url(#f2397id9)"
                          d="M3 8h2c1.6 1.6 1.333 4.667 1 6l-3 2l1.5-4.5z"
                        />
                      </g>
                      <path
                        fill="url(#f2397idd)"
                        stroke="url(#f2397ide)"
                        strokeWidth="0.5"
                        d="m8.624 12.865l-3.05 2.372a.15.15 0 0 1-.242-.132l.3-3.285a2.25 2.25 0 0 0-1.149-2.171L2.5 8.548a.5.5 0 0 1 .058-.902l2.529-1.012a2.25 2.25 0 0 0 1.37-1.647l.472-2.359a.47.47 0 0 1 .837-.19l1.364 1.82a2.25 2.25 0 0 0 2.004.89l3.493-.318a.15.15 0 0 1 .133.24l-1.786 2.38a2.25 2.25 0 0 0-.289 2.186l1.412 3.528l-3.65-.73a2.25 2.25 0 0 0-1.823.43Z"
                      />
                      <path
                        fill="url(#f2397idf)"
                        stroke="url(#f2397idg)"
                        strokeWidth="0.5"
                        d="m23.376 12.865l3.05 2.372a.15.15 0 0 0 .242-.132l-.3-3.285a2.25 2.25 0 0 1 1.149-2.171L29.5 8.548a.5.5 0 0 0-.058-.902l-2.529-1.012a2.25 2.25 0 0 1-1.37-1.647l-.472-2.359a.47.47 0 0 0-.837-.19l-1.364 1.82a2.25 2.25 0 0 1-2.004.89l-3.493-.318a.15.15 0 0 0-.133.24l1.786 2.38a2.25 2.25 0 0 1 .289 2.186l-1.412 3.528l3.65-.73a2.25 2.25 0 0 1 1.823.43Z"
                      />
                      <path
                        fill="url(#f2397ida)"
                        d="M16 26c-9 0-9-9-9-9h18s0 9-9 9"
                      />
                      <path
                        fill="url(#f2397idh)"
                        d="M8 17.5V17h16v.5a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1"
                      />
                    </g>
                    <defs>
                      <radialGradient
                        id="f2397id0"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="rotate(132.839 10.786 10.065)scale(37.5033)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#fff478" />
                        <stop offset=".475" stopColor="#ffb02e" />
                        <stop offset="1" stopColor="#f70a8d" />
                      </radialGradient>
                      <radialGradient
                        id="f2397id1"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="rotate(131.878 10.74 10.193)scale(38.9487)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#fff478" />
                        <stop offset=".475" stopColor="#ffb02e" />
                        <stop offset="1" stopColor="#f70a8d" />
                      </radialGradient>
                      <radialGradient
                        id="f2397id2"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="rotate(101.31 2.876 12.808)scale(17.8466 22.8581)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop
                          offset=".788"
                          stopColor="#f59639"
                          stopOpacity="0"
                        />
                        <stop offset=".973" stopColor="#ff7dce" />
                      </radialGradient>
                      <radialGradient
                        id="f2397id3"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="matrix(-29 29 -29 -29 18 14)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset=".315" stopOpacity="0" />
                        <stop offset="1" />
                      </radialGradient>
                      <radialGradient
                        id="f2397id4"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="rotate(77.692 -2.555 18.434)scale(28.1469)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop
                          offset=".508"
                          stopColor="#7d6133"
                          stopOpacity="0"
                        />
                        <stop offset="1" stopColor="#715b32" />
                      </radialGradient>
                      <radialGradient
                        id="f2397id5"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="matrix(7.5 10.99996 -7.97335 5.4364 16.5 16.5)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#ffb849" />
                        <stop offset="1" stopColor="#ffb847" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient
                        id="f2397id6"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="matrix(11.49998 2 -2 11.49998 20.5 18)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#ffa64b" />
                        <stop offset=".9" stopColor="#ffae46" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient
                        id="f2397id7"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="rotate(43.971 -9.827 29.173)scale(59.0529)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset=".185" stopOpacity="0" />
                        <stop offset="1" stopOpacity="0.4" />
                      </radialGradient>
                      <radialGradient
                        id="f2397id8"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="matrix(-4.5 3 -3 -4.5 20 10)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset=".116" stopColor="#ec812a" />
                        <stop offset="1" stopColor="#fba84c" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient
                        id="f2397id9"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="rotate(158.199 2.248 7.174)scale(5.38516)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#cc7521" />
                        <stop offset="1" stopColor="#e6872b" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient
                        id="f2397ida"
                        cx="0"
                        cy="0"
                        r="1"
                        gradientTransform="matrix(0 -11 22 0 16 28)"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#f70a8d" />
                        <stop offset="1" stopColor="#89029c" />
                      </radialGradient>
                      <linearGradient
                        id="f2397idb"
                        x1="23.5"
                        x2="21.814"
                        y1="11.5"
                        y2="14.667"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset=".37" stopColor="#ec812a" />
                        <stop offset="1" stopColor="#fba84c" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient
                        id="f2397idc"
                        x1="10.5"
                        x2="10.25"
                        y1="11.5"
                        y2="14.025"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#c85f27" />
                        <stop offset="1" stopColor="#c85f27" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient
                        id="f2397idd"
                        x1="7.5"
                        x2="10"
                        y1="1"
                        y2="15"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#7912b2" />
                        <stop offset="1" stopColor="#cf1da1" />
                      </linearGradient>
                      <linearGradient
                        id="f2397ide"
                        x1="15"
                        x2="8.5"
                        y1="6"
                        y2="8.5"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#a82d9c" />
                        <stop offset="1" stopColor="#bf33b1" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient
                        id="f2397idf"
                        x1="22"
                        x2="22.5"
                        y1="2.5"
                        y2="14.5"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#7912b2" />
                        <stop offset="1" stopColor="#cf1da1" />
                      </linearGradient>
                      <linearGradient
                        id="f2397idg"
                        x1="29.5"
                        x2="23.5"
                        y1="6"
                        y2="6.5"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#b51aa6" />
                        <stop offset="1" stopColor="#bf33b1" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient
                        id="f2397idh"
                        x1="16"
                        x2="16"
                        y1="17"
                        y2="18.5"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="#d5a8fe" />
                        <stop offset="1" stopColor="#fff" />
                      </linearGradient>
                      <filter
                        id="f2397idi"
                        width="8.5"
                        height="9"
                        x="18"
                        y="10"
                        colorInterpolationFilters="sRGB"
                        filterUnits="userSpaceOnUse"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend
                          in="SourceGraphic"
                          in2="BackgroundImageFix"
                          result="shape"
                        />
                        <feGaussianBlur
                          result="effect1_foregroundBlur_23_461"
                          stdDeviation=".5"
                        />
                      </filter>
                      <filter
                        id="f2397idj"
                        width="8.5"
                        height="6.5"
                        x="6"
                        y="9"
                        colorInterpolationFilters="sRGB"
                        filterUnits="userSpaceOnUse"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend
                          in="SourceGraphic"
                          in2="BackgroundImageFix"
                          result="shape"
                        />
                        <feGaussianBlur
                          result="effect1_foregroundBlur_23_461"
                          stdDeviation=".5"
                        />
                      </filter>
                      <filter
                        id="f2397idk"
                        width="5.253"
                        height="9"
                        x="15.5"
                        y="5"
                        colorInterpolationFilters="sRGB"
                        filterUnits="userSpaceOnUse"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend
                          in="SourceGraphic"
                          in2="BackgroundImageFix"
                          result="shape"
                        />
                        <feGaussianBlur
                          result="effect1_foregroundBlur_23_461"
                          stdDeviation=".5"
                        />
                      </filter>
                      <filter
                        id="f2397idl"
                        width="5.253"
                        height="10"
                        x="2"
                        y="7"
                        colorInterpolationFilters="sRGB"
                        filterUnits="userSpaceOnUse"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend
                          in="SourceGraphic"
                          in2="BackgroundImageFix"
                          result="shape"
                        />
                        <feGaussianBlur
                          result="effect1_foregroundBlur_23_461"
                          stdDeviation=".5"
                        />
                      </filter>
                      <clipPath id="f2397idm">
                        <path fill="#fff" d="M0 0h32v32H0z" />
                      </clipPath>
                    </defs>
                  </g>
                </svg>
              </div>
            </div>
            {/*amount of percentage QNTM and total invited cards*/}
            <div className="flex space-x-3 px-4">
              {/*percent card*/}
              <div className="flex-1 bg-[#202020] p-4 rounded-2xl mt-3">
                <div className="font-medium uppercase">
                  earn <span className="animate-gradient-text">10%</span> from
                  your invites
                </div>
              </div>
              {/*total invited frens*/}
              <div className="flex-1 bg-[#202020] p-4 rounded-2xl mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="3em"
                        height="3em"
                        viewBox="0 0 32 32"
                      >
                        <g fill="none">
                          <path
                            fill="url(#f680id0)"
                            d="M15.257 21.947a1.7 1.7 0 0 0 1.708-.02c2.947-1.718 7.888-5.519 9.85-10.43c2.93-6.51-3.95-11.706-8.706-7.969c-.463.364-1.038.777-1.461 1.174c-.243.228-.667.252-.917.03c-.565-.5-1.385-1.11-1.921-1.473c-4.055-2.743-11.431.873-8.285 8.59C6.66 15.256 12 20.07 15.257 21.946"
                          />
                          <path
                            fill="url(#f680id1)"
                            d="M15.257 21.947a1.7 1.7 0 0 0 1.708-.02c2.947-1.718 7.888-5.519 9.85-10.43c2.93-6.51-3.95-11.706-8.706-7.969c-.463.364-1.038.777-1.461 1.174c-.243.228-.667.252-.917.03c-.565-.5-1.385-1.11-1.921-1.473c-4.055-2.743-11.431.873-8.285 8.59C6.66 15.256 12 20.07 15.257 21.946"
                          />
                          <path
                            fill="url(#f680id2)"
                            d="M15.257 21.947a1.7 1.7 0 0 0 1.708-.02c2.947-1.718 7.888-5.519 9.85-10.43c2.93-6.51-3.95-11.706-8.706-7.969c-.463.364-1.038.777-1.461 1.174c-.243.228-.667.252-.917.03c-.565-.5-1.385-1.11-1.921-1.473c-4.055-2.743-11.431.873-8.285 8.59C6.66 15.256 12 20.07 15.257 21.946"
                          />
                          <path
                            fill="url(#f680id3)"
                            d="M15.257 21.947a1.7 1.7 0 0 0 1.708-.02c2.947-1.718 7.888-5.519 9.85-10.43c2.93-6.51-3.95-11.706-8.706-7.969c-.463.364-1.038.777-1.461 1.174c-.243.228-.667.252-.917.03c-.565-.5-1.385-1.11-1.921-1.473c-4.055-2.743-11.431.873-8.285 8.59C6.66 15.256 12 20.07 15.257 21.946"
                          />
                          <path
                            fill="url(#f680ide)"
                            d="M15.257 21.947a1.7 1.7 0 0 0 1.708-.02c2.947-1.718 7.888-5.519 9.85-10.43c2.93-6.51-3.95-11.706-8.706-7.969c-.463.364-1.038.777-1.461 1.174c-.243.228-.667.252-.917.03c-.565-.5-1.385-1.11-1.921-1.473c-4.055-2.743-11.431.873-8.285 8.59C6.66 15.256 12 20.07 15.257 21.946"
                          />
                          <path
                            fill="url(#f680idf)"
                            d="M15.257 21.947a1.7 1.7 0 0 0 1.708-.02c2.947-1.718 7.888-5.519 9.85-10.43c2.93-6.51-3.95-11.706-8.706-7.969c-.463.364-1.038.777-1.461 1.174c-.243.228-.667.252-.917.03c-.565-.5-1.385-1.11-1.921-1.473c-4.055-2.743-11.431.873-8.285 8.59C6.66 15.256 12 20.07 15.257 21.946"
                          />
                          <g filter="url(#f680ida)">
                            <path
                              fill="#fa1c56"
                              d="M16.623 6.943v9.556c0 .905 1.026 1.273 1.5.502c1.475-2.403 2.781-5.907 1.906-8.724c-.485-1.561-1.906-2.158-2.853-2.073c-.357.033-.553.38-.553.739"
                            />
                          </g>
                          <g filter="url(#f680idb)">
                            <ellipse
                              cx="23.278"
                              cy="7.345"
                              fill="url(#f680id4)"
                              rx="3.399"
                              ry="2.338"
                              transform="rotate(-44.19 23.278 7.345)"
                            />
                          </g>
                          <circle
                            cx="16"
                            cy="26.977"
                            r="3.211"
                            fill="url(#f680id5)"
                          />
                          <circle
                            cx="16"
                            cy="26.977"
                            r="3.211"
                            fill="url(#f680id6)"
                          />
                          <circle
                            cx="16"
                            cy="26.977"
                            r="3.211"
                            fill="url(#f680id7)"
                          />
                          <g filter="url(#f680idc)">
                            <ellipse
                              cx="17.073"
                              cy="26.435"
                              fill="url(#f680id8)"
                              rx="1.363"
                              ry="1.266"
                              transform="rotate(-21.467 17.073 26.435)"
                            />
                          </g>
                          <g filter="url(#f680idd)">
                            <ellipse
                              cx="14.063"
                              cy="7.345"
                              fill="url(#f680id9)"
                              fillOpacity="0.6"
                              rx="3.905"
                              ry="2.107"
                              transform="rotate(-128.955 14.063 7.345)"
                            />
                          </g>
                          <defs>
                            <radialGradient
                              id="f680id0"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(0 -26.6008 45.2214 0 18.45 21.854)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#f12e52" />
                              <stop offset=".596" stopColor="#ff3b79" />
                              <stop offset="1" stopColor="#ff4ec6" />
                            </radialGradient>
                            <radialGradient
                              id="f680id1"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(-17.09851 12.8912 -24.1465 -32.02721 21.787 7.47)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".483"
                                stopColor="#b91d43"
                                stopOpacity="0"
                              />
                              <stop offset=".834" stopColor="#b91d43" />
                            </radialGradient>
                            <radialGradient
                              id="f680id2"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(-158.663 10.855 4.539)scale(18.5745 26.2576)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".41"
                                stopColor="#b91d43"
                                stopOpacity="0"
                              />
                              <stop offset=".834" stopColor="#b91d43" />
                            </radialGradient>
                            <radialGradient
                              id="f680id3"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(90 3.11 12.582)scale(16.1659)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".671"
                                stopColor="#ff7af2"
                                stopOpacity="0"
                              />
                              <stop offset=".934" stopColor="#ffbce6" />
                            </radialGradient>
                            <radialGradient
                              id="f680id4"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(-5.01798 -.28275 .19092 -3.38837 26.698 8.064)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#ff93ba" />
                              <stop
                                offset="1"
                                stopColor="#ff73a6"
                                stopOpacity="0"
                              />
                            </radialGradient>
                            <radialGradient
                              id="f680id5"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(-45 43.089 -2.228)scale(7.4596 12.0939)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#f12e52" />
                              <stop offset=".596" stopColor="#ff3b79" />
                              <stop offset="1" stopColor="#ff4ec6" />
                            </radialGradient>
                            <radialGradient
                              id="f680id6"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(110.556 -1.171 18.778)scale(4.73925 4.85721)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".671"
                                stopColor="#ff7af2"
                                stopOpacity="0"
                              />
                              <stop offset=".934" stopColor="#ffbce6" />
                            </radialGradient>
                            <radialGradient
                              id="f680id7"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(-152.663 13.124 12.133)scale(8.30216 8.87118)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".41"
                                stopColor="#b91d43"
                                stopOpacity="0"
                              />
                              <stop offset=".834" stopColor="#b91d43" />
                            </radialGradient>
                            <radialGradient
                              id="f680id8"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="rotate(174.347 8.715 13.789)scale(3.03081 5.73982)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#ffa3bd" />
                              <stop
                                offset="1"
                                stopColor="#ff80a3"
                                stopOpacity="0"
                              />
                            </radialGradient>
                            <radialGradient
                              id="f680id9"
                              cx="0"
                              cy="0"
                              r="1"
                              gradientTransform="matrix(-8.30787 -.19332 .10239 -4.40002 16.367 7.914)"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#ff93ba" />
                              <stop
                                offset="1"
                                stopColor="#ff73a6"
                                stopOpacity="0"
                              />
                            </radialGradient>
                            <filter
                              id="f680ida"
                              width="7.689"
                              height="15.223"
                              x="14.623"
                              y="4.196"
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
                                result="effect1_foregroundBlur_7000_5051"
                                stdDeviation="1"
                              />
                            </filter>
                            <filter
                              id="f680idb"
                              width="8.864"
                              height="8.805"
                              x="18.846"
                              y="2.942"
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
                                result="effect1_foregroundBlur_7000_5051"
                                stdDeviation=".75"
                              />
                            </filter>
                            <filter
                              id="f680idc"
                              width="4.702"
                              height="4.56"
                              x="14.722"
                              y="24.154"
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
                                result="effect1_foregroundBlur_7000_5051"
                                stdDeviation=".5"
                              />
                            </filter>
                            <filter
                              id="f680idd"
                              width="8.903"
                              height="9.627"
                              x="9.611"
                              y="2.531"
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
                                result="effect1_foregroundBlur_7000_5051"
                                stdDeviation=".75"
                              />
                            </filter>
                            <linearGradient
                              id="f680ide"
                              x1="17.477"
                              x2="24.018"
                              y1="11.364"
                              y2="19.15"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".694"
                                stopColor="#ff7af2"
                                stopOpacity="0"
                              />
                              <stop offset=".934" stopColor="#ffbce6" />
                            </linearGradient>
                            <linearGradient
                              id="f680idf"
                              x1="16.666"
                              x2="8.988"
                              y1="11.689"
                              y2="20.34"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop
                                offset=".694"
                                stopColor="#ff7af2"
                                stopOpacity="0"
                              />
                              <stop offset=".934" stopColor="#ffbce6" />
                            </linearGradient>
                          </defs>
                        </g>
                      </svg>
                    </div>
                    <div className="font-medium">
                      <div className="text-base whitespace-nowrap">
                        Total frens
                      </div>
                      <div className="text-base animate-gradient-text">
                        {referralsNum}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="font-semibold text-blue-500">Referrals</div>
                <div className="flex flex-col">
                        {loading ? (
                          <Loader />
                        ) : (
                          <>
                            {/*friends list*/}
                            <div className="space-y-0">
                              {
                                referralsContext && referralsContext.map((referral, index) => (
                                  <div key={index} className="flex items-center justify-between p-4 bg-black">
                                    <div className="flex items-center gap-2">
                                      <div>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="1.6em" height="1.6rem" viewBox="0 0 32 32">
                                          <path fill="#fff" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667" />
                                        </svg>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-sm">{referral.username}</div>
                                      </div>
                                    </div>
                                    <div className="font-semibold text-sm">{"+" +
                                      ((referral.quantamount * 10) / 100).toFixed(
                                        0
                                      )}{" "}
                                      QNTM</div>
                                  </div>
                                ))}
                              {totalReferralSize >= 20 && totalReferralSize !== referralsContext.length && viewButton === "View more" ? (
                                <div className="flex items-center justify-center">
                                  <button
                                    disabled={viewButton !== "View more"}
                                    className="bg-[#202021] text-white rounded-lg px-4 py-2"
                                    onClick={() => lookViewMore()}
                                  >
                                    {viewButton}</button>
                                </div>
                              ) : (
                                totalReferralSize >= 20 && totalReferralSize !== referralsContext.length && <ButtonLoader />
                              )}
              
                              <div className="text-center py-4">{errorMessage}</div>
                            </div>
                          </>
                        )}
                      </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FriendsPageContent;
