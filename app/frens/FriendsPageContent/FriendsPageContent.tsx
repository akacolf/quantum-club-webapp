"use client";
import React, {  useEffect } from "react";
import {
  collection,
  getCountFromServer,
} from "firebase/firestore";
import { dbfs } from "@/app/firebase/firebaseConfig";
import { useFrenContext } from "@/app/contexts/FrensContext";
import CopyLinkNotification from "./copied-notification-info";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { bgFrensPageCard } from "@/app/images";
import { useRouter } from "next/navigation";
import { useGameContext } from "@/app/contexts/MiningContext";
const FriendsPageContent = () => {
  const { referralsNum, setReferralNum } = useFrenContext();
  const router = useRouter();
  const { telegramId } = useGameContext(); //const { telegramId } = useGameContext();// // mining context types declared //
  const pathname = usePathname();
  useEffect(() => {
    router.prefetch("/frens/referrals");
    const getReferralsNum = async () => {
      const referralsRef = collection(dbfs, `user/${telegramId}/referrals`);
      const snapshot = await getCountFromServer(referralsRef);
      setReferralNum(snapshot.data().count);
    };
    getReferralsNum();
  });
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
              <div
                onClick={() => {
                  router.push("/frens/referrals");
                }}
                className="flex justify-between items-center cursor-pointer bg-[#202021] p-2 rounded-lg mt-3"
              >
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="2em"
                    height="2em"
                    viewBox="0 0 32 32"
                  >
                    <g fill="none">
                      <g filter="url(#f666idv)">
                        <path
                          fill="url(#f666idi)"
                          d="M6.814 6.47c.452-.223 1.64-.69 3.579-.512c3.231.468 5.708.842 6.562.98L14.878 8.19a7.6 7.6 0 0 1 1.243 1.64l.385-.442l10.857 9.495a2.229 2.229 0 0 1-1.763 3.886a2.41 2.41 0 0 1-2.997 3.35a2.41 2.41 0 0 1-3.648 1.991a2.452 2.452 0 0 1-4.019 1.381l-8.844-7.71a2.46 2.46 0 0 1-.84-2.006A7.566 7.566 0 0 1 6.813 6.47"
                        />
                        <path
                          fill="url(#f666id0)"
                          d="M6.814 6.47c.452-.223 1.64-.69 3.579-.512c3.231.468 5.708.842 6.562.98L14.878 8.19a7.6 7.6 0 0 1 1.243 1.64l.385-.442l10.857 9.495a2.229 2.229 0 0 1-1.763 3.886a2.41 2.41 0 0 1-2.997 3.35a2.41 2.41 0 0 1-3.648 1.991a2.452 2.452 0 0 1-4.019 1.381l-8.844-7.71a2.46 2.46 0 0 1-.84-2.006A7.566 7.566 0 0 1 6.813 6.47"
                        />
                      </g>
                      <path
                        fill="url(#f666id1)"
                        d="M6.814 6.47c.452-.223 1.64-.69 3.579-.512c3.231.468 5.708.842 6.562.98L14.878 8.19a7.6 7.6 0 0 1 1.243 1.64l.385-.442l10.857 9.495a2.229 2.229 0 0 1-1.763 3.886a2.41 2.41 0 0 1-2.997 3.35a2.41 2.41 0 0 1-3.648 1.991a2.452 2.452 0 0 1-4.019 1.381l-8.844-7.71a2.46 2.46 0 0 1-.84-2.006A7.566 7.566 0 0 1 6.813 6.47"
                      />
                      <path
                        fill="url(#f666id2)"
                        d="M6.814 6.47c.452-.223 1.64-.69 3.579-.512c3.231.468 5.708.842 6.562.98L14.878 8.19a7.6 7.6 0 0 1 1.243 1.64l.385-.442l10.857 9.495a2.229 2.229 0 0 1-1.763 3.886a2.41 2.41 0 0 1-2.997 3.35a2.41 2.41 0 0 1-3.648 1.991a2.452 2.452 0 0 1-4.019 1.381l-8.844-7.71a2.46 2.46 0 0 1-.84-2.006A7.566 7.566 0 0 1 6.813 6.47"
                      />
                      <path
                        fill="url(#f666id3)"
                        d="M6.814 6.47c.452-.223 1.64-.69 3.579-.512c3.231.468 5.708.842 6.562.98L14.878 8.19a7.6 7.6 0 0 1 1.243 1.64l.385-.442l10.857 9.495a2.229 2.229 0 0 1-1.763 3.886a2.41 2.41 0 0 1-2.997 3.35a2.41 2.41 0 0 1-3.648 1.991a2.452 2.452 0 0 1-4.019 1.381l-8.844-7.71a2.46 2.46 0 0 1-.84-2.006A7.566 7.566 0 0 1 6.813 6.47"
                      />
                      <path
                        fill="url(#f666id4)"
                        d="M6.814 6.47c.452-.223 1.64-.69 3.579-.512c3.231.468 5.708.842 6.562.98L14.878 8.19a7.6 7.6 0 0 1 1.243 1.64l.385-.442l10.857 9.495a2.229 2.229 0 0 1-1.763 3.886a2.41 2.41 0 0 1-2.997 3.35a2.41 2.41 0 0 1-3.648 1.991a2.452 2.452 0 0 1-4.019 1.381l-8.844-7.71a2.46 2.46 0 0 1-.84-2.006A7.566 7.566 0 0 1 6.813 6.47"
                      />
                      <path
                        fill="url(#f666id5)"
                        d="M6.814 6.47c.452-.223 1.64-.69 3.579-.512c3.231.468 5.708.842 6.562.98L14.878 8.19a7.6 7.6 0 0 1 1.243 1.64l.385-.442l10.857 9.495a2.229 2.229 0 0 1-1.763 3.886a2.41 2.41 0 0 1-2.997 3.35a2.41 2.41 0 0 1-3.648 1.991a2.452 2.452 0 0 1-4.019 1.381l-8.844-7.71a2.46 2.46 0 0 1-.84-2.006A7.566 7.566 0 0 1 6.813 6.47"
                      />
                      <g filter="url(#f666idw)">
                        <path
                          fill="#ffb21a"
                          fillRule="evenodd"
                          d="M4.682 18.252a1.983 1.983 0 0 0-.112 2.659a2.08 2.08 0 0 0 1.968.728a1.94 1.94 0 0 0 .375 2.22c.552.55 1.377.749 2.076.525c-.12.596.163 1.273.647 1.758c.478.477 1.228.598 1.824.408c-.075.542.087 1.13.446 1.561c.67.806 1.973 1.007 2.8.316l1.343-1.387c.684-.671.63-1.962 0-2.684c-.427-.491-1.034-.708-1.61-.625c.389-.679.235-1.588-.25-2.143c-.49-.56-1.158-.777-1.75-.65a2.04 2.04 0 0 0-.436-2.22c-.627-.615-1.588-.706-2.33-.3a2.002 2.002 0 0 0-3.39-1.793z"
                          clipRule="evenodd"
                        />
                      </g>
                      <g filter="url(#f666idx)">
                        <path
                          stroke="url(#f666idj)"
                          strokeLinecap="round"
                          strokeWidth="1.5"
                          d="m15.044 25.851l2.411 2.156"
                        />
                      </g>
                      <g filter="url(#f666idy)">
                        <path
                          fill="#d77a15"
                          d="M13.208 8.117a20 20 0 0 0-1.754.58l.002.005a1.8 1.8 0 0 0-1.04 1.62c0 .996.827 1.802 1.846 1.802c.248 0 .485-.048.701-.135l.553-.174h.003l.516-.166c3.498-1.126 1.76-1.522-.827-3.532"
                        />
                      </g>
                      <g filter="url(#f666idz)">
                        <path
                          stroke="url(#f666idk)"
                          strokeLinecap="round"
                          strokeWidth="1.5"
                          d="m18.12 12.42l8.562 7.625"
                        />
                      </g>
                      <g filter="url(#f666id10)">
                        <path
                          stroke="url(#f666idl)"
                          strokeLinecap="round"
                          strokeWidth="1.5"
                          d="m22.15 21.563l2.413 2.156"
                        />
                      </g>
                      <g filter="url(#f666id11)">
                        <path
                          stroke="url(#f666idm)"
                          strokeLinecap="round"
                          strokeWidth="1.5"
                          d="m18.897 24.132l2.412 2.157"
                        />
                      </g>
                      <path
                        fill="url(#f666idn)"
                        d="M3.407 21.259a2.2 2.2 0 0 1 .124-2.948l1.775-1.803a2.22 2.22 0 1 1 3.137 3.142l-1.801 1.866c-.918.9-2.413.731-3.235-.257"
                      />
                      <path
                        fill="url(#f666ido)"
                        d="M3.407 21.259a2.2 2.2 0 0 1 .124-2.948l1.775-1.803a2.22 2.22 0 1 1 3.137 3.142l-1.801 1.866c-.918.9-2.413.731-3.235-.257"
                      />
                      <path
                        fill="url(#f666id6)"
                        d="M3.407 21.259a2.2 2.2 0 0 1 .124-2.948l1.775-1.803a2.22 2.22 0 1 1 3.137 3.142l-1.801 1.866c-.918.9-2.413.731-3.235-.257"
                      />
                      <path
                        fill="url(#f666id7)"
                        d="M3.407 21.259a2.2 2.2 0 0 1 .124-2.948l1.775-1.803a2.22 2.22 0 1 1 3.137 3.142l-1.801 1.866c-.918.9-2.413.731-3.235-.257"
                      />
                      <path
                        fill="url(#f666idp)"
                        d="M6.005 24.53a2.15 2.15 0 0 1-.018-3.027l2.568-2.62c.836-.853 2.241-.891 3.094-.055c.855.84.882 2.279.037 3.13L9.1 24.625c-.838.843-2.254.742-3.096-.097"
                      />
                      <path
                        fill="url(#f666idq)"
                        d="M6.005 24.53a2.15 2.15 0 0 1-.018-3.027l2.568-2.62c.836-.853 2.241-.891 3.094-.055c.855.84.882 2.279.037 3.13L9.1 24.625c-.838.843-2.254.742-3.096-.097"
                      />
                      <path
                        fill="url(#f666id8)"
                        d="M6.005 24.53a2.15 2.15 0 0 1-.018-3.027l2.568-2.62c.836-.853 2.241-.891 3.094-.055c.855.84.882 2.279.037 3.13L9.1 24.625c-.838.843-2.254.742-3.096-.097"
                      />
                      <path
                        fill="url(#f666id9)"
                        d="M6.005 24.53a2.15 2.15 0 0 1-.018-3.027l2.568-2.62c.836-.853 2.241-.891 3.094-.055c.855.84.882 2.279.037 3.13L9.1 24.625c-.838.843-2.254.742-3.096-.097"
                      />
                      <path
                        fill="url(#f666idr)"
                        d="M11.54 29.243c-.653-.785-.716-2.038 0-2.766l1.718-1.53c.82-.833 2.11-.75 2.877.132c.698.8.758 2.232 0 2.976l-1.488 1.54c-.918.765-2.363.542-3.107-.352"
                      />
                      <path
                        fill="url(#f666ids)"
                        d="M11.54 29.243c-.653-.785-.716-2.038 0-2.766l1.718-1.53c.82-.833 2.11-.75 2.877.132c.698.8.758 2.232 0 2.976l-1.488 1.54c-.918.765-2.363.542-3.107-.352"
                      />
                      <path
                        fill="url(#f666ida)"
                        d="M11.54 29.243c-.653-.785-.716-2.038 0-2.766l1.718-1.53c.82-.833 2.11-.75 2.877.132c.698.8.758 2.232 0 2.976l-1.488 1.54c-.918.765-2.363.542-3.107-.352"
                      />
                      <path
                        fill="url(#f666idb)"
                        d="M11.54 29.243c-.653-.785-.716-2.038 0-2.766l1.718-1.53c.82-.833 2.11-.75 2.877.132c.698.8.758 2.232 0 2.976l-1.488 1.54c-.918.765-2.363.542-3.107-.352"
                      />
                      <path
                        fill="url(#f666idt)"
                        d="M9.024 27.06c-.757-.757-1.07-1.938-.314-2.694l2.557-2.604c.757-.756 1.998-.676 2.806.248c.63.721.756 1.983 0 2.74l-2.31 2.31c-.612.704-1.983.756-2.74 0"
                      />
                      <path
                        fill="url(#f666idu)"
                        d="M9.024 27.06c-.757-.757-1.07-1.938-.314-2.694l2.557-2.604c.757-.756 1.998-.676 2.806.248c.63.721.756 1.983 0 2.74l-2.31 2.31c-.612.704-1.983.756-2.74 0"
                      />
                      <path
                        fill="url(#f666idc)"
                        d="M9.024 27.06c-.757-.757-1.07-1.938-.314-2.694l2.557-2.604c.757-.756 1.998-.676 2.806.248c.63.721.756 1.983 0 2.74l-2.31 2.31c-.612.704-1.983.756-2.74 0"
                      />
                      <path
                        fill="url(#f666idd)"
                        d="M9.024 27.06c-.757-.757-1.07-1.938-.314-2.694l2.557-2.604c.757-.756 1.998-.676 2.806.248c.63.721.756 1.983 0 2.74l-2.31 2.31c-.612.704-1.983.756-2.74 0"
                      />
                      <g filter="url(#f666id12)">
                        <path
                          fill="#fbb439"
                          d="m12.128 8.036l.002.006a2.095 2.095 0 0 0 1.71 3.824l.628-.203l.003-.001c.954-.309 2.359-.796 3.125-.948c.238-.048.472.04.655.2l9.093 7.961c1.646-1.446 2.745-3.415 2.745-5.698c0-3.984-3.154-7.213-7.269-7.213c-2.822.14-7.303.729-10.692 2.072"
                        />
                        <path
                          fill="url(#f666ide)"
                          d="m12.128 8.036l.002.006a2.095 2.095 0 0 0 1.71 3.824l.628-.203l.003-.001c.954-.309 2.359-.796 3.125-.948c.238-.048.472.04.655.2l9.093 7.961c1.646-1.446 2.745-3.415 2.745-5.698c0-3.984-3.154-7.213-7.269-7.213c-2.822.14-7.303.729-10.692 2.072"
                        />
                        <path
                          fill="url(#f666idf)"
                          d="m12.128 8.036l.002.006a2.095 2.095 0 0 0 1.71 3.824l.628-.203l.003-.001c.954-.309 2.359-.796 3.125-.948c.238-.048.472.04.655.2l9.093 7.961c1.646-1.446 2.745-3.415 2.745-5.698c0-3.984-3.154-7.213-7.269-7.213c-2.822.14-7.303.729-10.692 2.072"
                        />
                        <path
                          fill="url(#f666idg)"
                          d="m12.128 8.036l.002.006a2.095 2.095 0 0 0 1.71 3.824l.628-.203l.003-.001c.954-.309 2.359-.796 3.125-.948c.238-.048.472.04.655.2l9.093 7.961c1.646-1.446 2.745-3.415 2.745-5.698c0-3.984-3.154-7.213-7.269-7.213c-2.822.14-7.303.729-10.692 2.072"
                        />
                      </g>
                      <path
                        fill="url(#f666idh)"
                        d="m12.128 8.036l.002.006a2.095 2.095 0 0 0 1.71 3.824l.628-.203l.003-.001c.954-.309 2.359-.796 3.125-.948c.238-.048.472.04.655.2l9.093 7.961c1.646-1.446 2.745-3.415 2.745-5.698c0-3.984-3.154-7.213-7.269-7.213c-2.822.14-7.303.729-10.692 2.072"
                      />
                      <g filter="url(#f666id13)">
                        <path
                          fill="#ffe746"
                          d="M18.736 9.508c-1.305.32-2.894.806-4.055 1.188a1.276 1.276 0 0 1-1.626-.847c-.174-.603.132-1.242.725-1.45c1.49-.52 3.306-.991 4.606-1.256c.623-.127 1.205.298 1.317.924c.117.655-.321 1.283-.967 1.44"
                        />
                      </g>
                      <defs>
                        <radialGradient
                          id="f666id0"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(-2.56252 3.99998 -5.56204 -3.56323 19.963 10.47)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffdc38" />
                          <stop
                            offset="1"
                            stopColor="#ffdc38"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666id1"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(-2 -1.90624 1.52119 -1.59601 26.4 24.157)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffcb41" />
                          <stop
                            offset="1"
                            stopColor="#ffcb41"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666id2"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(-3.53124 -3.09376 .84515 -.96466 27.057 22.97)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#f48e5a" />
                          <stop
                            offset="1"
                            stopColor="#f48e5a"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666id3"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="rotate(-134.193 17.942 8.348)scale(6.2762 1.71453)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#f48e5a" />
                          <stop
                            offset="1"
                            stopColor="#f48e5a"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666id4"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(-3.40627 -3.53124 1.1197 -1.08007 20.088 28.876)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#f48e5a" />
                          <stop
                            offset="1"
                            stopColor="#f48e5a"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666id5"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(-4.25002 -3.65624 1.07172 -1.24576 16.682 30.844)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#f48e5a" />
                          <stop
                            offset="1"
                            stopColor="#f48e5a"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666id6"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(.0625 -3.1875 2.8824 .05652 5.276 22.813)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#da725b" />
                          <stop
                            offset="1"
                            stopColor="#da725b"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666id7"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="rotate(136.229 .953 9.928)scale(2.5749 2.49023)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffe43e" />
                          <stop
                            offset="1"
                            stopColor="#ffe43e"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666id8"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(.5 -4.12846 4.87877 .59087 7.557 25.844)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#e8766e" />
                          <stop
                            offset="1"
                            stopColor="#e8766e"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666id9"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="rotate(136.026 1.78 11.877)scale(2.425 2.34528)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffe43e" />
                          <stop
                            offset="1"
                            stopColor="#ffe43e"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666ida"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(.375 -3.63103 4.2974 .44382 12.776 30.844)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#e8766e" />
                          <stop
                            offset="1"
                            stopColor="#e8766e"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666idb"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(-1.42361 1.37136 -1.3262 -1.37673 15.867 25.155)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffe43e" />
                          <stop
                            offset="1"
                            stopColor="#ffe43e"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666idc"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="rotate(-83.082 21.039 8.298)scale(3.78297 4.47857)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#e8766e" />
                          <stop
                            offset="1"
                            stopColor="#e8766e"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666idd"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="rotate(136.08 2.38 13.824)scale(2.20801 2.13528)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffe43e" />
                          <stop
                            offset="1"
                            stopColor="#ffe43e"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666ide"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(10.09152 -6.72769 10.57376 15.86062 19.178 17.094)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop
                            offset=".361"
                            stopColor="#ffe949"
                            stopOpacity="0"
                          />
                          <stop offset="1" stopColor="#ffe949" />
                        </radialGradient>
                        <radialGradient
                          id="f666idf"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(4.02295 -1.5768 2.532 6.46 10.95 10.735)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ee9226" />
                          <stop
                            offset="1"
                            stopColor="#ee9226"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666idg"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(6.72762 -5.36117 5.1162 6.42022 18.705 17.305)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#f7a91e" />
                          <stop
                            offset="1"
                            stopColor="#f7a91e"
                            stopOpacity="0"
                          />
                        </radialGradient>
                        <radialGradient
                          id="f666idh"
                          cx="0"
                          cy="0"
                          r="1"
                          gradientTransform="matrix(9.35565 -6.78022 10.60828 14.63776 20.229 15.518)"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop
                            offset=".661"
                            stopColor="#ffea49"
                            stopOpacity="0"
                          />
                          <stop offset="1" stopColor="#ffea49" />
                        </radialGradient>
                        <linearGradient
                          id="f666idi"
                          x1="22.588"
                          x2="15.901"
                          y1="14.032"
                          y2="23.844"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffd741" />
                          <stop offset="1" stopColor="#ffbe37" />
                        </linearGradient>
                        <linearGradient
                          id="f666idj"
                          x1="17.455"
                          x2="13.825"
                          y1="28.007"
                          y2="24.445"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffcd43" />
                          <stop
                            offset="1"
                            stopColor="#ffcd43"
                            stopOpacity="0"
                          />
                        </linearGradient>
                        <linearGradient
                          id="f666idk"
                          x1="26.682"
                          x2="17.619"
                          y1="20.045"
                          y2="12.17"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffe647" />
                          <stop
                            offset="1"
                            stopColor="#ffe647"
                            stopOpacity="0"
                          />
                        </linearGradient>
                        <linearGradient
                          id="f666idl"
                          x1="24.563"
                          x2="20.932"
                          y1="23.719"
                          y2="20.157"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffd941" />
                          <stop
                            offset="1"
                            stopColor="#ffd941"
                            stopOpacity="0"
                          />
                        </linearGradient>
                        <linearGradient
                          id="f666idm"
                          x1="21.309"
                          x2="17.678"
                          y1="26.289"
                          y2="22.726"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffd63f" />
                          <stop
                            offset="1"
                            stopColor="#ffd63f"
                            stopOpacity="0"
                          />
                        </linearGradient>
                        <linearGradient
                          id="f666idn"
                          x1="7.682"
                          x2="3.338"
                          y1="17.157"
                          y2="21.344"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffbc41" />
                          <stop offset="1" stopColor="#e69429" />
                        </linearGradient>
                        <linearGradient
                          id="f666ido"
                          x1="7.291"
                          x2="6.323"
                          y1="21.173"
                          y2="20.141"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#e08407" />
                          <stop
                            offset="1"
                            stopColor="#e08407"
                            stopOpacity="0"
                          />
                        </linearGradient>
                        <linearGradient
                          id="f666idp"
                          x1="10.713"
                          x2="5.863"
                          y1="19.685"
                          y2="24.361"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffbc41" />
                          <stop offset="1" stopColor="#e69429" />
                        </linearGradient>
                        <linearGradient
                          id="f666idq"
                          x1="10.277"
                          x2="9.195"
                          y1="24.17"
                          y2="23.018"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#e08407" />
                          <stop
                            offset="1"
                            stopColor="#e08407"
                            stopOpacity="0"
                          />
                        </linearGradient>
                        <linearGradient
                          id="f666idr"
                          x1="15.383"
                          x2="11.432"
                          y1="25.56"
                          y2="29.373"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffbc41" />
                          <stop offset="1" stopColor="#e69429" />
                        </linearGradient>
                        <linearGradient
                          id="f666ids"
                          x1="12.057"
                          x2="13.462"
                          y1="26.126"
                          y2="27.034"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop offset=".156" stopColor="#e08407" />
                          <stop
                            offset="1"
                            stopColor="#e08407"
                            stopOpacity="0"
                          />
                        </linearGradient>
                        <linearGradient
                          id="f666idt"
                          x1="13.143"
                          x2="8.73"
                          y1="22.582"
                          y2="26.843"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#ffbc41" />
                          <stop offset="1" stopColor="#e69429" />
                        </linearGradient>
                        <linearGradient
                          id="f666idu"
                          x1="13.026"
                          x2="12.105"
                          y1="26.907"
                          y2="25.921"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#e08407" />
                          <stop
                            offset="1"
                            stopColor="#e08407"
                            stopOpacity="0"
                          />
                        </linearGradient>
                        <filter
                          id="f666idv"
                          width="27.663"
                          height="25.676"
                          x="1.962"
                          y="4.418"
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
                          <feOffset dx="1.5" dy="-1.5" />
                          <feGaussianBlur stdDeviation="1.5" />
                          <feComposite
                            in2="hardAlpha"
                            k2="-1"
                            k3="1"
                            operator="arithmetic"
                          />
                          <feColorMatrix values="0 0 0 0 0.945098 0 0 0 0 0.615686 0 0 0 0 0.156863 0 0 0 1 0" />
                          <feBlend
                            in2="shape"
                            result="effect1_innerShadow_20020_4022"
                          />
                        </filter>
                        <filter
                          id="f666idw"
                          width="13.93"
                          height="14.318"
                          x="3.362"
                          y="15.279"
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
                            result="effect1_foregroundBlur_20020_4022"
                            stdDeviation=".375"
                          />
                        </filter>
                        <filter
                          id="f666idx"
                          width="6.912"
                          height="6.656"
                          x="12.793"
                          y="23.601"
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
                            result="effect1_foregroundBlur_20020_4022"
                            stdDeviation=".75"
                          />
                        </filter>
                        <filter
                          id="f666idy"
                          width="7.303"
                          height="5.727"
                          x="9.557"
                          y="7.257"
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
                            result="effect1_foregroundBlur_20020_4022"
                            stdDeviation=".43"
                          />
                        </filter>
                        <filter
                          id="f666idz"
                          width="13.063"
                          height="12.125"
                          x="15.869"
                          y="10.17"
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
                            result="effect1_foregroundBlur_20020_4022"
                            stdDeviation=".75"
                          />
                        </filter>
                        <filter
                          id="f666id10"
                          width="6.912"
                          height="6.656"
                          x="19.901"
                          y="19.313"
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
                            result="effect1_foregroundBlur_20020_4022"
                            stdDeviation=".75"
                          />
                        </filter>
                        <filter
                          id="f666id11"
                          width="6.912"
                          height="6.656"
                          x="16.647"
                          y="21.882"
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
                            result="effect1_foregroundBlur_20020_4022"
                            stdDeviation=".75"
                          />
                        </filter>
                        <filter
                          id="f666id12"
                          width="19.139"
                          height="13.061"
                          x="10.95"
                          y="5.964"
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
                          <feOffset dy=".15" />
                          <feGaussianBlur stdDeviation=".5" />
                          <feComposite
                            in2="hardAlpha"
                            k2="-1"
                            k3="1"
                            operator="arithmetic"
                          />
                          <feColorMatrix values="0 0 0 0 0.917647 0 0 0 0 0.615686 0 0 0 0 0.137255 0 0 0 1 0" />
                          <feBlend
                            in2="shape"
                            result="effect1_innerShadow_20020_4022"
                          />
                        </filter>
                        <filter
                          id="f666id13"
                          width="10.716"
                          height="7.64"
                          x="11.006"
                          y="5.12"
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
                            result="effect1_foregroundBlur_20020_4022"
                            stdDeviation="1"
                          />
                        </filter>
                      </defs>
                    </g>
                  </svg>
                  <div className="font-medium text-base">Frens invited</div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.5em"
                  height="1.5em"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z"
                  />
                </svg>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FriendsPageContent;
