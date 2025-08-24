'use client';
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Lottie, { LottieRefCurrentProps } from "lottie-react"
import constructionAnimationData from "@/public/lottie/construction-lottie.json";
import React from "react";

export default function RewardsHistory() {
    const lottieRef = React.useRef<LottieRefCurrentProps>(null);
    useTelegramBackButton();
    return (
        <div className="flex fixed inset-0 flex-col items-center justify-center space-y-6">
            <Lottie
            lottieRef={lottieRef}
            animationData={constructionAnimationData}
            loop={2}
            autoplay={true}
            className="w-25 h-25"
            />
            <div className="text-xl text-center">Rewards history <br />is being upgraded</div>
        </div>
    )
}