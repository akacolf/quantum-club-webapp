'use client';

import { useGameContext } from "@/app/contexts/MiningContext";
import { dbfs } from "@/app/firebase/firebaseConfig";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { bgSolveToEarnResultsPage } from "@/app/images";
import { rocketEmoji } from "@/app/images";
import Image from "next/image";

import { useEffect, useState } from "react";
const SolveToEarnResults = () => {
  const [buttonClicked, setButtonClicked] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.Telegram?.WebApp?.initData) {
        window.location.href = "https://t.me/QuantumClubBot";
        return;
      }
    }
    const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type;
    if (navigationType === "reload") {
      window.location.replace("/");
    } else {
    }
  }, []);
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
    } else {
      console.error("Permisson denied");
      window.location.replace("/")
      return;
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const WebApp = window.Telegram?.WebApp
      if (!WebApp?.initDataUnsafe.user) {
        return;
      } else {
        const mp = Boolean(sessionStorage.getItem('maintenance'));
        if (mp == true) {
          if (typeof window !== "undefined") { window.location.replace("/maintenance") }
        }
      }
    }
  }, []);
  const { remainingSolveToEarn, telegramId, setRemainingSolveToEarn } = useGameContext();
  const solvetoearnremaining = useState(remainingSolveToEarn);
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tg = window.Telegram?.WebApp;
      if (!tg) {
        return;
      }


      tg.BackButton.show();
      tg.BackButton.onClick = () => {
        router.push('/earn');
      };
    }
  }, [router])
  const totalCorrect = useState<string>(() => { if (typeof window !== "undefined") { return sessionStorage.getItem("TotalCorrectSolveToEarn") || "0" }else{return "0"} });
  const totalCorrectAnswers = useState(() => { if (typeof window !== "undefined") { return sessionStorage.getItem("correctAnswers") || 0 } })

  useEffect(() => {
    router.prefetch("/earn/solvetoearn-page");
  })
  async function checkRemainingSolveToEarn() {
    setButtonClicked(true)
    const solveToEarnRef = doc(dbfs, `user/${telegramId}/miningData/values`);
    const snapshotSolveToEarn = await getDoc(solveToEarnRef);
    const remainingSolveToEarnDB = snapshotSolveToEarn.exists() ? snapshotSolveToEarn.data().remainingSolveToEarn : 0;
    if (remainingSolveToEarnDB > 0) {
      updateDoc(solveToEarnRef,
        { remainingSolveToEarn: remainingSolveToEarnDB - 1, }
      )
      setRemainingSolveToEarn(remainingSolveToEarnDB - 1)
      router.push("/earn/solvetoearn-page");
    } else {
      router.push("/earn")
    }
  }
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="fixed inset-0 flex flex-col justify-center items-center bg-cover bg-center h-screen w-full"
          style={{ backgroundImage: `url(${bgSolveToEarnResultsPage.src})` }}
        >
          <div className="flex flex-col items-center justify-center flex-grow">
            <Image
              src={rocketEmoji}
              alt="rocket"
              width={100}
              height={100}
            />

            <div className="font-semibold text-center text-lg mt-3">You&apos;ve been solving non-stop! <br />Keep going!</div>
            {/*informational cards*/}
            <div className="space-x-3 flex">
              {/*card 1*/}
              <div className="flex-1 bg-[#202020] p-3 rounded-2xl mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 32 32">
                        <path fill="currentColor" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667" />
                      </svg>
                    </div>
                    <div className="font-medium">
                      <div className="text-sm whitespace-nowrap">Total earned</div>
                      <div className="text-sm animate-gradient-text">+{`${totalCorrect}`} QNTM</div>
                    </div>
                  </div>
                </div>
              </div>
              {/*card 2*/}
              <div className="flex-1 bg-[#202020] p-3 rounded-2xl mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 48 48">
                        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="m4 24l5-5l10 10L39 9l5 5l-25 25z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="font-medium">
                      <div className="text-sm whitespace-nowrap">Total correct</div>
                      <div className="text-sm animate-gradient-text">{`${totalCorrectAnswers}`}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {remainingSolveToEarn > 0 && (<button disabled={buttonClicked} onClick={() => checkRemainingSolveToEarn()} className="px-24 py-3 bg-white text-black rounded-lg">Solve again (<div className="inline-flex items-center align-middle"><svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" className="mr-0.5" viewBox="0 0 32 32">
            <g fill="none">
              <g filter="url(#f1543id9)">
                <path fill="url(#f1543id0)" d="m6.118 26.455l5.047-5.047l3.21 3.211a1.286 1.286 0 0 1-1.039 2.19l-1.08-.11a.87.87 0 0 0-.954.931l.084 1.072a1.214 1.214 0 0 1-2.069.952z" />
              </g>
              <g filter="url(#f1543ida)">
                <path fill="url(#f1543id1)" d="m16.397 12.172l3.407 3.406L6.865 28.516a2.409 2.409 0 0 1-3.406-3.407z" />
              </g>
              <g filter="url(#f1543idb)">
                <path fill="url(#f1543id2)" fillRule="evenodd" d="M21.882 18a7.969 7.969 0 1 0 0-15.937a7.969 7.969 0 0 0 0 15.937m0-4a3.969 3.969 0 1 0 0-7.937a3.969 3.969 0 0 0 0 7.937" clipRule="evenodd" />
              </g>
              <rect width="6.165" height="1.528" x="13.28" y="14.242" fill="url(#f1543id3)" rx=".764" transform="rotate(45 13.28 14.242)" />
              <rect width="6.165" height="1.528" x="13.28" y="14.242" fill="url(#f1543idd)" rx=".764" transform="rotate(45 13.28 14.242)" />
              <rect width="6.165" height="1.528" x="13.28" y="14.242" fill="url(#f1543id4)" rx=".764" transform="rotate(45 13.28 14.242)" />
              <rect width="6.165" height="1.528" x="14.361" y="13.162" fill="url(#f1543id5)" rx=".764" transform="rotate(45 14.36 13.162)" />
              <rect width="6.165" height="1.528" x="14.361" y="13.162" fill="url(#f1543ide)" rx=".764" transform="rotate(45 14.36 13.162)" />
              <rect width="6.165" height="1.528" x="14.361" y="13.162" fill="url(#f1543id6)" rx=".764" transform="rotate(45 14.36 13.162)" />
              <g filter="url(#f1543idc)">
                <circle cx="22.309" cy="9.604" r="6.309" stroke="url(#f1543id7)" strokeWidth="1.25" />
                <circle cx="22.309" cy="9.604" r="6.309" stroke="url(#f1543id8)" strokeWidth="1.25" />
              </g>
              <defs>
                <linearGradient id="f1543id0" x1="11.632" x2="9.632" y1="27.875" y2="25.709" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f4b954" />
                  <stop offset=".908" stopColor="#eca84f" />
                </linearGradient>
                <linearGradient id="f1543id1" x1="8.038" x2="11.279" y1="21.031" y2="24.188" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f7c250" />
                  <stop offset="1" stopColor="#f8ab54" />
                </linearGradient>
                <linearGradient id="f1543id2" x1="21.882" x2="21.882" y1="2.813" y2="18" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f8cf4d" />
                  <stop offset="1" stopColor="#ed9953" />
                </linearGradient>
                <linearGradient id="f1543id3" x1="14.087" x2="18.329" y1="15.107" y2="15.152" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f6bf4e" />
                  <stop offset="1" stopColor="#ea994d" />
                </linearGradient>
                <linearGradient id="f1543id4" x1="16.683" x2="16.678" y1="15.98" y2="15.322" gradientUnits="userSpaceOnUse">
                  <stop offset=".186" stopColor="#e29226" />
                  <stop offset="1" stopColor="#ec9b4f" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="f1543id5" x1="15.167" x2="19.41" y1="14.027" y2="14.071" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f6bf4e" />
                  <stop offset="1" stopColor="#ea994d" />
                </linearGradient>
                <linearGradient id="f1543id6" x1="17.764" x2="17.759" y1="14.9" y2="14.241" gradientUnits="userSpaceOnUse">
                  <stop offset=".186" stopColor="#e29226" />
                  <stop offset="1" stopColor="#e29226" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="f1543id7" x1="27.32" x2="21.468" y1="4.298" y2="9.259" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ffdd67" />
                  <stop offset="1" stopColor="#ffdd67" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="f1543id8" x1="17.632" x2="19.007" y1="14" y2="11.813" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#feb765" />
                  <stop offset="1" stopColor="#feb765" stopOpacity="0" />
                </linearGradient>
                <filter id="f1543id9" width="8.635" height="8.752" x="6.118" y="21.258" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                  <feFlood floodOpacity="0" result="BackgroundImageFix" />
                  <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                  <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                  <feOffset dy="-.15" />
                  <feGaussianBlur stdDeviation=".25" />
                  <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                  <feColorMatrix values="0 0 0 0 0.839216 0 0 0 0 0.592157 0 0 0 0 0.34902 0 0 0 1 0" />
                  <feBlend in2="shape" result="effect1_innerShadow_18_23735" />
                </filter>
                <filter id="f1543ida" width="17.049" height="17.549" x="2.754" y="11.672" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                  <feFlood floodOpacity="0" result="BackgroundImageFix" />
                  <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                  <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                  <feOffset dy="-.5" />
                  <feGaussianBlur stdDeviation=".75" />
                  <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                  <feColorMatrix values="0 0 0 0 0.85098 0 0 0 0 0.541176 0 0 0 0 0.34902 0 0 0 1 0" />
                  <feBlend in2="shape" result="effect1_innerShadow_18_23735" />
                </filter>
                <filter id="f1543idb" width="15.938" height="16.337" x="13.913" y="1.663" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                  <feFlood floodOpacity="0" result="BackgroundImageFix" />
                  <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                  <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                  <feOffset dy="-.4" />
                  <feGaussianBlur stdDeviation=".5" />
                  <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
                  <feColorMatrix values="0 0 0 0 0.815686 0 0 0 0 0.505882 0 0 0 0 0.337255 0 0 0 1 0" />
                  <feBlend in2="shape" result="effect1_innerShadow_18_23735" />
                </filter>
                <filter id="f1543idc" width="16.368" height="16.368" x="14.125" y="1.42" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                  <feFlood floodOpacity="0" result="BackgroundImageFix" />
                  <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                  <feGaussianBlur result="effect1_foregroundBlur_18_23735" stdDeviation=".625" />
                </filter>
                <radialGradient id="f1543idd" cx="0" cy="0" r="1" gradientTransform="matrix(-.01573 .32677 -1.89283 -.09112 16.743 14.626)" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fcbc66" />
                  <stop offset="1" stopColor="#fcbc66" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="f1543ide" cx="0" cy="0" r="1" gradientTransform="matrix(-.01573 .32677 -1.89283 -.09112 17.823 13.545)" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fbb865" />
                  <stop offset="1" stopColor="#fbb865" stopOpacity="0" />
                </radialGradient>
              </defs>
            </g>
          </svg></div>{`${solvetoearnremaining}`})</button>)}


        </div>

      </motion.div>
    </AnimatePresence>
  )
}

export default SolveToEarnResults;