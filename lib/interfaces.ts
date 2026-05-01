import type { LottieRefCurrentProps } from "lottie-react";
import { JSX } from "react";

export interface TaskHistory {
    id: string;
    quant: number;
    date: string;
    platform: string;
    title: string;
}

export interface Referral {
    id: string;
    username: string;
    quantamount: number;
    photoUrl?: string;
}

export interface EarnTask {
    id: string;
    description: string | React.ReactNode;
    completed: boolean;
    category: string;
    platform: React.ReactNode;
    buttontitle: string;
    buttonText: React.ReactNode | string;
    url: string | undefined;
    quant: number;
    whichPlatform: string;
    timestamp: number;
}

export interface DailyCheckInProps {
    loadingButtonDay: boolean;
    daily: number;
    isClaimDay: boolean;
    loadingDay: boolean;
    ClaimDaily: () => void;
    lottieRef?: React.RefObject<LottieRefCurrentProps | null>;
    TaskTimer: React.FC;
}

export interface QntmBalanceProps {
    MainQuantAmount: string;
    rank: string | null;
    getRankIcon: (rank: string | null) => JSX.Element | null;
    isLoading?: boolean;
    walletUsdBalance?: string;
    isWalletLoading?: boolean;
    hasWallet?: boolean;
    hideBalance?: boolean;
    toggleHideBalance?: () => void;
}

export interface SolveToEarnCardProps {
    remainingSolveToEarn: number;
    lottieRef?: React.RefObject<LottieRefCurrentProps | null>;
    goToSolveToEarn: () => void;
}
