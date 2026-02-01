"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    Loader2,
    MessageCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { getMarketplaceStats } from "@/lib/nft-sale-contracts";
import { useWallet } from "../WalletContext";

// Time period options for filtering stats
type TimePeriod = "1d" | "7d" | "30d" | "all";

const TIME_PERIOD_OPTIONS = [
    { value: "1d", label: "1 Day" },
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "all", label: "All Time" },
];

export default function MarketplacePage() {
    useTelegramBackButton("/wallet");
    const { isTestnet } = useWallet();

    const [isLoading, setIsLoading] = useState(true);
    const [timePeriod, setTimePeriod] = useState<TimePeriod>("1d");

    // Fetch stats only (collections removed)
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            await getMarketplaceStats(isTestnet);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [isTestnet]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="min-h-screen bg-background text-foreground pb-28">
            <div className="px-4 pt-4 space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                >
                    <h1 className="text-2xl font-bold">NFT Marketplace</h1>
                    <p className="text-sm text-muted-foreground">
                        Discover and collect unique NFTs on TON
                    </p>
                </motion.div>

                {/* Time Period Filter */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                >
                    <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                        <SelectTrigger className="w-full bg-card border-border">
                            <SelectValue placeholder="Select time period" />
                        </SelectTrigger>
                        <SelectContent>
                            {TIME_PERIOD_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </motion.div>

                {/* Coming Soon Placeholder */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="bg-card border-border">
                        <CardContent className="p-8 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                <MessageCircle className="w-8 h-8 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-lg font-semibold">Collections are coming soon!</h2>
                                <p className="text-sm text-muted-foreground">
                                    Make sure to follow our{" "}
                                    <Link 
                                        href="https://t.me/quantumclubinc" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline font-medium"
                                    >
                                        telegram channel
                                    </Link>
                                    {" "}for updates.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>
        </div>
    );
}
