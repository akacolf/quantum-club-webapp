"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

export default function BetaWaitlistPage() {
    useTelegramBackButton("/");

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon icon="solar:rocket-bold" className="w-10 h-10 text-primary" />
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-white mb-2">
                        QC RocketStart Beta
                    </h1>
                    
                    <p className="text-muted-foreground mb-6">
                        Our token launchpad is currently in private beta with limited access.
                    </p>

                    {/* Status */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Icon icon="solar:users-group-rounded-bold" className="w-5 h-5 text-amber-400" />
                            <span className="text-amber-400 font-semibold">Beta is Currently Full</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            All 100 beta spots have been claimed. Stay tuned for the public launch!
                        </p>
                    </div>

                    {/* Info */}
                    <div className="space-y-3 text-left mb-6">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                            <Icon icon="solar:gift-bold" className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-white">Free Token Creation</p>
                                <p className="text-xs text-muted-foreground">Launch your own token with zero fees</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                            <Icon icon="solar:chart-bold" className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-white">Fair Launch Bonding Curve</p>
                                <p className="text-xs text-muted-foreground">No presales, everyone gets the same price</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                            <Icon icon="solar:cup-star-bold" className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-white">Automatic DEX Graduation</p>
                                <p className="text-xs text-muted-foreground">Tokens migrate to STON.fi at 2000 TON</p>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <Button
                        className="w-full bg-primary/20 text-primary hover:bg-primary/30"
                        onClick={() => window.open("https://t.me/QuantumClubApp", "_blank")}
                    >
                        <Icon icon="logos:telegram" className="w-4 h-4 mr-2" />
                        Join Community for Updates
                    </Button>

                    <p className="text-xs text-muted-foreground mt-4">
                        Follow our Telegram for public launch announcements
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
