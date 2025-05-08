"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { dbfs } from "@/app/firebase/firebaseConfig";
import { useGameContext } from "@/app/contexts/MiningContext";
import Loader from "@/app/loading";

const SolveToEarnPageContent = () => {
  const [again, setAgain] = useState(true);
  const [answers, setAnswers] = useState(0);
  const [leftTime, setLeftTime] = useState(60);
  const router = useRouter();
  const [mathProcess, setMathProcess] = useState("");
  const [options, setOptions] = useState(["first", "second", "third", "fourth"]);
  const { telegramId, SetMainQuantAmount } = useGameContext();
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const answersRef = useRef(answers);
  const correctRef = useRef(correctAnswer);
  useEffect(() => {
    router.prefetch("/earn/solvetoearn-page/solveToEarnResults");
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    correctRef.current = correctAnswer;
  }, [correctAnswer]);
  useEffect(() => {
      const tg = window.Telegram?.WebApp;
      if(tg){
      tg.ready();
      const handleBackButtonClick = () => {
        router.replace('/earn');
      };
      tg.BackButton.show();
      tg.BackButton.onClick(handleBackButtonClick);
      return () => {
        tg.BackButton.offClick(handleBackButtonClick);
       
      };
      }else{
        console.error("Telegram WebApp not available");
      }
      
    
  }, [router])
  useEffect(() => {
    const MathCreator = async () => {
      try {
        const processies = ["+", "-", "*", "/"];
        function getRandomInteger(min:number, max:number) {
          return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        const generateDecoys = (correct:number) => {
          const offset = getRandomInteger(5, 15);
          const decoys = new Set<number>();

          while (decoys.size < 3) {
            const variation = Math.random() < 0.5
              ? correct + getRandomInteger(1, offset)
              : correct - getRandomInteger(1, offset);

            if (variation !== correct && variation > 0) {
              decoys.add(variation)
            };
          }
          const shuffleArray = (array: number[]) => {
            for (let i = array.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
          };
          const newOptions = shuffleArray([...decoys, correct]);
          setOptions(newOptions.map(option => option.toString()));
          return [...decoys];
        };
        const process = getRandomInteger(0, 3);
        let value1, value2
        if (processies[process] === "+") {
          value1 = getRandomInteger(10, 100);
          value2 = getRandomInteger(10, 100);
          setMathProcess(`${value1} + ${value2}`);
          let s1, s2, s3, s4;
          do {
            const v1 = getRandomInteger(1, 4);
            const v2 = getRandomInteger(1, 4);
            const v3 = getRandomInteger(1, 4);
            const v4 = getRandomInteger(1, 4)
            if (v1 === 1) {
              s1 = "first";
            } else if (v1 === 2) {
              s1 = "second";
            } else if (v1 === 3) {
              s1 = "third";
            } else {
              s1 = "fourth";
            }
            if (v2 === 1) {
              s2 = "first";
            } else if (v2 === 2) {
              s2 = "second";
            } else if (v2 === 3) {
              s2 = "third";
            } else {
              s2 = "fourth";
            }
            if (v3 === 1) {
              s3 = "first";
            } else if (v3 === 2) {
              s3 = "second";
            } else if (v3 === 3) {
              s3 = "third";
            } else {
              s3 = "fourth";
            }
            if (v4 === 1) {
              s4 = "first";
            } else if (v4 === 2) {
              s4 = "second";
            } else if (v4 === 3) {
              s4 = "third";
            } else {
              s4 = "fourth";
            }
          } while (s1 === s2 || s1 === s3 || s2 === s3 || s1 === s4 || s2 === s4 || s4 === s3);
          generateDecoys(value1 + value2);
          return;
        }
        if (processies[process] === "-") {
          value1 = getRandomInteger(10, 100);
          value2 = getRandomInteger(10, 100);
          setMathProcess(`${Math.max(value1, value2)} - ${Math.min(value1, value2)}`);
          let s1, s2, s3, s4;
          do {
            const v1 = getRandomInteger(1, 4);
            const v2 = getRandomInteger(1, 4);
            const v3 = getRandomInteger(1, 4);
            const v4 = getRandomInteger(1, 4)
            if (v1 === 1) {
              s1 = "first";
            } else if (v1 === 2) {
              s1 = "second";
            } else if (v1 === 3) {
              s1 = "third";
            } else {
              s1 = "fourth";
            }
            if (v2 === 1) {
              s2 = "first";
            } else if (v2 === 2) {
              s2 = "second";
            } else if (v2 === 3) {
              s2 = "third";
            } else {
              s2 = "fourth";
            }
            if (v3 === 1) {
              s3 = "first";
            } else if (v3 === 2) {
              s3 = "second";
            } else if (v3 === 3) {
              s3 = "third";
            } else {
              s3 = "fourth";
            }
            if (v4 === 1) {
              s4 = "first";
            } else if (v4 === 2) {
              s4 = "second";
            } else if (v4 === 3) {
              s4 = "third";
            } else {
              s4 = "fourth";
            }
          } while (s1 === s2 || s1 === s3 || s2 === s3 || s1 === s4 || s2 === s4 || s4 === s3);
          generateDecoys(Math.max(value1, value2) - Math.min(value1, value2));
          return;
        }
        if (processies[process] === "*") {
          value1 = getRandomInteger(2, 20);
          value2 = getRandomInteger(2, 20);
          setMathProcess(`${value1} x ${value2}`);
          let s1, s2, s3, s4;
          do {
            const v1 = getRandomInteger(1, 4);
            const v2 = getRandomInteger(1, 4);
            const v3 = getRandomInteger(1, 4);
            const v4 = getRandomInteger(1, 4)
            if (v1 === 1) {
              s1 = "first";
            } else if (v1 === 2) {
              s1 = "second";
            } else if (v1 === 3) {
              s1 = "third";
            } else {
              s1 = "fourth";
            }
            if (v2 === 1) {
              s2 = "first";
            } else if (v2 === 2) {
              s2 = "second";
            } else if (v2 === 3) {
              s2 = "third";
            } else {
              s2 = "fourth";
            }
            if (v3 === 1) {
              s3 = "first";
            } else if (v3 === 2) {
              s3 = "second";
            } else if (v3 === 3) {
              s3 = "third";
            } else {
              s3 = "fourth";
            }
            if (v4 === 1) {
              s4 = "first";
            } else if (v4 === 2) {
              s4 = "second";
            } else if (v4 === 3) {
              s4 = "third";
            } else {
              s4 = "fourth";
            }
          } while (s1 === s2 || s1 === s3 || s2 === s3 || s1 === s4 || s2 === s4 || s4 === s3);
          generateDecoys(value1 * value2);
          return;
        }
        if (processies[process] === "/") {
          do {
            value1 = getRandomInteger(10, 100);
            value2 = getRandomInteger(10, 100);
          } while (Math.max(value1, value2) % Math.min(value1, value2) !== 0);
          setMathProcess(`${Math.max(value1, value2)} / ${Math.min(value1, value2)}`);
          let s1, s2, s3, s4;
          do {
            const v1 = getRandomInteger(1, 4);
            const v2 = getRandomInteger(1, 4);
            const v3 = getRandomInteger(1, 4);
            const v4 = getRandomInteger(1, 4)
            if (v1 === 1) {
              s1 = "first";
            } else if (v1 === 2) {
              s1 = "second";
            } else if (v1 === 3) {
              s1 = "third";
            } else {
              s1 = "fourth";
            }
            if (v2 === 1) {
              s2 = "first";
            } else if (v2 === 2) {
              s2 = "second";
            } else if (v2 === 3) {
              s2 = "third";
            } else {
              s2 = "fourth";
            }
            if (v3 === 1) {
              s3 = "first";
            } else if (v3 === 2) {
              s3 = "second";
            } else if (v3 === 3) {
              s3 = "third";
            } else {
              s3 = "fourth";
            }
            if (v4 === 1) {
              s4 = "first";
            } else if (v4 === 2) {
              s4 = "second";
            } else if (v4 === 3) {
              s4 = "third";
            } else {
              s4 = "fourth";
            }
          } while (s1 === s2 || s1 === s3 || s2 === s3 || s1 === s4 || s2 === s4 || s4 === s3);
          generateDecoys(Math.max(value1, value2) / Math.min(value1, value2));
          return;
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    MathCreator();
  }, [again]);
  const checkAnswer = (sort:number) => {
    const mathprocessSplit = mathProcess.split(" ");
    const value1 = Number(mathprocessSplit[0]);
    const value2 = Number(mathprocessSplit[2]);
    const buttonText = options[sort];
    if (mathprocessSplit[1] === "+") {
      if (Number(buttonText) === value1 + value2) {
        /*/document.getElementById(sort).className="rounded-lg bg-green-500 w-56 h-10";
        setTimeout(() => {
          document.getElementById(sort).className="rounded-lg bg-[#202020] w-56 h-10";
        }, 200); /*/
        setCorrectAnswer(correctAnswer + 1);
        setAgain(!again);
        setAnswers(answers + 3);
      } else {
        /*/ document.getElementById(sort).className="rounded-lg bg-red-500 w-56 h-10";
           setTimeout(() => {
             document.getElementById(sort).className="rounded-lg bg-[#202020] w-56 h-10";
           }, 200); /*/
        setAnswers(answers > 0 ? answers - 1 : 0);
        setAgain(!again);
      }
    }
    if (mathprocessSplit[1] === "-") {
      const answer = Math.max(value1, value2) - Math.min(value1, value2);
      if (Number(buttonText) === answer) {
        /*/  document.getElementById(sort).className="rounded-lg bg-green-500 w-56 h-10";
              setTimeout(() => {
                document.getElementById(sort).className="rounded-lg bg-[#202020] w-56 h-10";
              }, 200); /*/
        setCorrectAnswer(correctAnswer + 1);
        setAgain(!again);
        setAnswers(answers + 3);
      } else {
        /*/  document.getElementById(sort).className="rounded-lg bg-red-500 w-56 h-10";
          setTimeout(() => {
            document.getElementById(sort).className="rounded-lg bg-[#202020] w-56 h-10";
          }, 200); /*/
        setAnswers(answers > 0 ? answers - 1 : 0);
        setAgain(!again);
      }
    }
    if (mathprocessSplit[1] === "x") {
      if (Number(buttonText) === Math.floor(value1 * value2)) {
        /*/document.getElementById(sort).className="rounded-lg bg-green-500 w-56 h-10";
            setTimeout(() => {
              document.getElementById(sort).className="rounded-lg bg-[#202020] w-56 h-10";
            }, 200); /*/
        setAgain(!again);
        setAnswers(answers + 3);
        setCorrectAnswer(correctAnswer + 1);
      } else {
        /*/ document.getElementById(sort).className="rounded-lg bg-red-500 w-56 h-10";
         setTimeout(() => {
           document.getElementById(sort).className="rounded-lg bg-[#202020] w-56 h-10";
         }, 200); /*/
        setAnswers(answers > 0 ? answers - 1 : 0);

        setAgain(!again);
      }
    }
    if (mathprocessSplit[1] === "/") {
      const answer = Math.floor(Math.max(value1, value2) / Math.min(value1, value2));
      if (Number(buttonText) === answer) {
        /*/ document.getElementById(sort).className="rounded-lg bg-green-500 w-56 h-10";
             setTimeout(() => {
               document.getElementById(sort).className="rounded-lg bg-[#202020] w-56 h-10";
             }, 200); /*/
        setAgain(!again);
        setAnswers(answers + 3);
        setCorrectAnswer(correctAnswer + 1);
      } else {
        /*/ document.getElementById(sort).className="rounded-lg bg-red-500 w-56 h-10";
         setTimeout(() => {
           document.getElementById(sort).className="rounded-lg bg-[#202020] w-56 h-10";
         }, 200); /*/
        setAnswers(answers > 0 ? answers - 1 : 0);
        setAgain(!again);
      }
    }
  }
  const dbSave = async (answersR:number, correctR:number) => {
    try {
      const date = new Date(Date.now());
      const formattedDate =
        `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;

      const solvetoEarnHistory = doc(dbfs, `user/${telegramId}/solveToEarnHistory/${Date.now()}`);

      const solveToEarnSet = doc(dbfs, `user/${telegramId}/miningData/values`);
      const snapshotSolveToEarn = await getDoc(solveToEarnSet);
      const remainingSolveToEarn = snapshotSolveToEarn.data()?.remainingSolveToEarn;
      const totalQuant = snapshotSolveToEarn.data()?.QuantAmount;
      const totallyQ = totalQuant + answersR;
      let formattedQuant = Number(totallyQ);
      formattedQuant = totallyQ.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      sessionStorage.setItem("correctAnswers", `${correctR}`);
      if (snapshotSolveToEarn.exists() && remainingSolveToEarn) {
        if (Number(remainingSolveToEarn) > 0) {
          updateDoc(solveToEarnSet, {
            QuantAmount: totallyQ,
          });
          setDoc(solvetoEarnHistory, {
            Date: formattedDate,
            total: correctR,
            quant: answersR,
            platform: "solvetoearn"
          }, { merge: true });
          SetMainQuantAmount(`${formattedQuant}`);
          sessionStorage.setItem("TotalCorrectSolveToEarn", `${answersR}`);
        }
      }
    } finally {
      router.replace("/earn/solvetoearn-page/solveToEarnResults")
    }
  }
  useEffect(() => {
    const interval = setInterval(() => {
      setLeftTime(prevTime => {
        if (prevTime <= 0) {
          clearInterval(interval);
          setIsLoading(true);
          dbSave(answersRef.current, correctRef.current);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="overflow-auto"
      >
        {!isLoading ? (
          <div>
            <div className="flex justify-between px-4">
              <div className="flex items-center justify-between rounded-full bg-[#202020] p-3 space-x-1">
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 32 32">
                    <path fill="#fff" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667" />
                  </svg>
                </div>
                <div>{answers}</div>
              </div>
              <div className="flex items-center justify-between rounded-full bg-[#202020] p-3 space-x-1">
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24">
                    <g fill="none" fillRule="evenodd">
                      <path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z" />
                      <path fill="#fff" d="M10.975 3.002a1 1 0 0 1-.754 1.196a8 8 0 0 0-.583.156a1 1 0 0 1-.59-1.911q.36-.112.73-.195a1 1 0 0 1 1.197.754m2.05 0a1 1 0 0 1 1.196-.754c4.454 1.01 7.78 4.992 7.78 9.752c0 5.523-4.478 10-10 10c-4.761 0-8.743-3.325-9.753-7.779a1 1 0 0 1 1.95-.442a8 8 0 1 0 9.58-9.58a1 1 0 0 1-.753-1.197M6.614 4.72a1 1 0 0 1-.053 1.414q-.222.205-.427.426A1 1 0 0 1 4.668 5.2q.255-.276.532-.533a1 1 0 0 1 1.414.053M12 6a1 1 0 0 1 1 1v4.586l2.707 2.707a1 1 0 0 1-1.414 1.414l-3-3A1 1 0 0 1 11 12V7a1 1 0 0 1 1-1M3.693 8.388a1 1 0 0 1 .661 1.25a8 8 0 0 0-.156.583a1 1 0 0 1-1.95-.442q.084-.37.195-.73a1 1 0 0 1 1.25-.661" />
                    </g>
                  </svg>
                </div>
                <div>{leftTime}</div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center fixed inset-0">
              <div className="font-medium text-3xl">{mathProcess}</div>
              <div className="flex flex-col items-center justify-center space-y-3 pt-10">
                {options.map((option, index) => (
                  <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} key={index} onClick={() => { checkAnswer(index) }} className={"rounded-lg bg-[#202020] w-56 h-10"}>{option}</motion.button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Loader />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
export default SolveToEarnPageContent;