"use client";

import { env } from "@/env";
import { useState, useEffect } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Token } from "@/types/trading";
import { useWallet } from "@/app/wallet/WalletContext";
import { toast } from "sonner";
import { tradeAmountSchema } from "@/lib/validations";
import { simulateSwap, toUnits, fromUnits, TON_ADDRESS } from "@/lib/stonfi";
import { useOmnistonSwap, type QuoteParams } from "@/app/wallet/swap/hooks/useOmnistonSwap";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { Cell } from "@ton/core";
import { dbfs } from "@/app/(firebase)/client";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

interface GraduatedTradingProps {
    token: Token;
}

export default function GraduatedTrading({ token }: GraduatedTradingProps) {
    const { tonBalance, walletAddress, sendTransaction } = useWallet();
    const [activeTab, setActiveTab] = useQueryState("side", parseAsStringLiteral(["buy", "sell"]).withDefault("buy"));
    const [amount, setAmount] = useState("");
    const [isExecuting, setIsExecuting] = useState(false);
    const [preview, setPreview] = useState<{
        receiveAmount: string;
        priceImpact: string;
        rate: string;
    } | null>(null);
    const [simLoading, setSimLoading] = useState(false);

    // Build Omniston quote params
    const [quoteParams, setQuoteParams] = useState<QuoteParams | null>(null);

    useEffect(() => {
        if (!amount || parseFloat(amount) <= 0 || !token.jettonMasterAddress) {
            setQuoteParams(null);
            return;
        }

        const isBuying = activeTab === "buy";
        const units = toUnits(amount, 9);

        const referralAddress = env.NEXT_PUBLIC_PLATFORM_WALLET;

        const timer = setTimeout(() => {
            setQuoteParams({
                fromAsset: isBuying
                    ? { address: TON_ADDRESS, blockchain: 607, kind: "Ton", symbol: "TON", displayName: "Toncoin", decimals: 9 }
                    : { address: token.jettonMasterAddress!, blockchain: 607, kind: "Jetton", symbol: token.symbol || "???", displayName: token.name || "Token", decimals: 9 },
                toAsset: isBuying
                    ? { address: token.jettonMasterAddress!, blockchain: 607, kind: "Jetton", symbol: token.symbol || "???", displayName: token.name || "Token", decimals: 9 }
                    : { address: TON_ADDRESS, blockchain: 607, kind: "Ton", symbol: "TON", displayName: "Toncoin", decimals: 9 },
                amount: units,
                ...(referralAddress ? { referrerAddress: referralAddress, referrerFeeBps: 10 } : {}),
            });
        }, 500);

        return () => clearTimeout(timer);
    }, [amount, activeTab, token.jettonMasterAddress, token.symbol, token.name]);

    // Omniston real-time quotes
    const {
        quote,
        isQuoting,
        quoteError,
        resolverName,
        buildAndExecute,
        isBuilding,
    } = useOmnistonSwap({ params: quoteParams, enabled: !!quoteParams });

    // Simulation preview (quick estimate while Omniston streams)
    useEffect(() => {
        if (!amount || parseFloat(amount) <= 0 || !token.jettonMasterAddress) {
            setPreview(null);
            return;
        }

        const simulate = async () => {
            try {
                setSimLoading(true);
                const isBuying = activeTab === "buy";
                const offerAddress = isBuying ? TON_ADDRESS : token.jettonMasterAddress!;
                const askAddress = isBuying ? token.jettonMasterAddress! : TON_ADDRESS;
                const units = toUnits(amount, 9);
                const result = await simulateSwap(offerAddress, askAddress, units);

                setPreview({
                    receiveAmount: fromUnits(result.askUnits, 9),
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
    }, [amount, activeTab, token.jettonMasterAddress]);

    // Determine display values - prefer Omniston quote over simulation
    const displayReceive = quote
        ? fromUnits(quote.askUnits, 9)
        : preview?.receiveAmount;
    const displayImpact = preview?.priceImpact;
    const isLoading = simLoading || isQuoting;

    const handleSwap = async () => {
        // Zod schema validation at submit boundary
        const parsed = tradeAmountSchema.safeParse({ amount: amount || "" });
        if (!parsed.success) {
            toast.error(parsed.error.errors[0].message);
            return;
        }

        if (!quote || !walletAddress) {
            toast.error("No quote available. Please try again.");
            return;
        }

        setIsExecuting(true);
        try {
            // Wrap WalletContext's sendTransaction for Omniston compatibility
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
                    await setDoc(doc(dbfs, "graduated-trades", quoteId), {
                        tokenId: token.id,
                        tokenSymbol: token.symbol,
                        jettonMasterAddress: token.jettonMasterAddress,
                        direction: activeTab,
                        amountIn: quote.bidUnits,
                        amountOut: quote.askUnits,
                        walletAddress,
                        resolverName: resolverName || "unknown",
                        quoteId,
                        timestamp: serverTimestamp(),
                    });
                } catch (trackErr) {
                    console.warn("Failed to track graduated trade:", trackErr);
                }
            }

            setAmount("");
        } catch (error) {
            console.error("Swap failed:", error);
            toast.error(error instanceof Error ? error.message : "Swap failed. Please try again.");
        } finally {
            setIsExecuting(false);
        }
    };

    const quickAmounts = activeTab === "buy"
        ? ["0.1", "0.5", "1", "5"]
        : ["25%", "50%", "75%", "MAX"];

    const isBusy = isExecuting || isBuilding;

    return (
        <div className="space-y-4">
            {/* Graduated Banner */}
            <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Icon icon="solar:diploma-verified-bold" className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white">Graduated to DEX</h3>
                                <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">STON.fi</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This token now trades on STON.fi with full liquidity
                            </p>
                        </div>
                    </div>
                    {token.dexPoolAddress && (
                        <a
                            href={`https://app.ston.fi/pools/${token.dexPoolAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 flex items-center gap-2 text-xs text-purple-400 hover:underline"
                        >
                            <Icon icon="solar:link-round-bold" className="w-3.5 h-3.5" />
                            View Pool on STON.fi
                        </a>
                    )}
                </CardContent>
            </Card>

            {/* DEX Trading Panel */}
            <Card className="bg-white/5 border-white/10 overflow-hidden">
                <CardContent className="p-4">
                    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "buy" | "sell"); setAmount(""); setPreview(null); setQuoteParams(null); }}>
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
                                            onClick={() => setAmount(value)}
                                            className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                                        >
                                            {value}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {(displayReceive || quoteError) && (
                                <div className="p-3 rounded-xl bg-white/5 space-y-2">
                                    {displayReceive && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">You Receive</span>
                                            <span className="text-green-400 font-semibold">
                                                ~{parseFloat(displayReceive).toLocaleString()} {token.symbol}
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
                            )}

                            <Button
                                onClick={handleSwap}
                                disabled={isBusy || isLoading || !amount || !quote}
                                className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-bold"
                            >
                                {isBusy ? (
                                    <>
                                        <ButtonLoader />
                                        <span className="ml-2">Executing...</span>
                                    </>
                                ) : isLoading ? (
                                    <>
                                        <ButtonLoader />
                                        <span className="ml-2">Getting quote...</span>
                                    </>
                                ) : (
                                    <>Buy {token.symbol}</>
                                )}
                            </Button>
                        </TabsContent>

                        <TabsContent value="sell" className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm text-muted-foreground">Amount ({token.symbol})</label>
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
                                            onClick={() => setAmount(value === "MAX" ? "1000000" : value)}
                                            className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                                        >
                                            {value}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {(displayReceive || quoteError) && (
                                <div className="p-3 rounded-xl bg-white/5 space-y-2">
                                    {displayReceive && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">You Receive</span>
                                            <span className="text-green-400 font-semibold">
                                                ~{parseFloat(displayReceive).toFixed(4)} TON
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
                            )}

                            <Button
                                onClick={handleSwap}
                                disabled={isBusy || isLoading || !amount || !quote}
                                className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold"
                            >
                                {isBusy ? (
                                    <>
                                        <ButtonLoader />
                                        <span className="ml-2">Executing...</span>
                                    </>
                                ) : isLoading ? (
                                    <>
                                        <ButtonLoader />
                                        <span className="ml-2">Getting quote...</span>
                                    </>
                                ) : (
                                    <>Sell {token.symbol}</>
                                )}
                            </Button>
                        </TabsContent>
                    </Tabs>

                </CardContent>
            </Card>
        </div>
    );
}
