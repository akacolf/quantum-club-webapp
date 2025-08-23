import Lottie from "lottie-react";
import hundredAnimationData from "@/public/lottie/hundred-lottie.json";
import { bgSolveToEarnCard } from "@/public";
import { SolveToEarnCardProps } from "@/lib/interfaces";

export default function SolveToEarnCard({ remainingSolveToEarn, lottieRef, goToSolveToEarn }: SolveToEarnCardProps) {
    return (
        <div className="w-9/10 mx-auto mt-4">
            <div className="font-semibold text-lg mb-3">Solve-to-Earn</div>
            <div
              className="flex items-center justify-between bg-cover bg-center rounded-2xl p-4"
              style={{ backgroundImage: `url(${bgSolveToEarnCard.src})` }}
            >
              <div className="flex items-center space-x-3">
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
              <div>
                <button
                  id="solvetoearnbutton"
                  onClick={() => goToSolveToEarn()}
                  disabled={remainingSolveToEarn == 0}
                  className={
                    remainingSolveToEarn > 0
                      ? "font-medium w-16 h-9 text-sm bg-white text-black rounded-full cursor-pointer"
                      : "font-medium w-16 h-9 opacity-30 text-xs bg-white text-black rounded-full cursor-pointer"
                  }
                >
                  Solve
                </button>
              </div>
            </div>
          </div>
    )
}