"use client";

import React from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Link from "next/link";
import tasks from "@/app/earn/tasks";
import { DotButton, useDotButton } from "./CarouselDotButton";

const HomeCarousel: React.FC = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({loop: true}, [Autoplay({stopOnInteraction: false, delay: 5000})]);
  const { selectedIndex, scrollSnaps, onDotButtonClick } =
    useDotButton(emblaApi);

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
    /*parent container should include overflow-hidden class*/
    <div className="overflow-hidden" ref={emblaRef}>
      {/* this element is the container */}
      <div className="flex">
        {/* TG story card*/}
        <div className="min-w-0 flex-none w-full">
          <div className="flex items-center justify-between bg-gradient-to-tr from-neutral-300 to-stone-400 p-4 rounded-xl max-w-xs w-full h-40 mx-auto">
            <div className="flex flex-col">
              <span className="text-lg text-black font-semibold">
                The Quantum Era of Telegram
              </span>
              <span className="text-sm font-semibold text-black mt-2">
                Your TG story matters.
              </span>
              <div className="mt-4">
                <Link
                  className="font-normal text-sm rounded-full bg-black text-white py-2 px-4 cursor-pointer"
                  href={"/story"}
                >
                  Explore
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="4em"
                height="4em"
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
        {/* card #2*/}
        <div className="min-w-0 flex-none w-full">
          <div className="flex items-center justify-between bg-gradient-to-r from-red-200 via-red-300 to-yellow-200 p-4 rounded-xl max-w-xs w-full h-40 mx-auto">
            <div className="flex flex-col">
              <span className="text-lg text-black font-semibold">
                The Club of OGs
              </span>
              <span className="text-sm font-semibold text-black mt-2">
                Join our Telegram channel to stay updated with the latest news.
              </span>
              <div className="mt-4">
                <button
                  id="joinbutton"
                  onClick={() => handleJoinTask()}
                  className="px-4 py-1 bg-white text-black rounded-full cursor-pointer"
                >
                  Join
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="4em"
                height="4em"
                viewBox="0 0 256 256"
              >
                <defs>
                  <linearGradient
                    id="logosTelegram0"
                    x1="50%"
                    x2="50%"
                    y1="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#2aabee" />
                    <stop offset="100%" stopColor="#229ed9" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#logosTelegram0)"
                  d="M128 0C94.06 0 61.48 13.494 37.5 37.49A128.04 128.04 0 0 0 0 128c0 33.934 13.5 66.514 37.5 90.51C61.48 242.506 94.06 256 128 256s66.52-13.494 90.5-37.49c24-23.996 37.5-56.576 37.5-90.51s-13.5-66.514-37.5-90.51C194.52 13.494 161.94 0 128 0"
                />
                <path
                  fill="#fff"
                  d="M57.94 126.648q55.98-24.384 74.64-32.152c35.56-14.786 42.94-17.354 47.76-17.441c1.06-.017 3.42.245 4.96 1.49c1.28 1.05 1.64 2.47 1.82 3.467c.16.996.38 3.266.2 5.038c-1.92 20.24-10.26 69.356-14.5 92.026c-1.78 9.592-5.32 12.808-8.74 13.122c-7.44.684-13.08-4.912-20.28-9.63c-11.26-7.386-17.62-11.982-28.56-19.188c-12.64-8.328-4.44-12.906 2.76-20.386c1.88-1.958 34.64-31.748 35.26-34.45c.08-.338.16-1.598-.6-2.262c-.74-.666-1.84-.438-2.64-.258c-1.14.256-19.12 12.152-54 35.686c-5.1 3.508-9.72 5.218-13.88 5.128c-4.56-.098-13.36-2.584-19.9-4.708c-8-2.606-14.38-3.984-13.82-8.41c.28-2.304 3.46-4.662 9.52-7.072"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
      {/* dot buttons */}
      <div className="flex justify-center mt-4 mb-2">
        <div className="flex items-center gap-3">
            {scrollSnaps.map((_, index) => (
                <DotButton
                key={index}
                onClick={() => onDotButtonClick(index)}
                className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 border-2
                    ${index === selectedIndex ? "bg-white border-white" : "bg-black border-white" }
                    hover:bg-white hover:bg-opacity-20
                    focus:outline-none focus:ring-2 focus:ring-white
                    `}
                />
            ))}
        </div>
      </div>
    </div>
  );
};

export default HomeCarousel;
