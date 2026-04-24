import dynamic from "next/dynamic";
import type { LottieRefCurrentProps } from "lottie-react";
import { Skeleton } from "@/components/ui/skeleton";
import trophyAnimationData from "@/public/lottie/trophy-lottie.json";
import { useRef } from "react";

const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
  loading: () => <Skeleton className="w-[2.2em] h-[2.2em] rounded bg-white/10" />,
});

export default function LeaderboardHeader() {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  return (
    <div className="items-center px-4 py-6 flex justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-14 h-14 flex items-center justify-center">
          <Lottie
            lottieRef={lottieRef}
            animationData={trophyAnimationData}
            loop={1}
            autoplay={true}
            style={{ width: "2.2em", height: "2.2em" }}
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Leaderboard</h1>
          <p className="text-sm text-gray-400">Top users ranking</p>
        </div>
      </div>
    </div>
  )
}
