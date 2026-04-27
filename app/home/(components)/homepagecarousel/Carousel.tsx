"use client";

import {
  Carousel,
  CarouselItem,
  CarouselContent,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import Link from "next/link";
import tasks from "@/app/earn/tasks";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
  loading: () => <div className="w-6 h-6 bg-white/10 rounded-full animate-pulse" />
});

const useLottieData = () => {
  const [data, setData] = useState<{
    story: object | null;
    goldMedal: object | null;
    diamond: object | null;
  }>({ story: null, goldMedal: null, diamond: null });

  useEffect(() => {
    const loadAnimations = async () => {
      const [story, goldMedal, diamond] = await Promise.all([
        import("@/public/lottie/story-lottie.json").then((m) => m.default),
        import("@/public/lottie/gold-medal-lottie.json").then((m) => m.default),
        import("@/public/lottie/diamond-lottie.json").then((m) => m.default),
      ]);
      setData({ story, goldMedal, diamond });
    };
    loadAnimations();
  }, []);

  return data;
};

const cardClasses = "w-[90%] mx-auto h-28 bg-secondary border-0 relative overflow-hidden shadow-lg transition-transform active:scale-[0.98]";
const cardBodyClasses = "relative z-10 flex h-full flex-row items-center gap-3.5 px-5 py-4";
const iconWrapClasses = "flex h-11 w-11 shrink-0 items-center justify-center [&_.lf-player-container]:!w-11 [&_.lf-player-container]:!h-11";
const cardTitleClasses = "text-base font-bold text-neutral-400 leading-tight";
const cardDescriptionClasses = "text-white text-sm leading-snug";

const HomeCarousel = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const lottieData = useLottieData();

  useEffect(() => {
    if (!api) return;

    requestAnimationFrame(() => {
      setCount(api.scrollSnapList().length);
      setCurrent(api.selectedScrollSnap());
    });

    const handleSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", handleSelect);
    return () => {
      api.off("select", handleSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;

    const timer = setInterval(() => {
      api.scrollNext();
    }, 7000);

    return () => clearInterval(timer);
  }, [api]);

  const task = tasks.find(
    (task) => task.id === "ba1e3046074448f8acb2bfe9797436db"
  );

  const openTelegramGroup = () => {
    let newLink = task?.url;
    if (
      !task?.url?.startsWith("http://") &&
      !task?.url?.startsWith("https://")
    ) {
      newLink = "https://" + task?.url;
    }
    if (typeof window !== "undefined") {
      const tg = window?.Telegram?.WebApp;
      if (!tg || !newLink) return;
      tg.openTelegramLink(newLink);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto">
      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
      <Carousel setApi={setApi} className="w-full" opts={{ loop: true }}>
        <CarouselContent>
          <CarouselItem>
            <Card className={`${cardClasses} opacity-75`}>
              <CardHeader className={cardBodyClasses}>
                <div className={iconWrapClasses}>
                  {lottieData.diamond && (
                    <Lottie animationData={lottieData.diamond} autoplay loop />
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <CardTitle className={cardTitleClasses}>
                    AI Powered Trading
                  </CardTitle>
                  <CardDescription className={cardDescriptionClasses}>
                    Experience the future of trading with our AI-driven platform.
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </CarouselItem>

          <CarouselItem>
            <Link href="/story" className="block">
              <Card className={`${cardClasses} cursor-pointer`}>
                <CardHeader className={cardBodyClasses}>
                  <div className={iconWrapClasses}>
                    {lottieData.story && (
                      <Lottie animationData={lottieData.story} loop autoplay />
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <CardTitle className={cardTitleClasses}>
                      The Quantum Era
                    </CardTitle>
                    <CardDescription className={cardDescriptionClasses}>
                      Explore your TG story with us. Watch it unfold.
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </CarouselItem>

          <CarouselItem>
            <Link href="/leaderboard" className="block">
              <Card className={`${cardClasses} cursor-pointer`}>
                <CardHeader className={cardBodyClasses}>
                  <div className={iconWrapClasses}>
                    {lottieData.goldMedal && (
                      <Lottie animationData={lottieData.goldMedal} loop autoplay />
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <CardTitle className={cardTitleClasses}>
                      The Race is on
                    </CardTitle>
                    <CardDescription className={cardDescriptionClasses}>
                      Check your standings on the global leaderboard.
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </CarouselItem>

          <CarouselItem>
            <button type="button" onClick={openTelegramGroup} className="block w-full text-left">
              <Card className={`${cardClasses} cursor-pointer`}>
                <CardHeader className={cardBodyClasses}>
                  <div className={iconWrapClasses}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      className="text-white"
                    >
                      <path
                        fill="currentColor"
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19c-.14.75-.42 1-.68 1.03c-.58.05-1.02-.38-1.58-.75c-.88-.58-1.38-.94-2.23-1.5c-.99-.65-.35-1.01.22-1.59c.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02c-.09.02-1.49.95-4.22 2.79c-.4.27-.76.41-1.08.4c-.36-.01-1.04-.2-1.55-.37c-.63-.2-1.12-.31-1.08-.66c.02-.18.27-.36.74-.55c2.92-1.27 4.86-2.11 5.83-2.51c2.78-1.16 3.35-1.36 3.73-1.36c.08 0 .27.02.39.12c.1.08.13.19.14.27c-.01.06.01.24 0 .38"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <CardTitle className={cardTitleClasses}>
                      The Club of OGs
                    </CardTitle>
                    <CardDescription className={cardDescriptionClasses}>
                      Stay updated with the latest news. Never miss a beat.
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </button>
          </CarouselItem>

          <CarouselItem>
            <Link href="/home/roadmap" className="block">
              <Card className={`${cardClasses} cursor-pointer`}>
                <CardHeader className={cardBodyClasses}>
                  <div className={iconWrapClasses}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" className="text-white" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path d="m3 17l6-6l4 4l8-8" />
                        <path d="M17 7h4v4" />
                      </g>
                    </svg>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <CardTitle className={cardTitleClasses}>
                      The Progress
                    </CardTitle>
                    <CardDescription className={cardDescriptionClasses}>
                      Building the future. See our roadmap.
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      <div className="flex justify-center gap-1.5">
        {Array.from({ length: count }).map((_, index) => (
          <Button
            key={index}
            variant="ghost"
            onClick={() => api?.scrollTo(index)}
            className={`h-1.5 p-0 rounded-full transition-all duration-300 overflow-hidden relative cursor-pointer hover:bg-transparent ${index === current ? "w-8 bg-secondary" : "w-1.5 bg-secondary hover:bg-secondary/80"
              }`}
            aria-label={`Go to slide ${index + 1}`}
          >
            {index === current && (
              <div
                className="absolute top-0 left-0 h-full bg-white"
                style={{ animation: "progress 7s linear forwards" }}
              />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default HomeCarousel;
