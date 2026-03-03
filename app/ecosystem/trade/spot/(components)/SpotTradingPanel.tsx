"use client";

import { env } from "@/env";
import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useWallet } from "@/app/wallet/WalletContext";
import { toast } from "sonner";
import { simulateSwap, toUnits, fromUnits, TON_ADDRESS } from "@/lib/stonfi";
import { useOmnistonSwap, type QuoteParams } from "@/app/wallet/swap/hooks/useOmnistonSwap";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { Cell, Address } from "@ton/core";
import { dbfs } from "@/app/(firebase)/client";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import type { SpotToken } from "@/types/spot-trading";

interface SpotTradingPanelProps {
    token: SpotToken;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: "buy" | "sell";
}

export default function SpotTradingPanel({ token, open, onOpenChange, defaultTab = "buy" }: SpotTradingPanelProps) {
    const { tonBalance, walletAddress, sendTransaction, jettons } = useWallet();
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [amount, setAmount] = useState("");
    const [isExecuting, setIsExecuting] = useState(false);
    const [preview, setPreview] = useState<{
        receiveAmount: string;
        priceImpact: string;
        rate: string;
    } | null>(null);
    const [simLoading, setSimLoading] = useState(false);

    // Reset when sheet opens or tab changes
    useEffect(() => {
        if (open) setActiveTab(defaultTab);
    }, [open, defaultTab]);

    useEffect(() => {
        setAmount("");
        setPreview(null);
        setQuoteParams(null);
    }, [activeTab]);

    // Find user's balance for this token (convert from raw units)
    const userTokenBalance = (() => {
        try {
            const rawAddr = Address.parse(token.contractAddress).toRawString();
            const holding = jettons.find((j) => {
                if (!j.jettonAddress) return false;
                try {
                    return Address.parse(j.jettonAddress).toRawString() === rawAddr;
                } catch {
                    return false;
                }
            });
            if (!holding?.balance || holding.balance === "0") return "0";
            return fromUnits(holding.balance, token.decimals);
        } catch {
            return "0";
        }
    })();

    // Build Omniston quote params
    const [quoteParams, setQuoteParams] = useState<QuoteParams | null>(null);

    useEffect(() => {
        if (!amount || parseFloat(amount) <= 0) {
            setQuoteParams(null);
            return;
        }

        const isBuying = activeTab === "buy";
        const decimals = isBuying ? 9 : token.decimals;
        const units = toUnits(amount, decimals);
        const referralAddress = env.NEXT_PUBLIC_PLATFORM_WALLET;

        const timer = setTimeout(() => {
            setQuoteParams({
                fromAsset: isBuying
                    ? { address: TON_ADDRESS, blockchain: 607, kind: "Ton", symbol: "TON", displayName: "Toncoin", decimals: 9 }
                    : { address: token.contractAddress, blockchain: 607, kind: "Jetton", symbol: token.symbol, displayName: token.displayName, decimals: token.decimals },
                toAsset: isBuying
                    ? { address: token.contractAddress, blockchain: 607, kind: "Jetton", symbol: token.symbol, displayName: token.displayName, decimals: token.decimals }
                    : { address: TON_ADDRESS, blockchain: 607, kind: "Ton", symbol: "TON", displayName: "Toncoin", decimals: 9 },
                amount: units,
                ...(referralAddress ? { referrerAddress: referralAddress, referrerFeeBps: 10 } : {}),
            });
        }, 500);

        return () => clearTimeout(timer);
    }, [amount, activeTab, token.contractAddress, token.symbol, token.displayName, token.decimals]);

    // Omniston real-time quotes
    const {
        quote,
        isQuoting,
        quoteError,
        resolverName,
        buildAndExecute,
        isBuilding,
    } = useOmnistonSwap({ params: quoteParams, enabled: !!quoteParams && open });

    // Simulation preview (quick estimate while Omniston streams)
    useEffect(() => {
        if (!amount || parseFloat(amount) <= 0 || !open) {
            setPreview(null);
            return;
        }

        const simulate = async () => {
            try {
                setSimLoading(true);
                const isBuying = activeTab === "buy";
                const offerAddress = isBuying ? TON_ADDRESS : token.contractAddress;
                const askAddress = isBuying ? token.contractAddress : TON_ADDRESS;
                const decimals = isBuying ? 9 : token.decimals;
                const units = toUnits(amount, decimals);
                const result = await simulateSwap(offerAddress, askAddress, units);

                const receiveDecimals = isBuying ? token.decimals : 9;
                setPreview({
                    receiveAmount: fromUnits(result.askUnits, receiveDecimals),
                    priceImpact: result.priceImpact,
                    rate: result.swapRate,
                });
            } catch (error) {
                console.error("Simulation failed:", error);
                setPreview(null);
            } finally {
                setSimLoading(false);
            }
        };

        const debounce = setTimeout(simulate, 500);
        return () => clearTimeout(debounce);
    }, [amount, activeTab, token.contractAddress, token.decimals, open]);

    // Determine display values - prefer Omniston quote over simulation
    const receiveDecimals = activeTab === "buy" ? token.decimals : 9;
    const displayReceive = quote
        ? fromUnits(quote.askUnits, receiveDecimals)
        : preview?.receiveAmount;
    const displayImpact = preview?.priceImpact;
    const isLoading = simLoading || isQuoting;

    const handleSwap = useCallback(async () => {
        if (!quote || !walletAddress) {
            toast.error("No quote available. Please try again.");
            return;
        }

        setIsExecuting(true);
        try {
            const wrappedSendTx = async (params: { to: string; value: bigint; body: string }) => {
                const bodyCell = params.body ? Cell.fromBoc(Buffer.from(params.body, "base64"))[0] : undefined;
                const result = await sendTransaction({
                    to: params.to,
                    value: params.value.toString(),
                    body: bodyCell,
                });
                if (!result.success) {
                    throw new Error(result.error || "Transaction failed");
                }
            };

            const quoteId = await buildAndExecute(quote, walletAddress, wrappedSendTx);

            toast.success(activeTab === "buy" ? "Buy order executed!" : "Sell order executed!");

            // Track the trade in Firestore
            if (quoteId) {
                try {
                    await setDoc(doc(dbfs, "spot-trades", quoteId), {
                        tokenAddress: token.contractAddress,
                        tokenSymbol: token.symbol,
                        tokenName: token.displayName,
                        direction: activeTab,
                        amountIn: quote.bidUnits,
                        amountOut: quote.askUnits,
                        walletAddress,
                        resolverName: resolverName || "unknown",
                        quoteId,
                        timestamp: serverTimestamp(),
                    });
                } catch (trackErr) {
                    console.warn("Failed to track spot trade:", trackErr);
                }
            }

            setAmount("");
            onOpenChange(false);
        } catch (error) {
            console.error("Swap failed:", error);
            toast.error(error instanceof Error ? error.message : "Swap failed. Please try again.");
        } finally {
            setIsExecuting(false);
        }
    }, [quote, walletAddress, buildAndExecute, sendTransaction, activeTab, token, resolverName, onOpenChange]);

    const buyPresets = ["1", "5", "10", "MAX"];
    const sellPresets = ["25%", "50%", "75%", "MAX"];
    const quickAmounts = activeTab === "buy" ? buyPresets : sellPresets;

    const handlePreset = (value: string) => {
        if (activeTab === "buy") {
            if (value === "MAX") {
                // Leave ~0.5 TON for gas
                const max = Math.max(0, parseFloat(tonBalance || "0") - 0.5);
                setAmount(max > 0 ? max.toString() : "");
            } else {
                setAmount(value);
            }
        } else {
            const balance = parseFloat(userTokenBalance || "0");
            if (value === "MAX") {
                setAmount(balance > 0 ? balance.toString() : "");
            } else {
                const pct = parseInt(value) / 100;
                const val = balance * pct;
                setAmount(val > 0 ? val.toString() : "");
            }
        }
    };

    const isBusy = isExecuting || isBuilding;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="bg-[#111] border-white/10 rounded-t-2xl px-4 pb-8 max-h-[85vh]">
                <SheetHeader className="mb-4">
                    <SheetTitle className="text-white flex items-center gap-2">
                        Trade {token.symbol}
                    </SheetTitle>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "buy" | "sell")}>
                    <TabsList className="w-full bg-white/5 p-1 mb-4 h-11 rounded-xl">
                        <TabsTrigger
                            value="buy"
                            className="flex-1 h-full gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg"
                        >
                            Buy
                        </TabsTrigger>
                        <TabsTrigger
                            value="sell"
                            className="flex-1 h-full gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white rounded-lg"
                        >
                            Sell
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="buy" className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm text-muted-foreground">Amount (TON)</label>
                                <span className="text-sm text-muted-foreground">
                                    Balance: {parseFloat(tonBalance || "0").toFixed(2)} TON
                                </span>
                            </div>
                            <Input
                                type="number"
                                placeholder="0.0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="bg-white/5 border-white/10 text-white text-lg h-12"
                            />
                            <div className="flex gap-2 mt-2">
                                {quickAmounts.map((value) => (
                                    <Button
                                        key={value}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePreset(value)}
                                        className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                                    >
                                        {value === "MAX" ? "MAX" : `${value} TON`}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <QuotePreview
                            displayReceive={displayReceive}
                            displayImpact={displayImpact}
                            receiveSymbol={token.symbol}
                            resolverName={resolverName}
                            quoteError={quoteError}
                            isBuy={true}
                        />

                        <Button
                            onClick={handleSwap}
                            disabled={isBusy || isLoading || !amount || !quote}
                            className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-bold"
                        >
                            {isBusy ? (
                                <><ButtonLoader /><span className="ml-2">Executing...</span></>
                            ) : isLoading ? (
                                <><ButtonLoader /><span className="ml-2">Getting quote...</span></>
                            ) : (
                                <>Buy {token.symbol}</>
                            )}
                        </Button>
                    </TabsContent>

                    <TabsContent value="sell" className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm text-muted-foreground">Amount ({token.symbol})</label>
                                <span className="text-sm text-muted-foreground">
                                    Balance: {parseFloat(userTokenBalance || "0").toLocaleString()}
                                </span>
                            </div>
                            <Input
                                type="number"
                                placeholder="0.0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="bg-white/5 border-white/10 text-white text-lg h-12"
                            />
                            <div className="flex gap-2 mt-2">
                                {quickAmounts.map((value) => (
                                    <Button
                                        key={value}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePreset(value)}
                                        className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                                    >
                                        {value}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <QuotePreview
                            displayReceive={displayReceive}
                            displayImpact={displayImpact}
                            receiveSymbol="TON"
                            resolverName={resolverName}
                            quoteError={quoteError}
                            isBuy={false}
                        />

                        <Button
                            onClick={handleSwap}
                            disabled={isBusy || isLoading || !amount || !quote}
                            className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold"
                        >
                            {isBusy ? (
                                <><ButtonLoader /><span className="ml-2">Executing...</span></>
                            ) : isLoading ? (
                                <><ButtonLoader /><span className="ml-2">Getting quote...</span></>
                            ) : (
                                <>Sell {token.symbol}</>
                            )}
                        </Button>
                    </TabsContent>
                </Tabs>

            </SheetContent>
        </Sheet>
    );
}

function QuotePreview({
    displayReceive,
    displayImpact,
    receiveSymbol,
    resolverName,
    quoteError,
    isBuy,
}: {
    displayReceive?: string;
    displayImpact?: string;
    receiveSymbol: string;
    resolverName: string | null;
    quoteError: string | null;
    isBuy: boolean;
}) {
    if (!displayReceive && !quoteError) return null;

    return (
        <div className="p-3 rounded-xl bg-white/5 space-y-2">
            {displayReceive && (
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">You Receive</span>
                    <span className={`${isBuy ? "text-green-400" : "text-green-400"} font-semibold`}>
                        ~{parseFloat(displayReceive).toLocaleString()} {receiveSymbol}
                    </span>
                </div>
            )}
            {displayImpact && (
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price Impact</span>
                    <span className={parseFloat(displayImpact) > 3 ? "text-red-400" : "text-muted-foreground"}>
                        {displayImpact}%
                    </span>
                </div>
            )}
            {resolverName && (
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Resolver</span>
                    <span className="text-muted-foreground">{resolverName}</span>
                </div>
            )}
            {quoteError && !displayReceive && (
                <p className="text-xs text-red-400">{quoteError}</p>
            )}
        </div>
    );
}
