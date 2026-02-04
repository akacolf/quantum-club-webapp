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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import Link from "next/link";
import tasks from "@/app/earn/tasks";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  carouselBg,
  carouselBgJoinTG,
  bgTgeProgressCard,
} from "@/public";

// Dynamic import Lottie for better performance (don't load until needed)
const Lottie = dynamic(() => import("lottie-react"), { 
  ssr: false,
  loading: () => <div className="w-6 h-6 bg-white/10 rounded-full animate-pulse" />
});

// Lazy load Lottie JSON data - these files are large and delay initial render
const useLottieData = () => {
  const [data, setData] = useState<{
    story: object | null;
    goldMedal: object | null;
    diamond: object | null;
  }>({ story: null, goldMedal: null, diamond: null });

  useEffect(() => {
    // Load animations after initial render
    const loadAnimations = async () => {
      const [story, goldMedal, diamond] = await Promise.all([
        import("@/public/lottie/story-lottie.json").then(m => m.default),
        import("@/public/lottie/gold-medal-lottie.json").then(m => m.default),
        import("@/public/lottie/diamond-lottie.json").then(m => m.default),
      ]);
      setData({ story, goldMedal, diamond });
    };
    loadAnimations();
  }, []);

  return data;
};

const HomeCarousel = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const lottieData = useLottieData();

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Auto-play timer
  useEffect(() => {
    if (!api) {
      return;
    }

    const timer = setInterval(() => {
      api.scrollNext();
    }, 7000);

    return () => clearInterval(timer);
  }, [api, current]); // Reset timer when current slide changes

  const task = tasks.find(
    (task) => task.id === "ba1e3046074448f8acb2bfe9797436db"
  );

  const handleJoinTask = () => {
    openTelegramGroup();
  };
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
      if (!tg) return;
      tg.openTelegramLink(newLink);
    }
  };

  // Common styles for consistency
  const cardClasses = "w-[90%] mx-auto h-44 bg-[#111] border-[#333] relative overflow-hidden flex flex-col justify-between shadow-lg";
  const buttonClasses = "bg-white text-black hover:bg-gray-200 font-semibold h-8 px-6 rounded-lg text-xs transition-transform active:scale-95";

  return (
    <div className="flex flex-col gap-4 mt-6 w-full max-w-md mx-auto">
      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
      <Carousel setApi={setApi} className="w-full" opts={{ loop: true }}>
        <CarouselContent>
          {/* Card 1: AI Trading */}
          <CarouselItem>
            <Card className={cardClasses}>
              {/* Abstract Background for non-image cards */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

              <CardHeader className="pb-2 relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg font-bold text-white">
                    AI-Powered Trading
                  </CardTitle>
                  <div className="w-6 h-6">
                    {lottieData.diamond && (
                      <Lottie
                        animationData={lottieData.diamond}
                        autoplay={true}
                        loop={true}
                      />
                    )}
                  </div>
                </div>
                <CardDescription className="text-gray-400 text-xs leading-relaxed">
                  Experience the future of trading with our AI-driven platform.
                </CardDescription>
              </CardHeader>
              <CardFooter className="relative z-10">
                <Button className={`${buttonClasses} opacity-50 cursor-not-allowed`} size={"sm"} disabled>
                  Coming Soon
                </Button>
              </CardFooter>
            </Card>
          </CarouselItem>

          {/* Card 2: Story */}
          <CarouselItem>
            <Card className={cardClasses}>
              <Image
                src={carouselBg.src}
                alt="Story Card"
                fill
                className="object-cover z-0 opacity-60"
                priority
              />
              <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/60 to-transparent z-0" />

              <div className="relative z-10 flex flex-col h-full justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg font-bold text-white">
                      The Quantum Era
                    </CardTitle>
                    <div className="w-6 h-6">
                      {lottieData.story && (
                        <Lottie
                          animationData={lottieData.story}
                          loop={true}
                          autoplay={true}
                        />
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-gray-300 text-xs leading-relaxed max-w-[80%]">
                    Explore your TG story with us. Watch it unfold.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Link href={"/story"} className="w-fit">
                    <Button className={buttonClasses} size={"sm"}>
                      Explore
                    </Button>
                  </Link>
                </CardFooter>
              </div>
            </Card>
          </CarouselItem>

          {/* Card 3: Leaderboard */}
          <CarouselItem>
            <Card className={cardClasses}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              <CardHeader className="pb-2 relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg font-bold text-white">
                    The Race is On
                  </CardTitle>
                  <div className="w-6 h-6">
                    {lottieData.goldMedal && (
                      <Lottie
                        animationData={lottieData.goldMedal}
                        loop={true}
                        autoplay={true}
                      />
                    )}
                  </div>
                </div>
                <CardDescription className="text-gray-400 text-xs leading-relaxed">
                  Check your standings on the global leaderboard.
                </CardDescription>
              </CardHeader>
              <CardFooter className="relative z-10">
                <Link href={"/leaderboard"} className="w-fit">
                  <Button className={buttonClasses} size={"sm"}>
                    Check Rank
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </CarouselItem>

          {/* Card 4: Join TG */}
          <CarouselItem>
            <Card className={cardClasses}>
              <Image
                src={carouselBgJoinTG.src}
                alt="Join TG Card"
                fill
                className="object-cover z-0 opacity-60"
              />
              <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/60 to-transparent z-0" />

              <div className="relative z-10 flex flex-col h-full justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg font-bold text-white">
                      The Club of OGs
                    </CardTitle>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="1.2em"
                      height="1.2em"
                      viewBox="0 0 24 24"
                      className="text-blue-400"
                    >
                      <path
                        fill="currentColor"
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19c-.14.75-.42 1-.68 1.03c-.58.05-1.02-.38-1.58-.75c-.88-.58-1.38-.94-2.23-1.5c-.99-.65-.35-1.01.22-1.59c.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02c-.09.02-1.49.95-4.22 2.79c-.4.27-.76.41-1.08.4c-.36-.01-1.04-.2-1.55-.37c-.63-.2-1.12-.31-1.08-.66c.02-.18.27-.36.74-.55c2.92-1.27 4.86-2.11 5.83-2.51c2.78-1.16 3.35-1.36 3.73-1.36c.08 0 .27.02.39.12c.1.08.13.19.14.27c-.01.06.01.24 0 .38"
                      />
                    </svg>
                  </div>
                  <CardDescription className="text-gray-300 text-xs leading-relaxed max-w-[80%]">
                    Stay updated with the latest news. Never miss a beat.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button className={buttonClasses} size={"sm"} id="joinbutton" onClick={() => handleJoinTask()}>
                    Join Channel
                  </Button>
                </CardFooter>
              </div>
            </Card>
          </CarouselItem>

          {/* Card 5: Roadmap */}
          <CarouselItem>
            <Card className={cardClasses}>
              <Image
                src={bgTgeProgressCard.src}
                alt="Roadmap Card"
                fill
                className="object-cover z-0 opacity-50"
              />
              <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/60 to-transparent z-0" />

              <div className="relative z-10 flex flex-col h-full justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg font-bold text-white">
                      The Progress
                    </CardTitle>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" className="text-green-400" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path d="m3 17l6-6l4 4l8-8" />
                        <path d="M17 7h4v4" />
                      </g>
                    </svg>
                  </div>
                  <CardDescription className="text-gray-300 text-xs leading-relaxed max-w-[80%]">
                    Building the future. See our roadmap.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Link href={"/home/roadmap"} className="w-fit">
                    <Button className={buttonClasses} size={"sm"}>
                      View Roadmap
                    </Button>
                  </Link>
                </CardFooter>
              </div>
            </Card>
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      <div className="flex justify-center gap-1.5">
        {Array.from({ length: count }).map((_, index) => (
          <Button
            key={index}
            variant="ghost"
            onClick={() => api?.scrollTo(index)}
            className={`h-1.5 p-0 rounded-full transition-all duration-300 overflow-hidden relative cursor-pointer hover:bg-transparent ${index === current ? "w-8 bg-[#333]" : "w-1.5 bg-[#333] hover:bg-[#444]"
              }`}
            aria-label={`Go to slide ${index + 1}`}
          >
            {index === current && (
              <div
                className="absolute top-0 left-0 h-full bg-white"
                style={{
                  animation: 'progress 7s linear forwards'
                }}
              />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default HomeCarousel;
