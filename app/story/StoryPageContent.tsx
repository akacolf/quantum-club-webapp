"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { GameProvider, useGameContext } from "../contexts/MiningContext";
import { motion, AnimatePresence } from "framer-motion";
const StoryPageContent = () => {
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/story");
    router.prefetch("/home");
  });
  const [isPaused, setIsPaused] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const [quantValue] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("firstQuant");
    }
    return "";
  });

  const {rank} = useGameContext()
  const goToNextStory = () => {
    if (currentStoryIndex <= stories.length) {
      if (currentStoryIndex != 2) {
        setCurrentStoryIndex(currentStoryIndex + 1);
        setTimeLeft(stories[currentStoryIndex + 1].duration);
        setProgress(0);
      } else {
        router.push(`/home`);
      }
    }
  };

  const goToPreviousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setTimeLeft(stories[currentStoryIndex - 1].duration + 8);
      setProgress(0);
    }
  };
  const stories = [
    {
      id: 1,
      title: "Story 1",
      content: (
        <div className="flex flex-col min-h-screen w-screen justify-evenly">
          <div className="mt-10 justify-center flex text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="80"
              height="80"
              viewBox="0 0 32 32"
            >
              <path
                fill="currentColor"
                d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667"
              />
            </svg>
          </div>
          <h5 className="text-xl font-semibold leading-relaxed text-left ml-4 text-white">
            <div>
              The <span> Quantum Era </span>{" "}
              of <span className="text-[#24a1de]">Telegram</span> <br />
              is here. Explore Quantum Club <br />
              and get rewarded.
            </div>
          </h5>
          <div className="items-center justify-center flex">
            <button
              className="px-32 py-4 bg-white text-black font-semibold rounded-lg text-lg z-20 cursor-pointer"
              onClick={goToNextStory}
            >
              Let&apos;s go
            </button>
          </div>
        </div>
      ),
      duration: 120, // story duration in seconds
    },

    {
      id: 2,
      title: "Story 2",
      content: (
        <div className="flex flex-col min-h-screen w-screen justify-evenly">
          <div className="mt-10 justify-center flex text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="80"
              height="80"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19c-.14.75-.42 1-.68 1.03c-.58.05-1.02-.38-1.58-.75c-.88-.58-1.38-.94-2.23-1.5c-.99-.65-.35-1.01.22-1.59c.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02c-.09.02-1.49.95-4.22 2.79c-.4.27-.76.41-1.08.4c-.36-.01-1.04-.2-1.55-.37c-.63-.2-1.12-.31-1.08-.66c.02-.18.27-.36.74-.55c2.92-1.27 4.86-2.11 5.83-2.51c2.78-1.16 3.35-1.36 3.73-1.36c.08 0 .27.02.39.12c.1.08.13.19.14.27c-.01.06.01.24 0 .38"
              />
            </svg>
          </div>
          <h5 className="text-xl font-semibold leading-relaxed ml-4 text-white">
            <div>
              Your participation in the{" "}
              <span className="text-[#24a1de]">Telegram</span> ecosystem is
              important. You have earned{" "}
              <span>{quantValue} QNTM</span>{" "}
              tokens. You have achieved the{" "}
              <span>{rank}</span> rank.
            </div>
          </h5>
          <div className="items-center justify-center flex">
            <button
              className="px-36 py-4 bg-white text-black font-semibold rounded-lg text-lg z-20 cursor-pointer"
              onClick={goToNextStory}
            >
              Cool
            </button>
          </div>
        </div>
      ),
      duration: 120,
    },
    {
      id: 3,
      title: "Story 3",
      content: (
        <div className="flex flex-col min-h-screen w-screen justify-evenly text-white">
          <div className="mt-10 justify-center flex">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="80"
              height="80"
              viewBox="0 0 48 48"
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M24 39.173c-.14.751-1.539 4.272-4.424 4.325c-4.699.087-3.629-3.141-7.502-5.947s-3.597-4.847-3.939-7.148"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.602 31.892c-2.816-1.399-3.333-8.332-1.159-7.22c0 0-1.959-6.78 1.594-8.53"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.333 19.176s-3.282-5.802 1.42-8.724"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12.933 12.384c-.034-.244-1.432-5.291 3.937-6.107m-.312 1.069s2.3-6 7.443-.577M19.58 40.743c-.947.048-2.822.382-5.227-4.112m4.412-1.13a3.79 3.79 0 0 1 2.943 2.852m-8.297-6.232a5.23 5.23 0 0 1-2.42-4.578c.23-2.985-.85-4.2-.85-4.2m3.507-.967s1.663-.206 2.357 2.435a1.515 1.515 0 0 0 2.512.789m.728-2.408s1.888.3 2.367-1.05m-5.036-.522a6.55 6.55 0 0 0-.554-3.88c-.849-1.662.364-4.299.364-4.299m2.127-.972s-2.891-1.71.453-4.611m1.039 2.464c.507 2.57 1.238 5.281-.327 9.275m-5.842 14.801c.187 0 4.582.127 2.978-3.53s-2.851-3.043-3.216-6.683"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.028 30.72s-1.371 1.956-4.656-.777M24 39.173c.14.751 1.539 4.272 4.424 4.325c4.699.087 3.629-3.141 7.502-5.947s3.597-4.847 3.939-7.148"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M38.398 31.892c2.816-1.399 3.333-8.332 1.159-7.22c0 0 1.959-6.78-1.594-8.53"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M36.667 19.176s3.282-5.802-1.42-8.724"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M35.067 12.384c.034-.244 1.433-5.291-3.937-6.107m.313 1.069s-2.302-6-7.444-.577m4.421 33.974c.947.048 2.822.382 5.227-4.112m-4.412-1.13a3.79 3.79 0 0 0-2.943 2.852m8.297-6.232a5.23 5.23 0 0 0 2.42-4.578c-.23-2.985.85-4.2.85-4.2m-3.507-.967s-1.663-.206-2.357 2.435a1.515 1.515 0 0 1-2.512.789m-.728-2.408s-1.888.3-2.367-1.05m5.036-.522a6.55 6.55 0 0 1 .554-3.88c.849-1.662-.364-4.299-.364-4.299m-2.127-.972s2.891-1.71-.453-4.611m-1.039 2.464c-.507 2.57-1.238 5.281.327 9.275m5.842 14.801c-.187 0-4.582.127-2.978-3.53s2.852-3.043 3.216-6.683"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M26.972 30.72s1.371 1.956 4.656-.777"
              />
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                d="M24 39.173V6.77"
              />
            </svg>
          </div>
          <h5 className="text-xl font-semibold leading-relaxed ml-4 text-white">
            <span>Solve-to-earn</span> has
            arrived. <br />
            Have fun.
          </h5>
          <div className="items-center justify-center flex">
            <button
              className="px-28 py-4 bg-white text-black font-semibold rounded-lg text-lg z-20 cursor-pointer"
              onClick={goToNextStory}
            >
              I will
            </button>
          </div>
        </div>
      ),
      duration: 120,
    },
  ];
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(stories[currentStoryIndex].duration);
  const [progress, setProgress] = useState(0);
  const currentStory = stories[currentStoryIndex];

  // Timer and progress bar updation //
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            goToNextStory(); // open here for the next story
            return stories[currentStoryIndex].duration; // Reset time for next story
          }
          return prevTime - 1;
        });
      }, 75);
      timer.current = interval;
      return () => clearInterval(interval);
    }
  }, [currentStoryIndex, isPaused]);
  // Update the progress bar //
  useEffect(() => {
    if (!isPaused) {
      setProgress(
        ((stories[currentStoryIndex].duration - timeLeft) /
          stories[currentStoryIndex].duration) *
          100
      );
    }
  }, [timeLeft, currentStoryIndex, isPaused]);

  const handleDown = () => {
    setIsPaused(true);
    if (timer.current) {
      clearInterval(timer.current);
    }
  };
  const handleUp = () => {
    setIsPaused(false);
  };
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className=" bg-black fixed" onTouchStart={
            handleDown
          }
          onTouchEnd={handleUp}
        >
          <GameProvider>
            {/* Progress Bar */}
            <div
              className="flex justify-between"
            >
              {stories.map((_, index) => (
                <div
                  key={index}
                  className="flex-1 mx-2"
                >
                  <div
                    className="bg-gray-300 rounded"
                  >
                    <div
                      className="h-1 bg-white-600 rounded transition-width duration-500 ease-out"
                      style={{
                        height: "0.25rem",
                        width: `${
                          index < currentStoryIndex
                            ? 100
                            : index === currentStoryIndex
                            ? progress
                            : 0
                        }%`, // The completed story is done, now the current story is in progress
                        backgroundColor: "rgb(0,122,255)",
                        borderRadius: "10px",
                        transition: "width 0.5s ease-out",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div>
              {/* Clicking areas */}
              <div
                onClick={goToPreviousStory}
                style={{
                  position: "fixed",
                  left: "0",
                  top: "0",
                  bottom: "0",
                  height: "100%",
                  width: "50%", // Left side
                  cursor: "pointer",
                  zIndex: 10,
                }}
              />
              <div
                onClick={goToNextStory}
                style={{
                  position: "fixed",
                  right: "0",
                  top: "0",
                  bottom: "0",
                  width: "50%", // Right side
                  height: "100%",
                  cursor: "pointer",
                  zIndex: 10,
                }}
              />
            </div>
            <div>
              {currentStory.content}
            </div>
          </GameProvider>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StoryPageContent;
