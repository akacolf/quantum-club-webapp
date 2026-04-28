import { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import fireAnimationData from "@/public/lottie/fire-lottie.json";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { DailyCheckInProps } from "@/lib/interfaces";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Dynamic import Lottie for better performance
const Lottie = dynamic(() => import("lottie-react"), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-orange-500/20 rounded-full animate-pulse" />
});

export default function DailyCheckIn({
  loadingButtonDay,
  daily,
  isClaimDay,
  loadingDay,
  ClaimDaily,
  TaskTimer,
}: DailyCheckInProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);
  const prevDaily = useRef<number>(daily);

  // Animate the streak number when it changes (claim success)
  useEffect(() => {
    if (daily === prevDaily.current) return;
    prevDaily.current = daily;

    const streakEl = streakRef.current;
    const cardEl = cardRef.current;
    if (!streakEl || !cardEl) return;

    import("@/lib/gsap")
      .then((m) => m.loadGsap())
      .then(({ gsap }) => {
        // Streak number: scale bounce + color flash
        gsap.fromTo(
          streakEl,
          { scale: 1.4, color: "#22c55e" },
          { scale: 1, color: "#ffffff", duration: 0.6, ease: "elastic.out(1, 0.4)" },
        );

        // Card: subtle glow pulse
        gsap.fromTo(
          cardEl,
          { boxShadow: "0 0 20px rgba(34,197,94,0.3)" },
          { boxShadow: "0 0 0px rgba(34,197,94,0)", duration: 1, ease: "power2.out" },
        );
      });
  }, [daily]);

  return loadingButtonDay ? (
    <Skeleton className="w-[90%] mx-auto h-16 sm:h-20 rounded-xl bg-[#1a1a1a]" />
  ) : (
    <Card ref={cardRef} className="w-[90%] mx-auto relative overflow-hidden border border-[#333] bg-[#111] shadow-sm">

      <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12">
              <Lottie
                animationData={fireAnimationData}
                loop={true}
                autoplay={true}
              />
            </div>
          </div>

          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="text-sm sm:text-base font-bold text-white truncate">
              <span ref={streakRef} className="inline-block">{daily}</span> day streak
            </div>
            <div className="text-[10px] sm:text-xs font-medium text-neutral-400 flex flex-wrap items-center gap-1">
              <span className="whitespace-nowrap">Next reward:</span>
              <span className="text-white font-mono whitespace-nowrap">
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
              ? "bg-white/5 text-neutral-500 border border-white/5 hover:bg-white/5 cursor-default"
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
