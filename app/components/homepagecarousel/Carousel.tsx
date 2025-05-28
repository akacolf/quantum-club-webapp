"use client";

import React, { useEffect, useState, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Link from "next/link";
import tasks from "@/app/earn/tasks";
import { DotButton, useDotButton } from "./CarouselDotButton";
import {
  carouselBgStory,
  carouselBg,
  carouselBgJoinTG,
  bgTgeProgressCard,
} from "@/app/images";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import storyAnimationData from "../../images/story-lottie.json";

const HomeCarousel: React.FC = () => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ stopOnInteraction: false, delay: 5000 }),
  ]);
  const [loadingImage, setLoadingImage] = useState(0);
  const { selectedIndex, scrollSnaps, onDotButtonClick } =
    useDotButton(emblaApi);

  const task = tasks.find(
    (task) => task.id === "ba1e3046074448f8acb2bfe9797436db"
  );
  useEffect(() => {
    if (loadingImage >= 2) return;
    const carouselBgJoinTGimg = new Image();
    const carouselBgStoryimg = new Image();
    const tgeProgressCardimg = new Image();
    const carouselBgimg = new Image();

    tgeProgressCardimg.src = bgTgeProgressCard.src;
    carouselBgJoinTGimg.src = carouselBgJoinTG.src;
    carouselBgStoryimg.src = carouselBgStory.src;
    carouselBgimg.src = carouselBg.src;
    const handleLoad = () => {
      setLoadingImage((prev) => {
        if (prev >= 2) return 2; // limit aşılmasın
        return prev + 1;
      });
    };
    tgeProgressCardimg.onload = handleLoad;
    carouselBgStoryimg.onload = handleLoad;
    carouselBgimg.onload = handleLoad;
    carouselBgJoinTGimg.onload = handleLoad;
  }, []);
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
    /*parent container should include overflow-hidden class*/
    <div className="overflow-hidden mt-5" ref={emblaRef}>
      {/* this element is the container */}
      {loadingImage === 2 ? (
        <div className="flex">
          {/* TG story card (card #1)*/}
          <div className="min-w-0 flex-none w-full">
            <div
              className="card flex justify-between bg-cover bg-center rounded-xl max-w-xs h-40 w-full mx-auto"
              style={{ backgroundImage: `url(${carouselBg.src})` }} //items-center //
            >
              <div className="card-body flex flex-row items-center justify-between p-4">
                {/*text and button*/}
                <div>
                  <h2 className="text-lg font-semibold leading-tight">
                    The Quantum Era of <br />
                    Telegram
                  </h2>
                  <p className="text-sm font-normal mt-2">
                    Your TG story is here.
                  </p>
                  <div className="mt-6">
                    <Link
                      className="font-normal text-sm rounded-full bg-white text-black py-1 px-3 cursor-pointer"
                      href={"/story"}
                    >
                      Explore
                    </Link>
                  </div>
                </div>
                {/*icon*/}
                <Lottie
                  lottieRef={lottieRef}
                  animationData={storyAnimationData}
                  loop={true}
                  autoplay={true}
                  style={{ width: "4em", height: "4em" }}
                />
              </div>
            </div>
          </div>
          {/* card #2*/}
          <div className="min-w-0 flex-none w-full">
            <div
              className="card flex justify-between bg-cover bg-center rounded-xl max-w-xs h-40 w-full mx-auto"
              style={{ backgroundImage: `url(${carouselBgJoinTG.src})` }}
            >
              <div className="card-body flex flex-row items-center justify-between p-4">
                <div>
                  <h2 className="font-semibold text-lg">The Club of OGs</h2>
                  <p className="text-sm font-normal mt-2">
                    Stay updated with our Telegram channel.
                  </p>
                  <button
                    id="joinbutton"
                    onClick={() => handleJoinTask()}
                    className="font-normal text-sm rounded-full bg-white text-black py-1 px-4 mt-4 cursor-pointer"
                  >
                    Join
                  </button>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="5em"
                  height="5em"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19c-.14.75-.42 1-.68 1.03c-.58.05-1.02-.38-1.58-.75c-.88-.58-1.38-.94-2.23-1.5c-.99-.65-.35-1.01.22-1.59c.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02c-.09.02-1.49.95-4.22 2.79c-.4.27-.76.41-1.08.4c-.36-.01-1.04-.2-1.55-.37c-.63-.2-1.12-.31-1.08-.66c.02-.18.27-.36.74-.55c2.92-1.27 4.86-2.11 5.83-2.51c2.78-1.16 3.35-1.36 3.73-1.36c.08 0 .27.02.39.12c.1.08.13.19.14.27c-.01.06.01.24 0 .38"
                  />
                </svg>
              </div>
            </div>
          </div>
          {/*card 3*/}
          <div className="min-w-0 flex-none w-full">
            <div className="w-full max-w-xs mx-auto">
              <div
                className="flex items-center justify-between p-4 bg-cover bg-center rounded-2xl h-40"
                style={{ backgroundImage: `url(${bgTgeProgressCard.src})` }}
              >
                <div className="flex flex-col">
                  <div className="font-medium text-xl">TGE Progress</div>
                  <div className="font-medium text-base mt-1 bg-gradient-to-r from-slate-400 to-red-300 bg-clip-text text-transparent">
                    Currently in Building Phase.
                  </div>
                  <div className="mt-3">
                  <Link
                    id="roadmapbutton"
                    href={"/home/roadmap"}
                    className="mt-2 font-normal text-sm rounded-full bg-white text-black py-1 px-3 cursor-pointer"
                  >
                    Roadmap
                  </Link>
                </div>
                </div>
                <div className="relative size-40 flex items-center justify-center">
                  <svg
                    className="size-full -rotate-90"
                    viewBox="0 0 36 36"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx={18}
                      cy={18}
                      r={13}
                      fill="none"
                      className="stroke-current text-neutral-700"
                      strokeWidth={2}
                    ></circle>
                    {/*progress circle*/}
                    <circle
                      cx={18}
                      cy={18}
                      r={13}
                      fill="none"
                      className="stroke-current text-white"
                      strokeWidth={2}
                      strokeDasharray={100}
                      strokeDashoffset={95}
                      strokeLinecap="round"
                    ></circle>
                  </svg>
                  <div className="absolute top-1/2 start-1/2 transform -translate-y-1/2 -translate-x-1/2">
                    <div className="text-center font-semibold text-2xl">5%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // loading skeleton //
        <div className="min-w-0 flex-none w-full">
          <div className="skeleton card flex items-center rounded-xl max-w-xs h-40 w-full mx-auto"></div>
        </div>
      )}
      {/* dot buttons */}
      <div className="flex justify-center mt-4 mb-2">
        <div className="flex items-center gap-3">
          {scrollSnaps.map((_, index) => (
            <DotButton
              key={index}
              onClick={() => onDotButtonClick(index)}
              className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 border-2
                    ${
                      index === selectedIndex
                        ? "bg-white border-white"
                        : "bg-black border-white"
                    }
                    hover:bg-white hover:bg-opacity-20
                    
                    `}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeCarousel;
