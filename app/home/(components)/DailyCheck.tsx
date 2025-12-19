import Lottie from "lottie-react";
import fireAnimationData from "@/public/lottie/fire-lottie.json";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { DailyCheckInProps } from "@/lib/interfaces";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DailyCheckIn({
  loadingButtonDay,
  daily,
  isClaimDay,
  loadingDay,
  ClaimDaily,
  lottieRef,
  TaskTimer,
}: DailyCheckInProps) {
  return loadingButtonDay ? (
    <Skeleton className="w-[90%] mx-auto h-16 sm:h-20 rounded-xl bg-[#1a1a1a] mt-6" />
  ) : (
    <Card className="w-[90%] mx-auto mt-6 relative overflow-hidden border-[#333] bg-[#111] shadow-lg">
      {/* Background Glow Effect */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

      <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12">
              <Lottie
                lottieRef={lottieRef}
                animationData={fireAnimationData}
                loop={true}
                autoplay={true}
              />
            </div>
          </div>

          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="text-sm sm:text-base font-bold text-white truncate">
              {daily} Day Streak
            </div>
            <div className="text-[10px] sm:text-xs font-medium text-gray-400 flex flex-wrap items-center gap-1">
              <span className="whitespace-nowrap">Next reward:</span>
              <span className="text-orange-400 font-mono whitespace-nowrap">
                <TaskTimer />
              </span>
            </div>
          </div>
        </div>

        <Button
          id="dailyClaimButton"
          onClick={() => ClaimDaily()}
          disabled={isClaimDay || loadingDay}
          className={`
            h-9 px-4 rounded-xl font-bold transition-all duration-300 shrink-0 text-xs
            ${isClaimDay
              ? "bg-white/5 text-gray-500 border border-white/5 hover:bg-white/5 cursor-default"
              : "bg-white hover:bg-white/90 text-black shadow-lg border-0"
            }
          `}
        >
          {loadingDay ? (
            <ButtonLoader />
          ) : isClaimDay ? (
            <div className="flex items-center gap-1.5">
              <span>Done</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                className="text-green-500"
              >
                <path
                  fill="currentColor"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                />
              </svg>
            </div>
          ) : (
            "Claim"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}