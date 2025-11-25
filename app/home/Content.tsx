"use client";

import { dbfs } from "@/app/(firebase)/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import { toUserFriendlyAddress } from "@tonconnect/sdk";
import { useRouter } from "next/navigation";
import { THEME, useTonConnectUI } from "@tonconnect/ui-react";
import toast from "react-hot-toast";
/*import { toNano } from "@ton/core";*/
import HomeCarousel from "@/app/home/(components)/homepagecarousel/Carousel";
import { LottieRefCurrentProps } from "lottie-react";
import ClaimToaster from "./(components)/ClaimToaster";
import TabsSwitch from "./(components)/PlatformSwitch";
import QntmBalance from "./(components)/QntmBalance";
import DailyCheckIn from "./(components)/DailyCheck";
import SolveToEarnCard from "./(components)/SolveToEarnCard";

const calculateRemainingTime = (timestamp: number) => {
  const now = new Date();
  const targetTime = new Date(timestamp);
  const diffMs = targetTime.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const minutes = String(Math.floor((diffMs / 1000 / 60) % 60)).padStart(
    2,
    "0"
  );
  const hours = String(Math.floor((diffMs / 1000 / 60 / 60) % 24)).padStart(
    2,
    "0"
  );
  return ` ${hours}h ${minutes}m`;
};

function getRankIcon(rank: string | null) {
  if (rank === "OG") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1.2em"
        height="1.2em"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="2.197" fill="currentColor" />
        <path
          fill="currentColor"
          d="M21.63441 6.43671c-.70909-1.22723-2.41155-1.73142-4.79628-1.42354c-.30258.03942-.61354.09379-.92927.15769C15.00856 2.619 13.6066 1 12 1C10.39089 1 8.98713 2.62441 8.087 5.1834c-2.7384-.54268-4.90657-.15669-5.72186 1.25331C1.55256 7.84376 2.2947 9.90626 4.12193 12C2.2947 14.09374 1.55256 16.15624 2.3651 17.56329c.58143 1.00732 1.85 1.49542 3.52453 1.49542a11.47535 11.47535 0 0 0 2.197-.24305C8.98673 21.37518 10.39069 23 12 23c1.60658 0 3.00854-1.619 3.90884-4.17086c.31573.0639.62669.11827.92927.15769a10.18235 10.18235 0 0 0 1.297.088c1.70461 0 2.92647-.52028 3.49932-1.51151c.81254-1.407.07053-3.46955-1.75643-5.56329C21.70494 9.90626 22.447 7.84376 21.63441 6.43671ZM16.9851 6.13956a9.0809 9.0809 0 0 1 1.15965-.08046c1.26048 0 2.14979.32826 2.507.94617c.50426.87335-.06645 2.44138-1.55187 4.16777a20.50554 20.50554 0 0 0-2.30139-1.95281a19.9752 19.9752 0 0 0-.5471-2.93612C16.49539 6.23744 16.7503 6.17013 16.9851 6.13956Zm-3.07236 9.17417c-.64647.37332-1.28408.70346-1.90695.9935c-.63936-.29755-1.2812-.62534-1.919-.9935c-.64888-.37459-1.25525-.76326-1.81959-1.15917c-.06229-.6861-.09688-1.405-.09688-2.15456s.03459-1.46846.09688-2.15456c.56434-.39591 1.17071-.78458 1.81959-1.15917c.63487-.36648 1.27383-.69333 1.91024-.98982c.62668.29132 1.26511.61409 1.91573.98982c.64908.37472 1.25572.76346 1.82019 1.15958c.06222.686.09682 1.40477.09682 2.15415s-.0346 1.46813-.09682 2.15415C15.16846 14.55027 14.56182 14.939 13.91274 15.31373Zm1.628.3351a17.87565 17.87565 0 0 1-.39136 1.82408a18.46424 18.46424 0 0 1-1.76012-.58257c.36293-.18713.72713-.38337 1.092-.594C14.8457 16.086 15.1977 15.86928 15.54078 15.64883Zm-4.92407 1.24372A18.41329 18.41329 0 0 1 8.851 17.474a17.86018 17.86018 0 0 1-.39176-1.82549c.34328.22058.69541.43734 1.06.64787C9.88355 16.50677 10.24989 16.70348 10.61671 16.89255ZM7.07428 13.25036A18.3863 18.3863 0 0 1 5.67548 12a18.38878 18.38878 0 0 1 1.3988-1.25043c-.02005.41033-.03252.82636-.03252 1.25043S7.05423 12.8401 7.07428 13.25036Zm1.385-4.89886a17.86727 17.86727 0 0 1 .391-1.82227a18.22228 18.22228 0 0 1 1.76937.57681c-.36775.18947-.735.38659-1.10031.59759C9.15468 7.91416 8.80255 8.13092 8.45927 8.3515Zm4.93057-1.242a18.48842 18.48842 0 0 1 1.75958-.58237a17.87565 17.87565 0 0 1 .39136 1.82408c-.34308-.22045-.69508-.43715-1.05948-.64754C14.11663 7.4931 13.75263 7.29652 13.38984 7.10946ZM16.92577 10.75A18.40125 18.40125 0 0 1 18.324 12a18.38809 18.38809 0 0 1-1.39826 1.25c.02-.41013.03251-.826.03251-1.25S16.94581 11.1601 16.92577 10.75ZM12 2.12854c.99773 0 2.05613 1.23433 2.80746 3.31044a20.80159 20.80159 0 0 0-2.8094 1.01141A20.51935 20.51935 0 0 0 9.19055 5.44481C9.94208 3.36508 11.00163 2.12854 12 2.12854ZM3.34774 7.00527c.35133-.60825 1.2519-.93437 2.52043-.93437a10.26212 10.26212 0 0 1 1.88362.20148A19.96778 19.96778 0 0 0 7.20147 9.2205a20.48874 20.48874 0 0 0-2.30166 1.95288C3.41412 9.44692 2.84341 7.87869 3.34774 7.00527Zm0 9.98946c-.50433-.87342.06638-2.44165 1.55207-4.16811A20.50145 20.50145 0 0 0 7.20147 14.7795a19.94422 19.94422 0 0 0 .5518 2.95356C5.50578 18.162 3.85468 17.87245 3.34774 16.99473ZM12 21.87146c-.99866 0-2.05847-1.23708-2.81007-3.31775a20.44828 20.44828 0 0 0 2.81155-1.00255a20.80209 20.80209 0 0 0 2.806 1.00979C14.05615 20.63706 12.99775 21.87146 12 21.87146Zm8.65175-4.87673c-.45914.79277-1.79257 1.10923-3.66667.86571c-.2348-.03057-.48971-.09788-.73369-.14455a19.97619 19.97619 0 0 0 .5471-2.93619A20.50419 20.50419 0 0 0 19.0999 12.827C20.58532 14.55335 21.156 16.12138 20.65177 16.99473Z"
        />
        <circle cx="-.5" cy="2" r="1.5" fill="currentColor">
          <animateMotion
            dur="2.6s"
            path="M14.75 14.1471C12.2277 15.6034 9.69019 16.4332 7.6407 16.6145C5.54599 16.7998 4.15833 16.3018 3.62324 15.375C3.08815 14.4482 3.35067 12.9974 4.55852 11.276C5.74031 9.59178 7.72768 7.80915 10.25 6.35289C12.7723 4.89662 15.3098 4.06682 17.3593 3.88549C19.454 3.70016 20.8417 4.1982 21.3768 5.125C21.9118 6.0518 21.6493 7.50256 20.4415 9.22397C19.2597 10.9082 17.2723 12.6909 14.75 14.1471Z"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    );
  } else if (rank === "LEGEND") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1.2em"
        height="1.2em"
        viewBox="0 0 24 24"
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M12 1.25c-1.828 0-3.339.161-4.502.357l-.134.023c-1.01.169-1.85.31-2.507 1.118c-.42.519-.557 1.08-.588 1.705l-.492.164c-.463.154-.87.29-1.191.44c-.348.162-.667.37-.911.709s-.341.707-.385 1.088c-.04.353-.04.78-.04 1.269v.145c0 .402 0 .757.03 1.054c.032.321.103.634.28.936c.179.303.417.517.683.701c.245.17.555.343.907.538l2.64 1.467c.54 1.061 1.281 2.007 2.3 2.69c.887.596 1.952.97 3.213 1.069a.8.8 0 0 0-.053.277v1.75H9.82a1.75 1.75 0 0 0-1.716 1.407l-.219 1.093H6a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5h-1.885l-.219-1.093a1.75 1.75 0 0 0-1.716-1.407h-1.43V17a.8.8 0 0 0-.053-.277c1.261-.1 2.326-.473 3.213-1.068c1.02-.684 1.76-1.63 2.3-2.691l2.64-1.467c.352-.195.662-.368.907-.538c.265-.184.504-.398.682-.7c.178-.303.25-.616.281-.937c.03-.297.03-.652.03-1.054v-.145c0-.488 0-.916-.04-1.269c-.044-.381-.14-.75-.385-1.088c-.244-.339-.563-.547-.91-.71c-.323-.15-.729-.285-1.192-.439l-.492-.164c-.03-.626-.167-1.186-.588-1.705c-.656-.809-1.496-.95-2.506-1.118l-.135-.023A27 27 0 0 0 12 1.25m2.585 20l-.16-.799a.25.25 0 0 0-.245-.201H9.82a.25.25 0 0 0-.245.201l-.16.799zM4.288 6.028l.014-.005c.072 1.52.243 3.2.671 4.77l-1.066-.591c-.389-.217-.633-.353-.809-.475c-.162-.113-.215-.18-.244-.23c-.03-.05-.062-.128-.082-.324a11 11 0 0 1-.022-.938v-.073c0-.539.001-.88.03-1.138c.028-.238.072-.327.112-.381c.039-.055.109-.125.326-.226c.236-.11.56-.219 1.07-.39m15.41-.005c-.071 1.52-.243 3.2-.67 4.77l1.065-.591c.389-.217.633-.353.809-.475c.162-.113.215-.18.244-.23c.03-.05.062-.128.082-.324c.021-.214.022-.493.022-.938v-.073c0-.539-.001-.88-.03-1.138c-.028-.238-.072-.327-.112-.381c-.039-.055-.109-.125-.326-.226c-.236-.11-.56-.219-1.07-.39zM7.748 3.086A25.6 25.6 0 0 1 12 2.75c1.74 0 3.167.153 4.252.336c1.207.204 1.46.28 1.727.608c.262.322.287.628.233 1.983c-.09 2.258-.388 4.696-1.31 6.55c-.456.914-1.052 1.662-1.827 2.182c-.771.517-1.766.841-3.075.841s-2.303-.324-3.074-.841c-.776-.52-1.372-1.268-1.827-2.183c-.923-1.853-1.22-4.29-1.31-6.55c-.054-1.354-.03-1.66.233-1.982c.266-.328.519-.404 1.726-.608"
          clipRule="evenodd"
        />
      </svg>
    );
  } else if (rank === "STAR") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1.2em"
        height="1.2em"
        viewBox="0 0 24 24"
      >
        <path
          fill="currentColor"
          d="m8.85 16.825l3.15-1.9l3.15 1.925l-.825-3.6l2.775-2.4l-3.65-.325l-1.45-3.4l-1.45 3.375l-3.65.325l2.775 2.425zm3.15.45l-4.15 2.5q-.275.175-.575.15t-.525-.2t-.35-.437t-.05-.588l1.1-4.725L3.775 10.8q-.25-.225-.312-.513t.037-.562t.3-.45t.55-.225l4.85-.425l1.875-4.45q.125-.3.388-.45t.537-.15t.537.15t.388.45l1.875 4.45l4.85.425q.35.05.55.225t.3.45t.038.563t-.313.512l-3.675 3.175l1.1 4.725q.075.325-.05.588t-.35.437t-.525.2t-.575-.15zm0-5.025"
        />
      </svg>
    );
  }
  return null;
}

const HomeContent = () => {
  const router = useRouter();

  useEffect(() => {
        const tg = window.Telegram?.WebApp;

        tg?.disableClosingConfirmation();
    }, []);
  
     useEffect(() => {
      if (typeof window === "undefined") return;
  
      const mp = sessionStorage.getItem("maintenance");
      // AÇILACAK UNUTMA
      /*if (mp === "true") {
        router.replace("/maintenance");
        return;
      }*/
    }, [router]);

  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const {
    MainQuantAmount,
    SetMainQuantAmount,
    rank,
    telegramId,
    daily,
    setDaily,
    walletAddress,
    setWalletAddress,
    setRemainingSolveToEarn,
    remainingSolveToEarn,
  } = useGameContext();

  const [isClaimDay, setIsclaimDay] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const [isActiveWalletTab, setActiveWalletTab] = useState(false);
  const handleWalletConnection = useCallback(
    (address: string) => {
      setWalletAddress(address);
    },
    [setWalletAddress]
  );

  const handleWalletDisconnection = useCallback(() => {
    setWalletAddress("");
  }, [setWalletAddress]);
  const updateWalletInDB = useCallback(
    async (walletAddress: string, address: string) => {
      const response = await fetch("/api/tonconnections/tonConnectDB", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: telegramId,
          walletAddress: walletAddress,
          address: address,
        }),
      });
      if (!response.ok) {
        const errorData = await response.text();
        const parsedError = JSON.parse(errorData);
        throw new Error(`API Error: ${parsedError.error}`);
      }
    },
    [telegramId]
  );
  useEffect(() => {
    if (!tonConnectUI) return;
    tonConnectUI.uiOptions = {
      language: "en",
      uiPreferences: {
        theme: THEME.DARK,
      },
    };
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      try {
        await tonConnectUI.connectionRestored;

        if (!isMounted) return; // is the mount connected or not check it

        // if wallet connected update state
        if (tonConnectUI.account?.address) {
          handleWalletConnection(tonConnectUI.account.address);
        } else {
          if (walletAddress) {
            handleWalletConnection(walletAddress);
          }
        }

        // listen to status changes (only update database here)
        unsubscribe = tonConnectUI.onStatusChange((wallet) => {
          if (wallet) {
            const address = wallet.account.address;
            const walletAddressFr = toUserFriendlyAddress(address);
            updateWalletInDB(walletAddressFr, address);
            handleWalletConnection(address);
          } else {
            updateWalletInDB("", "");
            handleWalletDisconnection();
          }
        });
      } catch (error) {
        console.error("Could not check wallet connection: ", error);
      }
    };

    setup();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [
    tonConnectUI,
    handleWalletConnection,
    handleWalletDisconnection,
    updateWalletInDB,
    walletAddress,
  ]);

  const handleWalletAction = async () => {
    try {
      if (!tonConnectUI) throw new Error("TON Connect is not ready yet");

      // if it's connected, disconnect. If not, open the modal to connect.
      if (tonConnectUI.connected) {
        await tonConnectUI.disconnect();
      } else {
        await tonConnectUI.openModal();
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Wallet connection unsuccessful:", error?.message);
      }
    }
  };

  {/*const formatAddress = (address: string) => {
    const tempAddress = toUserFriendlyAddress(address);
    return `${tempAddress.slice(0, 4)}...${tempAddress.slice(-4)}`;
  };*/}
  async function goToSolveToEarn() {
    const taskElement = document.getElementById("solvetoearnbutton");
    if (taskElement) {
      (taskElement as HTMLButtonElement).disabled = true;
    }
    const date = new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate()
      )
    );

    const formattedDate =
      `${date.getUTCDate().toString().padStart(2, "0")}/` +
      `${(date.getUTCMonth() + 1).toString().padStart(2, "0")}/` +
      `${date.getUTCFullYear()}`;
    const solveToEarnSet = doc(dbfs, `user/${telegramId}/miningData/values`);
    const snapshotSolveToEarn = await getDoc(solveToEarnSet);
    const remainingSolveToEarn: number =
      snapshotSolveToEarn.data()?.remainingSolveToEarn;
    if (remainingSolveToEarn > 0) {
      updateDoc(solveToEarnSet, {
        remainingSolveToEarn: remainingSolveToEarn - 1,
        lastSolveToEarnDate: formattedDate,
      });
      setRemainingSolveToEarn(remainingSolveToEarn - 1);
      sessionStorage.setItem(
        "remainingSolveToEarn",
        `${remainingSolveToEarn - 1}`
      );
      router.push("/earn/solvetoearn");
    }
  }
  useEffect(() => {
    try {
      const checkSolveToEarn = async () => {
        const solveToEarnRef = doc(
          dbfs,
          `user/${telegramId}/miningData/values`
        );
        const snapshotSolveToEarn = await getDoc(solveToEarnRef);
        const remainingSolveToEarnDB = snapshotSolveToEarn.exists()
          ? snapshotSolveToEarn.data().remainingSolveToEarn
          : 0;
        setRemainingSolveToEarn(remainingSolveToEarnDB);
      };
      checkSolveToEarn();
      if (remainingSolveToEarn > 0) {
        router.prefetch("/earn/solvetoearn");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      }
    }
  }, [remainingSolveToEarn, router, setRemainingSolveToEarn, telegramId]);
 
  {
    /*interface Itransaction {
    messages: [
      {
        address: string;
        amount: string;
      }
    ];
    validUntil: number;
  }*/
  }
  {
    /*
    const send = () => async () => {
    try {
      if (!tonConnectUI.connected) {
        await handleWalletAction();
      }
      const tx:Itransaction = {
        messages: [
          {
            address: "UQBUSXMd54HOJlmmh4TsuMvIcwB91kkIlz6HTgj62dN43S3U",
            amount: toNano(0.1).toString(),
          },
        ],
        validUntil: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 1 Day
      };
      const { boc } = await tonConnectUI.sendTransaction(tx);
      console.error(boc);
    } catch (e) {
      console.error("Error", e);
    }
  };
  };*/
  }
  /*const handleJoinTask = () => {
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
  };*/
  const [loadingButtonDay, setLoadingButtonDay] = useState(true);
  useEffect(() => {
    const checkButton = async () => {
      setLoadingButtonDay(true);
      try {
        if (!telegramId) return;
        const solveToEarnValue = doc(
          dbfs,
          "user",
          telegramId,
          "miningData",
          "values"
        );
        const snapshotSolveToEarn = await getDoc(solveToEarnValue);
        if (snapshotSolveToEarn.exists()) {
          const remainingSolveToEarn =
            snapshotSolveToEarn.data()?.remainingSolveToEarn;
          if (remainingSolveToEarn != null) {
            setRemainingSolveToEarn(remainingSolveToEarn);
            sessionStorage.setItem(
              "remainingSolveToEarn",
              remainingSolveToEarn
            );
          }
        }

        //dailycheckin
        const checkTimeRef = doc(
          dbfs,
          "user",
          telegramId,
          "miningData",
          "checkTime"
        );
        const snapshot = await getDoc(checkTimeRef);
        if (snapshot.exists()) {
          const checktime = snapshot.data().checktime;
          if (checktime) {
            const formattedDate = new Intl.DateTimeFormat("en-US", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date());
            const [month, day, year] = formattedDate.split("/");
            const formattedDateISO = `${year}-${month}-${day}`;
            const diffInMs = Math.abs(
              new Date(formattedDateISO).getTime() -
                new Date(checktime).getTime()
            );
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
            if (diffInDays > 2) {
              setDoc(
                checkTimeRef,
                {
                  daily: 1,
                },
                { merge: true }
              );
              setDaily(1);
              localStorage.setItem("daily", "1");
              setIsclaimDay(false);
            } else if (diffInDays >= 1 && diffInDays < 2) {
              setIsclaimDay(false);
            } else {
              setIsclaimDay(true);
            }
          } else {
            setDaily(1);
            setIsclaimDay(false);
          }
        } else {
          setDoc(checkTimeRef, {
            daily: 1,
          });
          setDaily(1);
          setIsclaimDay(false);
          localStorage.setItem("daily", "1");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingButtonDay(false);
      }
    };
    checkButton();
  }, [setDaily, setRemainingSolveToEarn, telegramId]);

  const [toastQueue, setToastQueue] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  async function ClaimDaily() {
    const claim = async () => {
      try {
        setLoadingDay(true);
        const date = new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate()
          )
        );
        const formattedDate =
          `${date.getUTCDate().toString().padStart(2, "0")}/` +
          `${(date.getUTCMonth() + 1).toString().padStart(2, "0")}/` +
          `${date.getUTCFullYear()}`;
        if (!telegramId) return;
        const solveToEarnValue = doc(
          dbfs,
          "user",
          telegramId,
          "miningData",
          "values"
        );
        const snapshotSolveToEarn = await getDoc(solveToEarnValue);
        if (snapshotSolveToEarn.exists()) {
          const remainingSolveToEarn =
            snapshotSolveToEarn.data()?.remainingSolveToEarn;
          const lastSolveToEarnDt =
            snapshotSolveToEarn.data().lastSolveToEarnDate;
          if (remainingSolveToEarn != null) {
            const [day, month, year] = formattedDate.split("/");
            const formattedDateISO = `${year}-${month}-${day}`;
            const [daySTE, monthSTE, yearSTE] = lastSolveToEarnDt.split("/");
            const solveToEarnDateConvert: string = `${yearSTE}-${monthSTE}-${daySTE}`;
            const diffInMs = Math.abs(
              new Date(formattedDateISO).getTime() -
                new Date(solveToEarnDateConvert).getTime()
            );
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
            setRemainingSolveToEarn(remainingSolveToEarn);
            sessionStorage.setItem(
              "remainingSolveToEarn",
              remainingSolveToEarn
            );
            if (diffInDays >= 1) {
              const updatedSolveToEarn = remainingSolveToEarn + 7;
              updateDoc(solveToEarnValue, {
                remainingSolveToEarn: updatedSolveToEarn,
                lastSolveToEarnDate: formattedDate,
              });
              setRemainingSolveToEarn(updatedSolveToEarn);
              sessionStorage.setItem(
                "remainingSolveToEarn",
                updatedSolveToEarn
              );
              toast.success("+7 passes has been added", {
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#fff"
                      d="M7 15q1.25 0 2.125-.875T10 12t-.875-2.125T7 9t-2.125.875T4 12t.875 2.125T7 15m0 3q-2.5 0-4.25-1.75T1 12t1.75-4.25T7 6q2.025 0 3.538 1.15T12.65 10h8.375L23 11.975l-3.5 4L17 14l-2 2l-2-2h-.35q-.625 1.8-2.175 2.9T7 18"
                    />
                  </svg>
                ),
              });
            }
          } else {
            setDoc(
              solveToEarnValue,
              {
                remainingSolveToEarn: 7,
                lastSolveToEarnDate: formattedDate,
              },
              { merge: true }
            );
            setRemainingSolveToEarn(7);
            sessionStorage.setItem("remainingSolveToEarn", "7");
            toast.success("+7 passes has been added", {
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#fff"
                    d="M7 15q1.25 0 2.125-.875T10 12t-.875-2.125T7 9t-2.125.875T4 12t.875 2.125T7 15m0 3q-2.5 0-4.25-1.75T1 12t1.75-4.25T7 6q2.025 0 3.538 1.15T12.65 10h8.375L23 11.975l-3.5 4L17 14l-2 2l-2-2h-.35q-.625 1.8-2.175 2.9T7 18"
                  />
                </svg>
              ),
              duration: 3000,
            });
          }
        }

        //dailycheckin
        const checkTimeRef = doc(
          dbfs,
          "user",
          telegramId,
          "miningData",
          "checkTime"
        );
        const snapshot = await getDoc(checkTimeRef);
        if (snapshot.exists()) {
          const checktime = snapshot.data().checktime;
          const dailyDay = snapshot.data().daily;
          const valueRef = doc(
            dbfs,
            "user",
            telegramId,
            "miningData",
            "values"
          );
          const rewardsHistory = doc(
            dbfs,
            "user",
            telegramId,
            "rewardsHistory",
            Date.now().toString()
          );
          const snapshotValue = await getDoc(valueRef);
          let quant;
          if (snapshotValue.exists()) {
            quant = snapshotValue.data().QuantAmount;
          }
          if (!checktime) {
            const formattedD = new Intl.DateTimeFormat("tr-TR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date());
            const [day, month, year] = formattedD.split(".");
            const formattedDate = `${month}/${day}/${year}`;
            const formattedslash = `${day}/${month}/${year}`;
            setDoc(
              checkTimeRef,
              {
                checktime: formattedDate,
                daily: 1,
              },
              { merge: true }
            );
            setDaily(1);
            setTimeout(() => {
              addToQueue(`You've got +${50} QNTM`);
            }, 3000);
            const rewardDay: number = quant + 50;
            const formattedAmount = rewardDay.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });
            updateDoc(valueRef, {
              QuantAmount: rewardDay,
            });
            SetMainQuantAmount(formattedAmount);
            setDoc(rewardsHistory, {
              quant: 50,
              platform: "dailycheck-in-reward",
              Date: formattedslash,
            });
           

         
            if (typeof window !== "undefined") {
              localStorage.setItem("QAmount", `${rewardDay}`);
            }
            if (typeof window !== "undefined") {
              localStorage.setItem("daily", "1");
            }
          } else {
            try {
              const formattedD = new Intl.DateTimeFormat("tr-TR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date());
              const [day, month, year] = formattedD.split(".");
              const formattedDateISO = `${year}-${month}-${day}`;
              const formattedDate = `${month}/${day}/${year}`;
              const formattedslash = `${day}/${month}/${year}`;
              const diffInMs = Math.abs(
                new Date(formattedDateISO).getTime() -
                  new Date(checktime).getTime()
              );
              const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
              const quantReward = dailyDay <= 7 ? (daily - 1) * 100 + 50 : 650;
              const rewardDay = quant + quantReward;
              if (diffInDays >= 1 && diffInDays < 2) {
                setDoc(
                  checkTimeRef,
                  {
                    checktime: formattedDate,
                    daily: dailyDay + 1,
                  },
                  { merge: true }
                );
                updateDoc(valueRef, {
                  QuantAmount: rewardDay,
                });
                setDoc(rewardsHistory, {
                  quant: quantReward,
                  platform: "dailycheck-in-reward",
                  Date: formattedslash,
                });
               

           
                const formattedAmount = rewardDay.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                });

                SetMainQuantAmount(formattedAmount);
                if (typeof window !== "undefined") {
                  localStorage.setItem("QAmount", rewardDay);
                }
                setDaily(dailyDay + 1);
                setTimeout(() => {
                  addToQueue(`You've got +${quantReward} QNTM`);
                }, 3000);
                if (typeof window !== "undefined") {
                  localStorage.setItem("daily", dailyDay + 1);
                }
                console.error("Claimed");
              } else if (diffInDays >= 2) {
                const rewardDay = quant + 50;
                setDoc(
                  checkTimeRef,
                  {
                    checktime: formattedDate,
                    daily: 1,
                  },
                  { merge: true }
                );
                updateDoc(valueRef, {
                  QuantAmount: rewardDay,
                });
                const formattedAmount = rewardDay.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                });
                setDoc(rewardsHistory, {
                  quant: 50,
                  platform: "dailycheck-in-reward",
                  Date: formattedslash,
                });
              

               
                SetMainQuantAmount(formattedAmount);
                if (typeof window !== "undefined") {
                  localStorage.setItem("QAmount", rewardDay);
                }
                setDaily(1);
                if (typeof window !== "undefined") {
                  localStorage.setItem("daily", "1");
                }
                setTimeout(() => {
                  addToQueue(`You've got +${50} QNTM`);
                }, 3000);
                console.error("Claimed");
              } else {
                setIsclaimDay(true);
              }
            } catch (error) {
              console.error(error);
            }
          }
        } else {
          const formattedDate = new Intl.DateTimeFormat("tr-TR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date());
          const [day, month, year] = formattedDate.split(".");
          const formattedslash = `${day}/${month}/${year}`;
          setDoc(
            checkTimeRef,
            {
              checktime: formattedDate,
              daily: 2,
            },
            { merge: true }
          );
          const valueRef = doc(
            dbfs,
            "user",
            telegramId,
            "miningData",
            "values"
          );
          const snapshotValue = await getDoc(valueRef);
          let quant;
          if (snapshotValue.exists()) {
            quant = snapshotValue.data().QuantAmount;
          }
          const rewardDay = quant + 50;
          const formattedAmount = rewardDay.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });
          updateDoc(valueRef, {
            QuantAmount: rewardDay,
          });
          const rewardsHistory = doc(
            dbfs,
            "user",
            telegramId,
            "rewardsHistory",
            Date.now().toString()
          );

          setDoc(rewardsHistory, {
            quant: 50,
            platform: "dailycheck-in-reward",
            Date: formattedslash,
          });

        
          SetMainQuantAmount(formattedAmount);
          if (typeof window !== "undefined") {
            localStorage.setItem("QAmount", formattedAmount);
          }
          setDaily(1);
          if (typeof window !== "undefined") {
            localStorage.setItem("daily", "1");
          }
          setTimeout(() => {
            addToQueue(`You've got +${50} QNTM`);
          }, 3000);
        }
      } catch (error) {
        if (error as Error) {
          console.error((error as Error).message);
        }
      } finally {
        setLoadingDay(false);
        setIsclaimDay(true);
      }
    };
    claim();
  }

  const addToQueue = (message: string) => {
    setToastQueue((prev) => [...prev, message]);
  };

  useEffect(() => {
    if (!processing && toastQueue.length > 0) {
      setProcessing(true);
      const currentMessage = toastQueue[0];
      toast.success(currentMessage, { duration: 3000 });
      const timer = setTimeout(() => {
        setToastQueue((prev) => prev.slice(1));
        setProcessing(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastQueue, processing]);

  const TaskTimer = () => {
    const now = new Date();
    const tomorrowMidnightUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0
      )
    );

    const tomorrowMidnightUTCTimestamp = tomorrowMidnightUTC.getTime();
    const [remainingTime, setRemainingTime] = useState(
      calculateRemainingTime(tomorrowMidnightUTCTimestamp)
    );

    useEffect(() => {
      const interval = setInterval(() => {
        setRemainingTime(calculateRemainingTime(tomorrowMidnightUTCTimestamp));
      }, 1000);

      return () => clearInterval(interval);
    }, [tomorrowMidnightUTCTimestamp]);

    return <div>{remainingTime}</div>;
  };
  return (
    <div className="flex flex-col">
      <ClaimToaster />
      <TabsSwitch />
      {/*<ConnectWallet
        walletAddress={walletAddress}
        formatAddress={formatAddress}
        handleWalletAction={handleWalletAction}
        setActiveWalletTab={setActiveWalletTab}
      />*/}

      <QntmBalance
        MainQuantAmount={MainQuantAmount}
        rank={rank}
        getRankIcon={getRankIcon}
      />
      {/*daily check-in*/}
      <DailyCheckIn
        loadingButtonDay={loadingButtonDay}
        daily={daily}
        isClaimDay={isClaimDay}
        loadingDay={loadingDay}
        ClaimDaily={ClaimDaily}
        lottieRef={lottieRef}
        TaskTimer={TaskTimer}
      />

      <HomeCarousel />

 

      <SolveToEarnCard
        remainingSolveToEarn={remainingSolveToEarn}
        lottieRef={lottieRef}
        goToSolveToEarn={goToSolveToEarn}
      />

      <AnimatePresence>
        {/*Wallet Tab */}
        {isActiveWalletTab && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-black/50 flex justify-center items-end z-50 fixed inset-0"
            onClick={() => setActiveWalletTab(false)}
          >
            <motion.div
              initial={{ y: "50%" }}
              animate={{ y: 30 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-black rounded-t-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center border-b border-b-[#303031] p-4">
                <div className="flex-1 text-center font-semibold text-xl">
                  Wallet
                </div>
                <button
                  onClick={() => setActiveWalletTab(false)}
                  className="cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1.3em"
                    height="1.3em"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#606060"
                      d="m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275t.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275z"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex justify-between items-center bg-[#202021] rounded-xl p-4 w-[20rem] mx-auto mt-4">
                <div className="flex flex-col">
                  <div className="font-medium text-base text-green-500">
                    Active wallet
                  </div>
                  <div className="font-medium text-base">
                    {toUserFriendlyAddress(walletAddress || "").slice(0, 4)}...
                    {toUserFriendlyAddress(walletAddress || "").slice(-4)}
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="2em"
                  height="2em"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#22c55e"
                    d="M23 12c0 6.075-4.925 11-11 11S1 18.075 1 12S5.925 1 12 1s11 4.925 11 11M9.305 18.11l9.402-9.403l-1.414-1.414l-7.883 7.883l-2.476-3.01l-1.511 1.31l3.882 4.633z"
                  />
                </svg>
              </div>
              <div className="flex items-center justify-center mt-4">
                <button
                  onClick={() => {
                    setActiveWalletTab(false);
                    handleWalletAction();
                  }}
                  className="bg-red-500 px-3 py-3 rounded-xl w-[20rem] mx-auto cursor-pointer"
                >
                  <div className="flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="1.2em"
                      height="1.2em"
                      className="mr-1"
                      viewBox="0 0 1024 1024"
                    >
                      <path
                        fill="currentColor"
                        d="M832.6 191.4c-84.6-84.6-221.5-84.6-306 0l-96.9 96.9l51 51l96.9-96.9c53.8-53.8 144.6-59.5 204 0c59.5 59.5 53.8 150.2 0 204l-96.9 96.9l51.1 51.1l96.9-96.9c84.4-84.6 84.4-221.5-.1-306.1M446.5 781.6c-53.8 53.8-144.6 59.5-204 0c-59.5-59.5-53.8-150.2 0-204l96.9-96.9l-51.1-51.1l-96.9 96.9c-84.6 84.6-84.6 221.5 0 306s221.5 84.6 306 0l96.9-96.9l-51-51zM260.3 209.4a8.03 8.03 0 0 0-11.3 0L209.4 249a8.03 8.03 0 0 0 0 11.3l554.4 554.4c3.1 3.1 8.2 3.1 11.3 0l39.6-39.6c3.1-3.1 3.1-8.2 0-11.3z"
                      />
                    </svg>
                    Disconnect
                  </div>
                </button>
              </div>
              <div className="flex items-center justify-center mt-4">
                <button
                  onClick={() => setActiveWalletTab(false)}
                  className="bg-white text-black px-3 py-3 rounded-xl w-[20rem] mx-auto cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="h-[10vh]"></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default HomeContent;
