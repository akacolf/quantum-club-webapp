import { ReactNode } from "react";
import { LottieRefCurrentProps } from "lottie-react";
import { JSX } from "react";

export interface TaskHistory {
    id: string;
    quant: number;
    date: string;
    platform: ReactNode;
    title: string;
  }

export interface Referral {
    id: string;
    username: string;
    quantamount:number;
}

export interface EarnTask {
  id: string;
  description:string | React.ReactNode;
  completed:boolean;
  category:string;
  platform:React.ReactNode;
  buttontitle:string;
  buttonText:React.ReactNode|string;
  url:string |undefined;
  quant:number;
  whichPlatform:string;
  timestamp:number;
}

export interface ConnectWalletButtonProps {
    walletAddress: string | null;
    formatAddress: (address: string) => string;
    handleWalletAction: () => void;
    setActiveWalletTab: (active: boolean) => void;
}

export interface DailyCheckInProps {
    loadingButtonDay: boolean;
    daily: number;
    isClaimDay: boolean;
    loadingDay: boolean;
    ClaimDaily: () => void;
    lottieRef: React.RefObject<LottieRefCurrentProps | null>;
    TaskTimer: React.FC;
}

export interface QntmBalanceProps {
    MainQuantAmount: string;
    rank: string | null;
    getRankIcon: (rank: string | null) => JSX.Element | null;
}

export interface SolveToEarnCardProps {
    remainingSolveToEarn: number;
    lottieRef: React.RefObject<LottieRefCurrentProps | null>;
    goToSolveToEarn: () => void;
}