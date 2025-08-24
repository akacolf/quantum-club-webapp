import Lottie from "lottie-react";
import hundredAnimationData from "@/public/lottie/hundred-lottie.json";
import { bgSolveToEarnCard } from "@/public";
import { SolveToEarnCardProps } from "@/lib/interfaces";
import Image from "next/image";

export default function SolveToEarnCard({ remainingSolveToEarn, lottieRef, goToSolveToEarn }: SolveToEarnCardProps) {
    return (
        <div className="w-9/10 mx-auto mt-4">
            <div className="font-semibold text-lg mb-3">Solve-to-Earn</div>
            <div className="relative flex items-center justify-between rounded-2xl p-4 overflow-hidden">
              <Image src={bgSolveToEarnCard} 
              alt="S2E Card Background"
              fill
              className="object-cover rounded-2xl z-0"
              />
              <div className="flex items-center space-x-3 z-10">
                <div className="flex items-center justify-center">
                  <Lottie
                    lottieRef={lottieRef}
                    animationData={hundredAnimationData}
                    loop={true}
                    autoplay={true}
                    style={{ width: "2.5em", height: "2.5em" }}
                  />
                </div>
                <div>
                  <div className="font-medium text-sm">Solve-to-Earn</div>
                  <div className="font-normal text-xs text-gray-500 mt-1">
                    {remainingSolveToEarn} passes
                  </div>
                </div>
              </div>
              <div className="z-10">
                <button
                  id="solvetoearnbutton"
                  onClick={() => goToSolveToEarn()}
                  disabled={remainingSolveToEarn === 0}
                  className={
                    remainingSolveToEarn > 0
                      ? "font-medium w-16 h-9 text-sm bg-white text-black btn-circle btn" // active when > 0
                      : "font-medium w-16 h-9 text-xs btn-circle btn" //disabled when 0
                  }
                >
                  Solve
                </button>
              </div>
            </div>
          </div>
    )
}