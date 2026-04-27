"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import {
  useMiningDataQuery,
  useSolveToEarnMutation,
  useClaimDailyMutation,
} from "@/app/(hooks)/queries/use-mining-data";
import { useSpotTokens, useSpotTokensByMarketCap } from "@/app/(hooks)/queries/use-spot-trading";
import { useTrendingTokens, useNewTokens, useGraduatedTokens } from "@/app/(hooks)/queries/use-trading";
import { useWallet } from "@/app/wallet/WalletContext";
import { formatPrice } from "@/lib/jetton-operations";
import { TokenImageFill } from "@/components/ui/token-image";
import { DEFAULT_GRADUATION_THRESHOLD_TON } from "@/types/trading";
import type { Token } from "@/types/trading";
import type { SpotToken } from "@/types/spot-trading";
import { Skeleton } from "@/components/ui/skeleton";

// Critical above-fold components - load synchronously
import PersonalizedGreeting from "./(components)/PersonalizedGreeting";

// Below-fold / interactive components - lazy load for better FCP/LCP
const HomeCarousel = dynamic(() => import("@/app/home/(components)/homepagecarousel/Carousel"), {
  ssr: false,
  loading: () => <div className="w-[90%] mx-auto h-44 bg-[#1a1a1a] rounded-xl animate-pulse" />
});

const DailyCheckIn = dynamic(() => import("./(components)/DailyCheck"), {
  ssr: false,
  loading: () => <div className="w-[90%] mx-auto h-16 sm:h-20 bg-[#1a1a1a] rounded-xl animate-pulse" />
});

const QntmBalance = dynamic(() => import('./(components)/QntmBalance'), {
  ssr: false,
  loading: () => <div className="w-[90%] mx-auto h-32 bg-[#1a1a1a] rounded-xl animate-pulse" />
});

const MarketPulse = dynamic(() => import('./(components)/MarketPulse'), {
  ssr: false,
  loading: () => (
    <div className="w-full overflow-x-auto hide-scrollbar">
      <div className="flex w-max max-w-none gap-2.5 px-[5vw] pb-2">
        <div className="h-10 w-36 shrink-0 rounded-xl bg-[#1a1a1a] animate-pulse" />
        <div className="h-10 w-40 shrink-0 rounded-xl bg-[#1a1a1a] animate-pulse" />
        <div className="h-10 w-44 shrink-0 rounded-xl bg-[#1a1a1a] animate-pulse" />
      </div>
    </div>
  )
});


const SpotTokenCard = dynamic(() => import("@/app/ecosystem/trade/spot/(components)/SpotTokenCard"), {
  ssr: false,
  loading: () => <div className="h-16 bg-[#1a1a1a] rounded-xl animate-pulse" />
});
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

function getTomorrowMidnightUTC() {
  const now = new Date();
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  );
}

const TaskTimerComponent: React.FC = () => {
  const [remainingTime, setRemainingTime] = useState(
    calculateRemainingTime(getTomorrowMidnightUTC())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(calculateRemainingTime(getTomorrowMidnightUTC()));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return <div>{remainingTime}</div>;
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

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const HomeContent = () => {
  const router = useRouter();

  useEffect(() => {
    window.scrollTo(0, 0);
    const tg = window.Telegram?.WebApp;
    tg?.disableClosingConfirmation();
  }, []);

  // Prefetch subpages for faster navigation
  useEffect(() => {
    router.prefetch("/home/rewardshistory");
    router.prefetch("/home/roadmap");
  }, [router]);

  const {
    username,
    MainQuantAmount,
    SetMainQuantAmount,
    rank,
    telegramId,
    daily,
    setDaily,
    setRemainingSolveToEarn,
    remainingSolveToEarn,
    _hasHydrated,
  } = useUserContext();

  // ---------- Mining data query (replaces multiple useEffect + getDoc) ----------
  const { data: miningData, isLoading: loadingButtonDay } = useMiningDataQuery(telegramId);

  // Sync query results to Zustand store
  useEffect(() => {
    if (!miningData) return;

    setRemainingSolveToEarn(miningData.values.remainingSolveToEarn);
    sessionStorage.setItem(
      "remainingSolveToEarn",
      String(miningData.values.remainingSolveToEarn),
    );

    // Sync daily from Firestore into Zustand
    setDaily(miningData.checkTime.daily);
    if (telegramId) {
      localStorage.setItem(`daily_${telegramId}`, String(miningData.checkTime.daily));
    }
  }, [miningData, setRemainingSolveToEarn, setDaily, telegramId]);

  // Prefetch solve-to-earn route when passes are available
  useEffect(() => {
    if (remainingSolveToEarn > 0) {
      router.prefetch("/earn/solvetoearn");
    }
  }, [remainingSolveToEarn, router]);

  // Derive claim state from query data
  const isClaimDay = miningData?.isClaimedToday ?? true;

  // ---------- Solve-to-earn mutation ----------
  const solveToEarnMutation = useSolveToEarnMutation(telegramId);

  async function goToSolveToEarn() {
    const taskElement = document.getElementById("solvetoearnbutton");
    if (taskElement) {
      (taskElement as HTMLButtonElement).disabled = true;
    }

    try {
      const newRemaining = await solveToEarnMutation.mutateAsync();
      setRemainingSolveToEarn(newRemaining);
      sessionStorage.setItem("remainingSolveToEarn", String(newRemaining));
      router.push("/earn/solvetoearn");
    } catch {
      // Re-enable button on failure
      if (taskElement) {
        (taskElement as HTMLButtonElement).disabled = false;
      }
    }
  }

  // ---------- Daily claim mutation ----------
  const claimDailyMutation = useClaimDailyMutation(telegramId, {
    setDaily,
    SetMainQuantAmount,
    setRemainingSolveToEarn,
  });

  async function ClaimDaily() {
    if (!telegramId) return;
    claimDailyMutation.mutate({
      telegramId,
      currentDaily: daily,
    });
  }

  const loadingDay = claimDailyMutation.isPending;

  const TaskTimer = TaskTimerComponent;
  const { walletAddress, totalUsdBalance, isLoadingAssets } = useWallet();

  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  const tgFirstName = (() => {
    if (!mounted) return "Quantum User";
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    return tgUser?.first_name || username || "Quantum User";
  })();

  const GREETING_PAIRS = [
    { greeting: "Welcome back to Quantum Club", subtext: "What would you like to do today?" },
    { greeting: "Ready to make some moves", subtext: "What's on the agenda today?" },
    { greeting: "It's about time", subtext: "Let's make it happen." },
    { greeting: "Great to see you again", subtext: "Anything catches your eye?" },
    { greeting: "Let's build the future together", subtext: "What's on your mind today?" },
  ];

  const [greetingIndex] = useState(() => {
    // Pick a random index, avoiding the last-used one stored in sessionStorage
    const lastIndex = parseInt(sessionStorage.getItem("qc_last_greeting_idx") ?? "-1", 10);
    let idx: number;
    do {
      idx = Math.floor(Math.random() * GREETING_PAIRS.length);
    } while (idx === lastIndex && GREETING_PAIRS.length > 1);
    sessionStorage.setItem("qc_last_greeting_idx", String(idx));
    return idx;
  });

  const greetingText = GREETING_PAIRS[greetingIndex].greeting;
  const subtext = GREETING_PAIRS[greetingIndex].subtext;

  return (
    <div className="flex flex-col min-h-screen pb-16 pt-6 gap-6">
      <PersonalizedGreeting />
      
      <div className="w-[90%] mx-auto">
        <p className="text-[20px] font-bold text-white leading-tight tracking-tight">
          {greetingText}, {tgFirstName}.
        </p>
        <p className="text-[14px] text-neutral-400 mt-1">
          {subtext}
        </p>
      </div>

      {/* Live crypto ticker */}
      <MarketPulse />

      <div className="w-[90%] mx-auto">
        <QntmBalance
          MainQuantAmount={MainQuantAmount}
          rank={rank}
          getRankIcon={getRankIcon}
          isLoading={!_hasHydrated}
          walletUsdBalance={walletAddress ? totalUsdBalance : "0.00"}
          isWalletLoading={!!walletAddress && isLoadingAssets}
          hasWallet={!!walletAddress}
        />
        
        <div className="mt-6 flex gap-3 w-full">
          <Link href="/wallet/receive" className="flex-1">
            <Button className="w-full h-11 rounded-xl font-bold text-sm bg-white text-black hover:bg-white/90 shadow-lg border-0 flex items-center justify-center gap-2 transition-all">
              <Icon icon="lucide:arrow-down" width="18" height="18" />
              Deposit
            </Button>
          </Link>

          <Link href="/ecosystem/trade" className="flex-1">
            <Button className="w-full h-11 rounded-xl font-bold text-sm bg-[#1a1a1a] text-white hover:bg-[#222] flex items-center justify-center gap-2 transition-all">
              <Icon icon="lucide:arrow-left-right" width="18" height="18" />
              Trade
            </Button>
          </Link>
        </div>

        <div className="flex items-start justify-between mt-6 w-full max-w-[380px] mx-auto px-1">
          <button 
            id="solvetoearnbutton"
            onClick={() => goToSolveToEarn()} 
            className="flex flex-col items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer w-fit disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#111] flex items-center justify-center shadow-sm relative">
              <Icon icon="lucide:brain" width="20" height="20" />
              {remainingSolveToEarn > 0 && (
                <Badge className="absolute -top-2 -right-2 px-1.5 py-0 text-[10px] font-bold rounded-full bg-white text-black hover:bg-white border-[2px] border-black leading-none flex items-center justify-center min-w-[18px] min-h-[18px]">
                  {remainingSolveToEarn}
                </Badge>
              )}
            </div>
            <span className="text-[11px] font-medium tracking-wide">Solve</span>
          </button>

          <Link href="/home/rewardshistory" className="flex flex-col items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer w-fit">
            <div className="w-12 h-12 rounded-2xl bg-[#111] flex items-center justify-center shadow-sm">
              <Icon icon="lucide:history" width="20" height="20" />
            </div>
            <span className="text-[11px] font-medium tracking-wide">History</span>
          </Link>

          <Link href="/ecosystem/chat" className="flex flex-col items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer w-fit">
            <div className="w-12 h-12 rounded-2xl bg-[#111] flex items-center justify-center shadow-sm">
              <Icon icon="lucide:message-circle" width="20" height="20" />
            </div>
            <span className="text-[11px] font-medium tracking-wide">Chat</span>
          </Link>

          <Link href="/ecosystem/chat/qc-ai" className="flex flex-col items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer w-fit">
            <div className="w-12 h-12 rounded-2xl bg-[#111] flex items-center justify-center shadow-sm relative">
              <Icon icon="lucide:sparkles" width="20" height="20" />
            </div>
            <span className="text-[11px] font-medium tracking-wide">AI</span>
          </Link>

          <button disabled className="flex flex-col items-center gap-1.5 text-neutral-500 transition-colors cursor-not-allowed w-fit opacity-60">
            <div className="w-12 h-12 rounded-2xl bg-[#111] flex items-center justify-center shadow-sm relative">
              <Icon icon="lucide:pen-line" width="20" height="20" />
              <Badge className="absolute -top-2 -right-3 px-1 py-0 text-[8px] font-bold rounded-full bg-[#333] text-white hover:bg-[#333] border-[2px] border-black leading-none flex items-center justify-center min-h-[16px]">
                SOON
              </Badge>
            </div>
            <span className="text-[11px] font-medium tracking-wide">Post</span>
          </button>
        </div>
      </div>

      <div>
        <DailyCheckIn
          loadingButtonDay={loadingButtonDay}
          daily={daily}
          isClaimDay={isClaimDay}
          loadingDay={loadingDay}
          ClaimDaily={ClaimDaily}
          TaskTimer={TaskTimer}
        />
      </div>

      <div>
        <HomeCarousel />
      </div>

      <SpotTokensSection />
    </div>
  );
};

// ─── Favorites persistence ────────────────────────────────────────────
const FAVORITES_KEY = "qc_favorite_spot_tokens";

function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch { return []; }
}

function setFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

// ─── Compact card for RocketStart tokens ──────────────────────────────
function RocketStartTokenCard({ token, index }: { token: Token; index: number }) {
  const progress = (() => {
    try {
      const mcTon = Number(BigInt(token.tonReserve || token.marketCap || "0")) / 1e9;
      const total = Number(token.graduationThreshold || DEFAULT_GRADUATION_THRESHOLD_TON);
      if (total <= 0) return 0;
      return Math.min((mcTon / total) * 100, 100);
    } catch { return 0; }
  })();

  return (
    <Link href={`/ecosystem/trade/${token.id}`} prefetch={true}>
      <div className="flex gap-3 items-center py-3 cursor-pointer group">
        <div className="relative w-11 h-11 rounded-full overflow-hidden bg-[#222] shadow-inner ring-1 ring-white/5 flex-shrink-0">
          {token.image ? (
            <TokenImageFill src={token.image} alt={token.name} className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary font-bold text-sm">
              {token.symbol.slice(0, 2)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-white text-sm leading-tight truncate">{token.symbol}</h3>
            {token.isGraduated && (
              <Badge className="bg-green-500/20 text-green-400 text-[8px] px-1 py-0 h-3.5 border-0 shrink-0">DEX</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="h-1 flex-1 bg-[#333] rounded-full overflow-hidden max-w-[80px]">
              <div
                className={`h-full rounded-full ${progress >= 100 ? "bg-green-500" : "bg-white/70"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[9px] text-neutral-500 font-medium">{progress.toFixed(0)}%</span>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="font-semibold text-white text-sm tracking-tight">
            {formatPrice(BigInt(token.currentPrice || "0"))}
          </div>
          <div className="text-[10px] text-neutral-500 font-medium">
            {token.trades || 0} trade{(token.trades || 0) !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Tab configuration ────────────────────────────────────────────────
type SpotTab = "spot" | "favorites" | "mc" | "hot" | "new" | "dex";

const TAB_SUBTITLES: Record<SpotTab, string> = {
  spot: "Trade tokens on the go",
  favorites: "Your saved tokens",
  mc: "Top tokens by Market Cap",
  hot: "Most traded right now",
  new: "Recently launched on RocketStart",
  dex: "Graduated to DEX",
};

// ─── Section component ───────────────────────────────────────────────
function SpotTokensSection() {
  const [activeTab, setActiveTab] = useState<SpotTab>("spot");
  const [favoriteIds, setFavoriteIds] = useState<string[]>(getFavorites);

  // Data sources
  const { data: spotTokens, isLoading: spotLoading } = useSpotTokens();
  const { data: marketCapTokens, isLoading: marketCapLoading } = useSpotTokensByMarketCap(activeTab === "mc");
  const trendingQuery = useTrendingTokens();
  const newQuery = useNewTokens();
  const graduatedQuery = useGraduatedTokens();

  const trendingTokens = trendingQuery.data?.pages.flatMap(p => p.tokens) ?? [];
  const newTokens = newQuery.data?.pages.flatMap(p => p.tokens) ?? [];
  const graduatedTokens = graduatedQuery.data?.pages.flatMap(p => p.tokens) ?? [];

  // Favorites: filter spot tokens by saved IDs
  const favoriteTokens = (spotTokens ?? []).filter(t => favoriteIds.includes(t.contractAddress));

  const toggleFavorite = useCallback((contractAddress: string) => {
    setFavoriteIds(prev => {
      const next = prev.includes(contractAddress)
        ? prev.filter(id => id !== contractAddress)
        : [...prev, contractAddress];
      setFavorites(next);
      return next;
    });
  }, []);

  // Determine loading state
  const isLoading = activeTab === "spot" ? spotLoading
    : activeTab === "favorites" ? spotLoading
    : activeTab === "mc" ? marketCapLoading
    : activeTab === "hot" ? trendingQuery.isLoading
    : activeTab === "new" ? newQuery.isLoading
    : graduatedQuery.isLoading;

  // Render the appropriate token list
  const renderTokenList = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center w-full">
              <Skeleton className="w-8 h-8 flex-shrink-0 bg-transparent" />
              <div className="flex-1 min-w-0 rounded-lg p-2">
                <div className="flex gap-3 items-center">
                  <Skeleton className="w-11 h-11 rounded-full bg-[#222]" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-16 bg-[#1a1a1a]" />
                    <Skeleton className="h-3 w-28 mt-2 bg-[#1a1a1a]" />
                  </div>
                  <div className="flex flex-col items-end">
                    <Skeleton className="h-4 w-16 bg-[#1a1a1a]" />
                    <Skeleton className="h-3 w-12 mt-2 bg-[#1a1a1a]" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "spot") {
      if ((spotTokens ?? []).length === 0) {
        return (
          <div className="text-center py-8">
            <Icon icon="lucide:inbox" width="28" height="28" className="mx-auto text-neutral-600 mb-2" />
            <p className="text-sm text-neutral-500">No tokens available</p>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          {(spotTokens ?? []).slice(0, 10).map((token, index) => {
            const isFav = favoriteIds.includes(token.contractAddress);
            return (
              <div key={token.contractAddress} className="flex items-center w-full">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(token.contractAddress); }}
                  className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                >
                  <Icon icon="lucide:star" width="16" height="16" className={isFav ? "fill-yellow-400 text-yellow-400" : "text-neutral-600"} />
                </button>
                <div className="flex-1 min-w-0">
                  <SpotTokenCard token={token} index={index} isTransparent={true} />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeTab === "mc") {
      const mcTokens = marketCapTokens ?? [];
      if (mcTokens.length === 0) {
        return (
          <div className="text-center py-8">
            <Icon icon="lucide:inbox" width="28" height="28" className="mx-auto text-neutral-600 mb-2" />
            <p className="text-sm text-neutral-500">No tokens available</p>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          {mcTokens.slice(0, 10).map((token, index) => {
            const isFav = favoriteIds.includes(token.contractAddress);
            return (
              <div key={token.contractAddress} className="flex items-center w-full">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(token.contractAddress); }}
                  className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                >
                  <Icon icon="lucide:star" width="16" height="16" className={isFav ? "fill-yellow-400 text-yellow-400" : "text-neutral-600"} />
                </button>
                <div className="flex-1 min-w-0">
                  <SpotTokenCard token={token} index={index} isTransparent={true} />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeTab === "favorites") {
      if (favoriteTokens.length === 0) {
        return (
          <div className="text-center py-8">
            <Icon icon="lucide:star" width="28" height="28" className="mx-auto text-neutral-600 mb-2" />
            <p className="text-sm text-neutral-500">No favorites yet</p>
            <p className="text-[11px] text-neutral-600 mt-1">Switch to Hot and tap the star to save tokens</p>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          {favoriteTokens.slice(0, 10).map((token, index) => (
            <div key={token.contractAddress} className="flex items-center w-full">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(token.contractAddress); }}
                className="w-8 h-8 flex items-center justify-center flex-shrink-0"
              >
                <Icon icon="lucide:star" width="16" height="16" className="fill-yellow-400 text-yellow-400" />
              </button>
              <div className="flex-1 min-w-0">
                <SpotTokenCard token={token} index={index} isTransparent={true} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    // RocketStart tabs (Hot, New, DEX)
    const tokens: Token[] = activeTab === "hot" ? trendingTokens
      : activeTab === "new" ? newTokens
      : graduatedTokens;

    if (tokens.length === 0) {
      return (
        <div className="text-center py-8">
          <Icon icon="lucide:inbox" width="28" height="28" className="mx-auto text-neutral-600 mb-2" />
          <p className="text-sm text-neutral-500">No tokens found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {tokens.slice(0, 10).map((token, index) => (
          <RocketStartTokenCard key={token.id} token={token} index={index} />
        ))}
      </div>
    );
  };

  // View-all links for each tab
  const viewAllHref = activeTab === "spot" ? "/ecosystem/trade/spot"
    : activeTab === "favorites" ? "/ecosystem/trade/spot"
    : activeTab === "mc" ? "/ecosystem/trade/spot"
    : activeTab === "hot" ? "/ecosystem/trade"
    : activeTab === "new" ? "/ecosystem/trade"
    : "/ecosystem/trade";

  return (
    <div className="w-[90%] mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-white">Trading</h2>
          <p className="text-[11px] text-neutral-400 mt-0.5">{TAB_SUBTITLES[activeTab]}</p>
        </div>
      </div>

      <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-x-auto pb-3 [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max items-center gap-1 px-[5vw]">
          {([
            { id: "favorites" as SpotTab, label: "Favorites", icon: "lucide:star" },
            { id: "spot" as SpotTab, label: "Spot" },
            { id: "mc" as SpotTab, label: "MC" },
            { id: "hot" as SpotTab, label: "Hot" },
            { id: "new" as SpotTab, label: "New", dot: true },
            { id: "dex" as SpotTab, label: "DEX" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors shrink-0 relative ${
                activeTab === tab.id
                  ? "bg-[#222] text-white"
                  : "text-neutral-400 hover:text-white bg-transparent"
              }`}
            >
              {tab.icon && activeTab === tab.id && (
                <Icon icon={tab.icon} width="13" height="13" className="fill-white" />
              )}
              {tab.label}
              {tab.dot && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {renderTokenList()}

      <Button asChild className="w-full mt-4 h-11 rounded-xl font-bold text-sm bg-[#1a1a1a] text-white hover:bg-[#222] border-0 flex items-center justify-center gap-2 transition-all">
        <Link href={viewAllHref}>
          View all
          <Icon icon="lucide:arrow-right" width="16" height="16" />
        </Link>
      </Button>
    </div>
  );
}

export default HomeContent;
