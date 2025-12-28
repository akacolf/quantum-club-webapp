"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { dbfs } from "@/app/(firebase)/client";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { useWallet } from "@/app/wallet/WalletContext";
import { formatCompactNumber } from "@/lib/jetton-operations";
import { FEE_CONFIG } from "@/lib/platform-config";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Minimum earnings required to claim (in TON)
const MIN_CLAIM_THRESHOLD = 1;

interface TokenEarnings {
    tokenId: string;
    tokenName: string;
    tokenSymbol: string;
    tokenImage?: string;
    totalVolume: number;
    estimatedEarnings: number;
    tradeCount: number;
    lastTradeAt?: Date;
}

export default function CreatorEarningsDashboard() {
    const { walletAddress, tonPrice } = useWallet();
    const router = useRouter();
    const [earnings, setEarnings] = useState<TokenEarnings[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);
    const [totalEarnings, setTotalEarnings] = useState(0);

    useEffect(() => {
        if (!walletAddress) {
            setIsLoading(false);
            return;
        }

        const fetchEarnings = async () => {
            try {
                // Get tokens created by this wallet
                const tokensQuery = query(
                    collection(dbfs, "tokens"),
                    where("creatorAddress", "==", walletAddress),
                    orderBy("createdAt", "desc")
                );

                const tokensSnapshot = await getDocs(tokensQuery);
                const tokenEarnings: TokenEarnings[] = [];
                let total = 0;

                for (const tokenDoc of tokensSnapshot.docs) {
                    const tokenData = tokenDoc.data();
                    const tokenId = tokenDoc.id;

                    // Get trades for this token
                    const tradesQuery = query(
                        collection(dbfs, `tokens/${tokenId}/trades`),
                        orderBy("timestamp", "desc")
                    );

                    const tradesSnapshot = await getDocs(tradesQuery);

                    let totalVolume = 0;
                    let tradeCount = 0;
                    let lastTradeAt: Date | undefined;

                    tradesSnapshot.docs.forEach((tradeDoc, index) => {
                        const tradeData = tradeDoc.data();
                        const tonAmount = parseFloat(tradeData.totalTon || "0");
                        totalVolume += tonAmount;
                        tradeCount++;

                        if (index === 0 && tradeData.timestamp) {
                            lastTradeAt = tradeData.timestamp instanceof Timestamp
                                ? tradeData.timestamp.toDate()
                                : new Date(tradeData.timestamp);
                        }
                    });

                    // Calculate estimated earnings (0.5% of volume)
                    const estimatedEarnings = totalVolume * (FEE_CONFIG.creatorFeePercent / 100);
                    total += estimatedEarnings;

                    tokenEarnings.push({
                        tokenId,
                        tokenName: tokenData.name,
                        tokenSymbol: tokenData.symbol,
                        tokenImage: tokenData.image,
                        totalVolume,
                        estimatedEarnings,
                        tradeCount,
                        lastTradeAt,
                    });
                }

                // Sort by earnings (highest first)
                tokenEarnings.sort((a, b) => b.estimatedEarnings - a.estimatedEarnings);

                setEarnings(tokenEarnings);
                setTotalEarnings(total);
            } catch (error) {
                console.error("Error fetching creator earnings:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEarnings();
    }, [walletAddress]);

    const handleClaim = async () => {
        if (totalEarnings < MIN_CLAIM_THRESHOLD) {
            toast.error(`Minimum ${MIN_CLAIM_THRESHOLD} TON required to claim`);
            return;
        }

        setIsClaiming(true);
        try {
            // Note: In a real implementation, this would be triggered by a backend
            // that verifies the earnings and sends from a contract/pool
            // For now, we show a message explaining the automatic distribution
            toast.info("Creator fees are sent directly to your wallet on each trade", {
                description: "Your earnings are automatically distributed in real-time",
                duration: 5000,
            });
        } catch (error) {
            console.error("Claim error:", error);
            toast.error("Failed to process claim");
        } finally {
            setIsClaiming(false);
        }
    };

    const canClaim = totalEarnings >= MIN_CLAIM_THRESHOLD;

    if (!walletAddress) {
        return (
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                    <Icon icon="solar:wallet-bold" className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Connect wallet to view earnings</p>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-[#1A1A1A] to-black border-white/5 shadow-xl shadow-black/50 overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <CardHeader className="pb-4 relative z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-white flex items-center gap-2 text-lg">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                <Icon icon="solar:money-bag-bold" className="w-5 h-5 text-primary" />
                            </div>
                            Creator Earnings
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1 ml-10">
                            Earn fees from your tokens
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5 relative z-10">
                {/* Total Earnings Summary */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs text-primary/80 uppercase font-bold tracking-wider mb-1">Total Earned</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-black text-white tracking-tight">
                                    {formatCompactNumber(totalEarnings, 4)} <span className="text-lg font-bold text-muted-foreground">TON</span>
                                </p>
                            </div>
                            {tonPrice && (
                                <p className="text-xs font-medium text-muted-foreground mt-1">
                                    ≈ ${formatCompactNumber(totalEarnings * tonPrice, 2)} USD
                                </p>
                            )}
                        </div>
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center ring-4 ring-primary/5">
                            <Icon icon="solar:wallet-money-bold" className="w-6 h-6 text-primary" />
                        </div>
                    </div>

                    {/* Claim Button */}
                    {totalEarnings > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <Button
                                onClick={handleClaim}
                                disabled={!canClaim || isClaiming}
                                className={`w-full h-10 font-semibold ${canClaim
                                    ? "bg-primary hover:bg-primary/90 text-black"
                                    : "bg-white/10 text-muted-foreground cursor-not-allowed"
                                    }`}
                            >
                                {isClaiming ? (
                                    <>
                                        <Icon icon="solar:spinner-bold" className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : canClaim ? (
                                    <>
                                        <Icon icon="solar:hand-money-bold" className="w-4 h-4 mr-2" />
                                        View Earnings Info
                                    </>
                                ) : (
                                    <>
                                        <Icon icon="solar:lock-keyhole-bold" className="w-4 h-4 mr-2" />
                                        Min {MIN_CLAIM_THRESHOLD} TON to claim
                                    </>
                                )}
                            </Button>
                            <p className="text-[10px] text-muted-foreground text-center mt-2">
                                Fees are automatically sent to your wallet on each trade
                            </p>
                        </div>
                    )}
                </div>

                {/* Token Earnings List */}
                {earnings.length === 0 ? (
                    <div className="text-center py-8 px-4 rounded-xl bg-white/[0.02] border border-white/5 border-dashed">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                            <Icon icon="solar:rocket-2-bold" className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-white font-medium mb-1">No earnings yet</p>
                        <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                            Launch a token and start earning {FEE_CONFIG.creatorFeePercent}% from every trade
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Your Active Tokens</p>
                            <p className="text-xs text-muted-foreground">{earnings.length} Active</p>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 -mr-2 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                            {earnings.map((token) => (
                                <div
                                    key={token.tokenId}
                                    onClick={() => router.push(`/trade/${token.tokenId}`)}
                                    className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 cursor-pointer transition-all group flex items-center gap-3"
                                >
                                    {/* Token Icon */}
                                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden relative shadow-sm">
                                        {token.tokenImage ? (
                                            <Image
                                                src={token.tokenImage}
                                                alt={token.tokenName}
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                                unoptimized={token.tokenImage.startsWith("data:")}
                                            />
                                        ) : (
                                            <span className="text-sm font-bold text-primary">
                                                {token.tokenSymbol.slice(0, 2)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Token Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-white text-sm truncate group-hover:text-primary transition-colors">{token.tokenName}</p>
                                            <span className="text-[10px] font-bold bg-white/10 text-muted-foreground px-1.5 py-0.5 rounded text-xs rounded-md">${token.tokenSymbol}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-muted-foreground">
                                                {formatCompactNumber(token.totalVolume, 2)} TON Vol
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {token.tradeCount} Trades
                                            </span>
                                        </div>
                                    </div>

                                    {/* Earnings */}
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-1 text-green-400">
                                            <span className="text-xs font-bold">+</span>
                                            <span className="font-bold text-sm">
                                                {formatCompactNumber(token.estimatedEarnings, 3)}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">TON Earned</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
