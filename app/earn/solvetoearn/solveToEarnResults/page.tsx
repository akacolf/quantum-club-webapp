'use client';

import { useUserContext } from "@/app/(contexts)/UserContext";
import { dbfs } from "@/app/(firebase)/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import rocketAnimationData from "@/public/lottie/rocket-lottie.json";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { useEffect, useRef, useState } from "react";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SolveToEarnResults = () => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [buttonClicked, setButtonClicked] = useState(false);

  const { remainingSolveToEarn, telegramId, setRemainingSolveToEarn } = useUserContext();
  const router = useRouter();

  useTelegramBackButton();

  const [totalCorrect, setTotalCorrect] = useState("0");
  const [totalCorrectAnswers, setTotalCorrectAnswers] = useState<string | number>(0);

  useEffect(() => {
    setTotalCorrect(sessionStorage.getItem("TotalCorrectSolveToEarn") || "0");
    setTotalCorrectAnswers(sessionStorage.getItem("correctAnswers") || 0);
  }, []);

  useEffect(() => {
    router.prefetch("/earn/solvetoearn");
    router.prefetch("/earn");
  }, [router])

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
      router.push("/earn/solvetoearn");
    } else {
      router.push("/earn")
    }
  }
  return (
    <div className="fixed inset-0 z-100 bg-black text-white p-6 flex flex-col overflow-y-auto h-dvh">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent_50%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto relative z-10 pt-24">
        
        {/* Animation Container */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
          <div className="relative w-24 h-24 flex items-center justify-center">
            <Lottie 
              lottieRef={lottieRef}
              animationData={rocketAnimationData} 
              loop={true}
              autoplay={true}
              style={{width: "100%", height: "100%"}}
            />
          </div>
        </div>

        <div className="text-center mb-16 space-y-3">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-gray-400">
            Session complete!
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            You&apos;ve been solving non-stop! Keep going!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-6 w-full mb-16">
          <Card className="bg-[#1a1a1a]/60 backdrop-blur-xl border-[#333] shadow-lg overflow-hidden relative group">
            <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-6 flex flex-col items-center text-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-[#252525] flex items-center justify-center text-yellow-400 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 32 32">
                  <path fill="currentColor" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Total Earned</div>
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-white">
                  +{totalCorrect} 
                  <span className="text-sm font-normal text-gray-400">QNTM</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a]/60 backdrop-blur-xl border-[#333] shadow-lg overflow-hidden relative group">
            <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-6 flex flex-col items-center text-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-[#252525] flex items-center justify-center text-blue-400 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 48 48">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="m4 24l5-5l10 10L39 9l5 5l-25 25z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Correct Answers</div>
                <div className="text-xl font-bold text-white">{totalCorrectAnswers}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Button */}
        {remainingSolveToEarn > 0 && (
          <Button 
            disabled={buttonClicked} 
            onClick={() => checkRemainingSolveToEarn()} 
            className="w-full h-14 rounded-xl bg-white text-black hover:bg-gray-200 hover:scale-[1.02] active:scale-95 transition-all duration-300 font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            <span className="flex items-center gap-2">
              Solve Again
              <Badge variant="secondary" className="bg-black/10 text-black hover:bg-black/20 border-0 px-2 py-0.5 h-6">
                {remainingSolveToEarn} left
              </Badge>
            </span>
          </Button>
        )}
      </div>
    </div>
  )
}

export default SolveToEarnResults;