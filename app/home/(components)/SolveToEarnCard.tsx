import dynamic from "next/dynamic";
import hundredAnimationData from "@/public/lottie/hundred-lottie.json";
import { bgSolveToEarnCard } from "@/public";
import { SolveToEarnCardProps } from "@/lib/interfaces";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Dynamic import Lottie for better performance
const Lottie = dynamic(() => import("lottie-react"), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-yellow-500/20 rounded-full animate-pulse" />
});

export default function SolveToEarnCard({ remainingSolveToEarn, goToSolveToEarn }: SolveToEarnCardProps) {
  return (
    <Card className="w-[90%] mx-auto mt-6 relative overflow-hidden border-0 bg-[#111] shadow-lg group">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src={bgSolveToEarnCard}
          alt="S2E Card Background"
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <CardContent className="relative z-10 flex items-center justify-between p-3 sm:p-4 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
              <Lottie
                animationData={hundredAnimationData}
                loop={true}
                autoplay={true}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm sm:text-base font-bold text-white truncate leading-tight">Solve & Earn</span>
            <span className="text-[10px] sm:text-xs font-medium text-gray-300">
              {remainingSolveToEarn} passes available
            </span>
          </div>
        </div>

        <Button
          id="solvetoearnbutton"
          onClick={() => goToSolveToEarn()}
          disabled={remainingSolveToEarn === 0}
          className={`
                h-9 px-4 rounded-xl font-bold transition-all duration-300 shrink-0 text-xs shadow-xl
                ${remainingSolveToEarn > 0
              ? "bg-white text-black hover:bg-white/90 active:scale-95"
              : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
            }
              `}
        >
          Solve
        </Button>
      </CardContent>
    </Card>
  )
}