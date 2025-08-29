import Lottie, { LottieRefCurrentProps } from "lottie-react";
import trophyAnimationData from "@/public/lottie/trophy-lottie.json";
import { useRef } from "react";

export default function LeaderboardHeader() {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  
    return (
        <div className="items-start p-4 flex justify-between">
            <div className="flex items-center justify-center space-x-1">
              <div>
                <Lottie
                  lottieRef={lottieRef}
                  animationData={trophyAnimationData}
                  loop={1}
                  autoplay={true}
                  style={{ width: "2em", height: "2em" }}
                />
              </div>
              <div>
                <div className="text-3xl font-bold">Leaderboard</div>
              </div>
            </div>
          </div>
    )
}