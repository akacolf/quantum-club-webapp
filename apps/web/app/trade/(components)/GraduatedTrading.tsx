"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Token } from "@/types/trading";
import { useWallet } from "@/app/wallet/WalletContext";
import { toast } from "sonner";
import { simulateSwap, toUnits, fromUnits } from "@/lib/stonfi";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";

interface GraduatedTradingProps {
    token: Token;
}

export default function GraduatedTrading({ token }: GraduatedTradingProps) {
    const { tonBalance } = useWallet();
    const [activeTab, setActiveTab] = useState("buy");
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [preview, setPreview] = useState<{
        receiveAmount: string;
        priceImpact: string;
        rate: string;
    } | null>(null);

    // Simulate swap when amount changes
    useEffect(() => {
        if (!amount || parseFloat(amount) <= 0 || !token.jettonMasterAddress) {
            setPreview(null);
            return;
        }

        const simulate = async () => {
            try {
                setIsLoading(true);
                const isBuying = activeTab === "buy";
                const offerAddress = isBuying
                    ? "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c" // TON
                    : token.jettonMasterAddress!;
                const askAddress = isBuying
                    ? token.jettonMasterAddress!
                    : "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c"; // TON

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
                setIsLoading(false);
            }
        };

        const debounce = setTimeout(simulate, 500);
        return () => clearTimeout(debounce);
    }, [amount, activeTab, token.jettonMasterAddress]);

    const handleTradeOnStonfi = () => {
        // Build STON.fi URL with pre-filled swap parameters
        const baseUrl = "https://app.ston.fi/swap";
        const params = new URLSearchParams();

        if (token.jettonMasterAddress) {
            if (activeTab === "buy") {
                // TON -> Token
                params.set("ft", "TON");
                params.set("tt", token.jettonMasterAddress);
            } else {
                // Token -> TON
                params.set("ft", token.jettonMasterAddress);
                params.set("tt", "TON");
            }
            if (amount) {
                params.set("fa", amount);
            }
        }

        const url = `${baseUrl}?${params.toString()}`;
        window.open(url, "_blank");
        toast.success("Opening STON.fi...");
    };

    const quickAmounts = activeTab === "buy"
        ? ["0.1", "0.5", "1", "5"]
        : ["25%", "50%", "75%", "MAX"];

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
                    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setAmount(""); setPreview(null); }}>
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

                            {preview && (
                                <div className="p-3 rounded-xl bg-white/5 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">You Receive</span>
                                        <span className="text-green-400 font-semibold">
                                            ~{parseFloat(preview.receiveAmount).toLocaleString()} {token.symbol}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Price Impact</span>
                                        <span className={parseFloat(preview.priceImpact) > 3 ? "text-red-400" : "text-muted-foreground"}>
                                            {preview.priceImpact}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            <Button
                                onClick={handleTradeOnStonfi}
                                disabled={isLoading || !amount}
                                className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-bold"
                            >
                                {isLoading ? (
                                    <>
                                        <ButtonLoader />
                                        <span className="ml-2">Processing...</span>
                                    </>
                                ) : (
                                    <>Buy on STON.fi</>
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

                            {preview && (
                                <div className="p-3 rounded-xl bg-white/5 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">You Receive</span>
                                        <span className="text-green-400 font-semibold">
                                            ~{parseFloat(preview.receiveAmount).toFixed(4)} TON
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Price Impact</span>
                                        <span className={parseFloat(preview.priceImpact) > 3 ? "text-red-400" : "text-muted-foreground"}>
                                            {preview.priceImpact}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            <Button
                                onClick={handleTradeOnStonfi}
                                disabled={isLoading || !amount}
                                className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold"
                            >
                                {isLoading ? (
                                    <>
                                        <ButtonLoader />
                                        <span className="ml-2">Processing...</span>
                                    </>
                                ) : (
                                    <>Sell on STON.fi</>
                                )}
                            </Button>
                        </TabsContent>
                    </Tabs>

                    <p className="text-[10px] text-center text-muted-foreground mt-4">
                        Powered by STON.fi DEX • Standard DEX fees apply
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
