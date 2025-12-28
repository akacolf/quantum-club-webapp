"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { dbfs } from "@/app/(firebase)/client";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { useWallet } from "@/app/wallet/WalletContext";
import { formatCompactNumber } from "@/lib/jetton-operations";
import { FEE_CONFIG } from "@/lib/platform-config";
import { useRouter } from "next/navigation";

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
        <Card className="bg-white/5 border-white/10 overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Icon icon="solar:money-bag-bold" className="w-5 h-5 text-primary" />
                        Creator Earnings
                    </CardTitle>
                    <Badge className="bg-primary/15 text-primary border-0">
                        {FEE_CONFIG.creatorFeePercent}% per trade
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Total Earnings Summary */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Total Estimated Earnings</p>
                            <p className="text-2xl font-bold text-white">
                                {formatCompactNumber(totalEarnings, 4)} TON
                            </p>
                            {tonPrice && (
                                <p className="text-sm text-muted-foreground">
                                    ≈ ${formatCompactNumber(totalEarnings * tonPrice, 2)}
                                </p>
                            )}
                        </div>
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon icon="solar:wallet-money-bold" className="w-7 h-7 text-primary" />
                        </div>
                    </div>
                </div>

                {/* Token Earnings List */}
                {earnings.length === 0 ? (
                    <div className="text-center py-6">
                        <Icon icon="solar:rocket-2-bold" className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground mb-2">No tokens created yet</p>
                        <p className="text-xs text-muted-foreground">
                            Create a token to start earning {FEE_CONFIG.creatorFeePercent}% on every trade
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground font-medium">Your Tokens</p>
                        {earnings.map((token) => (
                            <div
                                key={token.tokenId}
                                onClick={() => router.push(`/trade/${token.tokenId}`)}
                                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {/* Token Icon */}
                                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden relative">
                                        {token.tokenImage ? (
                                            <Image
                                                src={token.tokenImage}
                                                alt={token.tokenName}
                                                fill
                                                className="object-cover"
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
                                            <p className="font-medium text-white truncate">{token.tokenName}</p>
                                            <span className="text-xs text-muted-foreground">${token.tokenSymbol}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {token.tradeCount} trades · {formatCompactNumber(token.totalVolume, 2)} TON volume
                                        </p>
                                    </div>

                                    {/* Earnings */}
                                    <div className="text-right">
                                        <p className="font-medium text-primary">
                                            +{formatCompactNumber(token.estimatedEarnings, 4)} TON
                                        </p>
                                        {tonPrice && (
                                            <p className="text-xs text-muted-foreground">
                                                ≈ ${formatCompactNumber(token.estimatedEarnings * tonPrice, 2)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info Footer */}
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start gap-2">
                        <Icon icon="solar:info-circle-bold" className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                            Creator fees ({FEE_CONFIG.creatorFeePercent}%) are sent directly to your wallet on every trade. 
                            Earnings shown are estimates based on trading volume.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
