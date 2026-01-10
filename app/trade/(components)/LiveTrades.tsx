"use client";

/**
 * On-Chain Live Trades Component
 * Fetches trade data directly from blockchain transactions via TONAPI
 * No Firebase dependency - truly on-chain!
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icon } from "@iconify/react";
import { useWallet } from "@/app/wallet/WalletContext";
import { formatCompactNumber } from "@/lib/jetton-operations";

interface Trade {
    id: string;
    type: "buy" | "sell";
    walletAddress: string;
    tokenAmount: number;
    tonAmount: number;
    timestamp: Date;
    hash: string;
}

interface LiveTradesProps {
    tokenId: string;
    tokenSymbol: string;
    jettonAddress?: string;
}

export default function LiveTrades({ tokenSymbol, jettonAddress }: LiveTradesProps) {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { tonPrice, isTestnet } = useWallet();

    useEffect(() => {
        if (!jettonAddress) {
            setIsLoading(false);
            return;
        }

        const fetchOnChainTrades = async () => {
            try {
                // Fetch recent transactions from TONAPI
                const baseUrl = isTestnet 
                    ? "https://testnet.tonapi.io" 
                    : "https://tonapi.io";
                    
                const response = await fetch(
                    `${baseUrl}/v2/blockchain/accounts/${jettonAddress}/transactions?limit=50`
                );

                if (!response.ok) {
                    console.log("Failed to fetch on-chain transactions");
                    setIsLoading(false);
                    return;
                }

                const data = await response.json();
                const tradeEvents: Trade[] = [];

                // Parse transactions for buy/sell events
                // Buy: op 0xaf750d34
                // Sell/Burn notification: op 0x7bdd97de (burn_notification) or 0xb7e76bfd (sell_notification)
                for (const tx of data.transactions || []) {
                    if (!tx.success) continue;

                    const inMsg = tx.in_msg;
                    if (!inMsg?.op_code) continue;

                    const timestamp = new Date(tx.utime * 1000);
                    const hash = tx.hash;

                    // BUY transaction (op::buy = 0xaf750d34)
                    if (inMsg.op_code === "0xaf750d34") {
                        const tonValue = (inMsg.value || 0) / 1e9;
                        const senderAddress = inMsg.source?.address || "";
                        
                        // Look for internal_transfer in out_msgs to get token amount
                        const transferMsg = tx.out_msgs?.find(
                            (m: { op_code?: string }) => m.op_code === "0x178d4519"
                        );
                        
                        let tokenAmount = 0;
                        if (transferMsg?.decoded_body?.amount) {
                            tokenAmount = parseInt(transferMsg.decoded_body.amount) / 1e9;
                        }

                        if (tonValue > 0.01 && tokenAmount > 0) { // Filter out dust/gas transactions
                            tradeEvents.push({
                                id: hash,
                                type: "buy",
                                walletAddress: senderAddress,
                                tonAmount: tonValue,
                                tokenAmount,
                                timestamp,
                                hash,
                            });
                        }
                    }

                    // SELL transaction (burn_notification = 0x7bdd97de)
                    if (inMsg.op_code === "0x7bdd97de" || inMsg.op_code === "0xb7e76bfd") {
                        // Find the TON return message (excesses)
                        const returnMsg = tx.out_msgs?.find(
                            (m: { op_code?: string }) => 
                                m.op_code === "0xd53276db" || // excesses
                                m.op_code === "0xaf5ececd"    // alternative
                        );
                        
                        const tonValue = returnMsg ? (returnMsg.value || 0) / 1e9 : 0;
                        
                        // Token amount from decoded body
                        let tokenAmount = 0;
                        let sellerAddress = "";
                        if (inMsg.decoded_body) {
                            if (inMsg.decoded_body.amount) {
                                tokenAmount = parseInt(inMsg.decoded_body.amount) / 1e9;
                            }
                            // Seller address is in the burn notification
                            sellerAddress = inMsg.decoded_body.sender || 
                                           inMsg.decoded_body.from_address || 
                                           returnMsg?.destination?.address || "";
                        }

                        if (tonValue > 0.01 && tokenAmount > 0) { // Filter out dust
                            tradeEvents.push({
                                id: hash,
                                type: "sell",
                                walletAddress: sellerAddress,
                                tonAmount: tonValue,
                                tokenAmount,
                                timestamp,
                                hash,
                            });
                        }
                    }
                }

                // Sort by timestamp descending (newest first)
                tradeEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                setTrades(tradeEvents.slice(0, 20)); // Keep only 20 most recent
                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching on-chain trades:", error);
                setIsLoading(false);
            }
        };

        fetchOnChainTrades();
        
        // Refresh every 15 seconds for live updates
        const interval = setInterval(fetchOnChainTrades, 15000);
        return () => clearInterval(interval);
    }, [jettonAddress, isTestnet]);

    const formatTimeAgo = (date: Date) => {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return "just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const truncateAddress = (address: string) => {
        if (!address) return "Unknown";
        // Handle both raw and user-friendly address formats
        if (address.length > 20) {
            return `${address.slice(0, 4)}...${address.slice(-4)}`;
        }
        return address;
    };

    const openTonviewer = (hash: string) => {
        const baseUrl = isTestnet 
            ? "https://testnet.tonviewer.com" 
            : "https://tonviewer.com";
        window.open(`${baseUrl}/transaction/${hash}`, "_blank");
    };

    if (isLoading) {
        return (
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Icon icon="solar:transfer-horizontal-bold" className="w-5 h-5 text-primary animate-pulse" />
                        <h3 className="font-semibold text-white">Live Trades</h3>
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-[9px] ml-auto">
                            ON-CHAIN
                        </Badge>
                    </div>
                    <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                        <Icon icon="solar:refresh-bold" className="w-4 h-4 animate-spin mr-2" />
                        Loading from blockchain...
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!jettonAddress) {
        return (
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Icon icon="solar:transfer-horizontal-bold" className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-white">Live Trades</h3>
                    </div>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Icon icon="solar:danger-triangle-bold" className="w-8 h-8 text-orange-400/50 mb-2" />
                        <p className="text-muted-foreground text-sm">Contract not deployed</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (trades.length === 0) {
        return (
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Icon icon="solar:transfer-horizontal-bold" className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-white">Live Trades</h3>
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-[9px] ml-auto">
                            ON-CHAIN
                        </Badge>
                    </div>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Icon icon="solar:inbox-bold" className="w-8 h-8 text-muted-foreground/50 mb-2" />
                        <p className="text-muted-foreground text-sm">No trades yet</p>
                        <p className="text-muted-foreground/60 text-xs">Be the first to trade!</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Icon icon="solar:transfer-horizontal-bold" className="w-5 h-5 text-primary" />
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        </div>
                        <h3 className="font-semibold text-white">Live Trades</h3>
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-[9px]">
                            ON-CHAIN
                        </Badge>
                    </div>
                    <Badge variant="secondary" className="bg-white/5 text-xs">
                        {trades.length} trades
                    </Badge>
                </div>

                <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                        {trades.map((trade, index) => {
                            const isBuy = trade.type === "buy";
                            const tokenAmountFormatted = formatCompactNumber(trade.tokenAmount, 2);
                            const tonValue = trade.tonAmount;
                            const usdValue = tonValue * (tonPrice || 5);
                            const tonAmountFormatted = formatCompactNumber(tonValue, 2);
                            const usdAmountFormatted = formatCompactNumber(usdValue, 0);

                            return (
                                <button
                                    key={trade.id}
                                    onClick={() => openTonviewer(trade.hash)}
                                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] transition-colors text-left"
                                    style={{
                                        animation: index === 0 ? "fadeIn 0.3s ease-out" : undefined,
                                    }}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBuy
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-red-500/20 text-red-400"
                                                }`}
                                        >
                                            <Icon
                                                icon={isBuy ? "solar:graph-up-bold" : "solar:graph-down-bold"}
                                                className="w-4 h-4"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-xs font-medium ${isBuy ? "text-green-400" : "text-red-400"}`}>
                                                    {isBuy ? "Buy" : "Sell"}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {truncateAddress(trade.walletAddress)}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                {formatTimeAgo(trade.timestamp)}
                                                <Icon icon="solar:link-bold" className="w-2.5 h-2.5 opacity-50" />
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xs font-medium text-white">
                                            {tokenAmountFormatted} {tokenSymbol}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {tonAmountFormatted} TON • ${usdAmountFormatted}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
