"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

export default function BetaWaitlistPage() {
    useTelegramBackButton("/");

    return (
        <div className="min-h-screen bg-black pb-32">
            {/* Header */}
            <div className="pt-12 pb-8 px-6 text-center">
                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Icon icon="solar:rocket-bold" className="w-10 h-10 text-primary" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">
                    QC RocketStart
                </h1>
                <p className="text-lg font-medium text-primary mb-1">
                    Private Beta
                </p>
                <p className="text-muted-foreground text-sm px-4">
                    Trade with confidence with Quantum Club&apos;s token launchpad.
                </p>
            </div>

            {/* Status Section */}
            <div className="px-6 py-4">
                <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-8">
                    <Icon icon="solar:users-group-rounded-bold" className="w-6 h-6 text-amber-400" />
                    <div>
                        <span className="text-amber-400 font-semibold text-lg">Beta is Currently Full</span>
                        <p className="text-sm text-muted-foreground">All 100 spots have been claimed</p>
                    </div>
                </div>

                {/* Features */}
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    What&apos;s Coming
                </h2>
                
                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <Icon icon="solar:gift-bold" className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">Free Token Creation</p>
                            <p className="text-sm text-muted-foreground">Launch your token with zero platform fees (gas excluded)</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Icon icon="solar:chart-2-bold" className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">Fair Launch Bonding Curve</p>
                            <p className="text-sm text-muted-foreground">No presales — everyone trades at market price</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <Icon icon="solar:cup-star-bold" className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">Automatic DEX Graduation</p>
                            <p className="text-sm text-muted-foreground">Tokens migrate to STON.fi at 2000 TON market cap</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                            <Icon icon="solar:wallet-money-bold" className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">Creator Earnings</p>
                            <p className="text-sm text-muted-foreground">Earn 0.5% on every trade of your token</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section - shifted up with mb-20 to avoid navbar */}
            <div className="fixed bottom-20 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent">
                <Button
                    className="w-full h-14 bg-primary/10 text-primary hover:bg-primary/20 rounded-2xl text-base font-semibold border border-primary/20"
                    onClick={() => window.open("https://t.me/quantumclubinc", "_blank")}
                >
                    <Icon icon="logos:telegram" className="w-5 h-5 mr-2" />
                    Join Community for Updates
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                    Get notified when public launch begins
                </p>
            </div>
        </div>
    );
}
