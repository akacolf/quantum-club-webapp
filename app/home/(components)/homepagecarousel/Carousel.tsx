"use client";

import {
  Carousel,
  CarouselItem,
  CarouselContent,
} from "@/components/ui/carousel";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import Link from "next/link";
import tasks from "@/app/earn/tasks";
import Image from "next/image";
import {
  carouselBg,
  carouselBgJoinTG,
  bgTgeProgressCard,
  bgTradingCardImg,
} from "@/public";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import storyAnimationData from "@/public/lottie/story-lottie.json";
import goldmedalAnimationData from "@/public/lottie/gold-medal-lottie.json";
import diamondAnimationData from "@/public/lottie/diamond-lottie.json";

const HomeCarousel = () => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

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
  return (
    <Carousel className="mt-5">
      <CarouselContent>
        <CarouselItem>
          <Card className="w-9/10 mx-auto h-43">
        
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  AI-Powered Trading
                </CardTitle>
                <Lottie
                  lottieRef={lottieRef}
                  animationData={diamondAnimationData}
                  autoplay={true}
                  loop={true}
                  style={{ width: "1.2em", height: "1.2em" }}
                />
              </div>
              <CardDescription>
                Experience the future of trading with our AI-driven platform.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant={"default"} size={"sm"} disabled>Trade</Button>
            </CardFooter>
          </Card>
          
        </CarouselItem>
       
        <CarouselItem>
          <Card className="w-9/10 mx-auto relative overflow-hidden h-43">
            <Image
              src={carouselBg.src}
              alt="Story Card"
              fill
              className="object-cover z-0"
            />
            <div className="relative z-10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-md">
                    The Quantum Era in TG
                  </CardTitle>
                  <Lottie
                  lottieRef={lottieRef}
                  animationData={storyAnimationData}
                  loop={true}
                  autoplay={true}
                  style={{ width: "1.2em", height: "1.2em" }}
                />
                </div>
                <CardDescription>
                  Explore your TG story with us. Watch it unfold.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant={"default"} size={"sm"}>
                  <Link href={"/story"}>Explore</Link>
                </Button>
              </CardFooter>
            </div>
          </Card>
        </CarouselItem>

        <CarouselItem>
          <Card className="w-9/10 mx-auto h-43">
            
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">
                    The Race is On
                  </CardTitle>
                  <Lottie
                  lottieRef={lottieRef}
                  animationData={goldmedalAnimationData}
                  loop={true}
                  autoplay={true}
                  style={{ width: "1.2em", height: "1.2em" }}
                />
                </div>
                <CardDescription>
                  Your standings. Right here.
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-4">
                <Button variant={"default"} size={"sm"}>
                  <Link href={"/leaderboard"}>Check</Link>
                </Button>
              </CardFooter>
        
          </Card>
        </CarouselItem>
    
        <CarouselItem>
          <Card className="w-9/10 mx-auto relative overflow-hidden h-43">
            <Image
              src={carouselBgJoinTG.src}
              alt="Story Card"
              fill
              className="object-cover z-0"
            />
            <div className="relative z-10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-md">
                    The Club of OGs
                  </CardTitle>
                  <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.2em"
                  height="1.2em"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19c-.14.75-.42 1-.68 1.03c-.58.05-1.02-.38-1.58-.75c-.88-.58-1.38-.94-2.23-1.5c-.99-.65-.35-1.01.22-1.59c.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02c-.09.02-1.49.95-4.22 2.79c-.4.27-.76.41-1.08.4c-.36-.01-1.04-.2-1.55-.37c-.63-.2-1.12-.31-1.08-.66c.02-.18.27-.36.74-.55c2.92-1.27 4.86-2.11 5.83-2.51c2.78-1.16 3.35-1.36 3.73-1.36c.08 0 .27.02.39.12c.1.08.13.19.14.27c-.01.06.01.24 0 .38"
                  />
                </svg>
                </div>
                <CardDescription>
                  Stay updated. Never miss a beat.
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-4">
                <Button variant={"default"} size={"sm"} id="joinbutton" onClick={() => handleJoinTask()}>
                  Join
                </Button>
              </CardFooter>
            </div>
          </Card>
        </CarouselItem>
        

     
        <CarouselItem>
          <Card className="w-9/10 mx-auto relative overflow-hidden h-43">
            <Image
              src={bgTgeProgressCard.src}
              alt="Story Card"
              fill
              className="object-cover z-0"
            />
            <div className="relative z-10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-md">
                    The Progress
                  </CardTitle>
                  <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.2em"
                  height="1.2em"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19c-.14.75-.42 1-.68 1.03c-.58.05-1.02-.38-1.58-.75c-.88-.58-1.38-.94-2.23-1.5c-.99-.65-.35-1.01.22-1.59c.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02c-.09.02-1.49.95-4.22 2.79c-.4.27-.76.41-1.08.4c-.36-.01-1.04-.2-1.55-.37c-.63-.2-1.12-.31-1.08-.66c.02-.18.27-.36.74-.55c2.92-1.27 4.86-2.11 5.83-2.51c2.78-1.16 3.35-1.36 3.73-1.36c.08 0 .27.02.39.12c.1.08.13.19.14.27c-.01.06.01.24 0 .38"
                  />
                </svg>
                </div>
                <CardDescription>
                  Building, building, building.
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-4">
                <Button variant={"default"} size={"sm"}>
                  <Link href={"/home/roadmap"}>Roadmap</Link>
                </Button>
              </CardFooter>
            </div>
          </Card>
        </CarouselItem>
      </CarouselContent>
    </Carousel>
  );
};

export default HomeCarousel;
