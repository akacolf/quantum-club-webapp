"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Bell, BellOff, TrendingUp, TrendingDown, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import { toast } from "sonner";
import Image from "next/image";

interface PriceAlert {
    id: string;
    telegramId: string;
    symbol: string;
    targetPrice: number;
    direction: "above" | "below";
    createdAt: number;
    triggered: boolean;
    notified: boolean;
    triggeredAt?: number;
    triggeredPrice?: number;
}

interface TokenOption {
    symbol: string;
    name: string;
    icon: string;
    color: string;
}

const SUPPORTED_TOKENS: TokenOption[] = [
    { symbol: "TON", name: "Toncoin", icon: "/svg/ton-logo.svg", color: "#0098EA" },
    { symbol: "BTC", name: "Bitcoin", icon: "/svg/btc-logo.svg", color: "#F7931A" },
    { symbol: "ETH", name: "Ethereum", icon: "/svg/eth-logo.svg", color: "#627EEA" },
    { symbol: "SOL", name: "Solana", icon: "/svg/sol-logo.svg", color: "#9945FF" },
    { symbol: "TRX", name: "TRON", icon: "/svg/trx-logo.svg", color: "#FF0013" },
];

export default function PriceAlertsPage() {
    useTelegramBackButton("/wallet/settings");
    const { telegramId } = useGameContext();

    const [alerts, setAlerts] = useState<PriceAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedToken, setSelectedToken] = useState<TokenOption>(SUPPORTED_TOKENS[0]);
    const [showTokenPicker, setShowTokenPicker] = useState(false);
    const [targetPrice, setTargetPrice] = useState("");
    const [direction, setDirection] = useState<"above" | "below">("above");
    const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

    // Fetch alerts from API
    const fetchAlerts = useCallback(async () => {
        if (!telegramId) return;
        
        setIsLoading(true);
        try {
            const response = await fetch(`/api/price-alerts?telegramId=${telegramId}`);
            if (response.ok) {
                const data = await response.json();
                setAlerts(data.alerts || []);
            } else {
                toast.error("Failed to load alerts");
            }
        } catch (error) {
            console.error("Error fetching alerts:", error);
            toast.error("Failed to load alerts");
        } finally {
            setIsLoading(false);
        }
    }, [telegramId]);

    // Fetch current prices
    const fetchPrices = useCallback(async () => {
        try {
            const response = await fetch(
                "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,bitcoin,ethereum,solana,tron&vs_currencies=usd"
            );
            if (response.ok) {
                const data = await response.json();
                setCurrentPrices({
                    TON: data["the-open-network"]?.usd || 0,
                    BTC: data["bitcoin"]?.usd || 0,
                    ETH: data["ethereum"]?.usd || 0,
                    SOL: data["solana"]?.usd || 0,
                    TRX: data["tron"]?.usd || 0,
                });
            }
        } catch (error) {
            console.error("Failed to fetch prices:", error);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
        fetchPrices();
        
        // Refresh prices every 30s
        const interval = setInterval(fetchPrices, 30000);
        return () => clearInterval(interval);
    }, [fetchAlerts, fetchPrices]);

    const handleAdd = async () => {
        const price = parseFloat(targetPrice);
        if (isNaN(price) || price <= 0) {
            toast.error("Please enter a valid price");
            return;
        }

        if (!telegramId) {
            toast.error("Not logged in");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch("/api/price-alerts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    telegramId,
                    symbol: selectedToken.symbol,
                    targetPrice: price,
                    direction,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setAlerts([data.alert, ...alerts]);
                setTargetPrice("");
                setIsAdding(false);
                toast.success("Price alert created! You'll receive a Telegram notification when triggered.");
            } else {
                toast.error(data.error || "Failed to create alert");
            }
        } catch (error) {
            console.error("Error creating alert:", error);
            toast.error("Failed to create alert");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (alertId: string) => {
        if (!telegramId) return;

        try {
            const response = await fetch(
                `/api/price-alerts?alertId=${alertId}&telegramId=${telegramId}`,
                { method: "DELETE" }
            );

            if (response.ok) {
                setAlerts(alerts.filter((a) => a.id !== alertId));
                toast.success("Alert removed");
            } else {
                toast.error("Failed to delete alert");
            }
        } catch (error) {
            console.error("Error deleting alert:", error);
            toast.error("Failed to delete alert");
        }
    };

    const activeAlerts = alerts.filter((a) => !a.triggered);
    const triggeredAlerts = alerts.filter((a) => a.triggered);

    const getTokenInfo = (symbol: string) => {
        return SUPPORTED_TOKENS.find((t) => t.symbol === symbol) || SUPPORTED_TOKENS[0];
    };

    const formatPrice = (price: number, symbol: string) => {
        if (symbol === "BTC") return price.toLocaleString();
        if (symbol === "ETH") return price.toFixed(2);
        return price.toFixed(4);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 pt-6 pb-24">
                <div className="max-w-md mx-auto flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pt-6 pb-24">
            <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-bold">Price Alerts</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Get Telegram notifications when prices hit your targets
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { fetchAlerts(); fetchPrices(); }}
                            className="h-9 w-9 rounded-xl"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setIsAdding(true)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 rounded-xl px-4 font-semibold shadow-sm"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                        </Button>
                    </div>
                </div>

                {/* Current Prices */}
                <div className="mb-4 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                    {SUPPORTED_TOKENS.map((token) => (
                        <div
                            key={token.symbol}
                            className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl shrink-0"
                        >
                            <Image src={token.icon} alt={token.symbol} width={20} height={20} />
                            <span className="text-sm font-medium">{token.symbol}</span>
                            <span className="text-sm text-muted-foreground">
                                ${currentPrices[token.symbol] ? formatPrice(currentPrices[token.symbol], token.symbol) : "—"}
                            </span>
                        </div>
                    ))}
                </div>

                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <Card className="bg-card border-border mb-4">
                                <CardContent className="p-4 space-y-4">
                                    {/* Token Selector */}
                                    <div className="relative">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowTokenPicker(!showTokenPicker)}
                                            className="w-full h-12 justify-between bg-muted border-border"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Image
                                                    src={selectedToken.icon}
                                                    alt={selectedToken.symbol}
                                                    width={24}
                                                    height={24}
                                                />
                                                <span className="font-medium">{selectedToken.symbol}</span>
                                                <span className="text-muted-foreground text-sm">
                                                    {selectedToken.name}
                                                </span>
                                            </div>
                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        </Button>

                                        <AnimatePresence>
                                            {showTokenPicker && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute z-10 w-full mt-2 bg-card border border-border rounded-xl overflow-hidden shadow-lg"
                                                >
                                                    {SUPPORTED_TOKENS.map((token) => (
                                                        <button
                                                            key={token.symbol}
                                                            onClick={() => {
                                                                setSelectedToken(token);
                                                                setShowTokenPicker(false);
                                                            }}
                                                            className={`w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors ${
                                                                selectedToken.symbol === token.symbol ? "bg-muted" : ""
                                                            }`}
                                                        >
                                                            <Image
                                                                src={token.icon}
                                                                alt={token.symbol}
                                                                width={28}
                                                                height={28}
                                                            />
                                                            <div className="text-left">
                                                                <div className="font-medium">{token.symbol}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {token.name}
                                                                </div>
                                                            </div>
                                                            {currentPrices[token.symbol] && (
                                                                <span className="ml-auto text-sm text-muted-foreground">
                                                                    ${formatPrice(currentPrices[token.symbol], token.symbol)}
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Direction Selector */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setDirection("above")}
                                            className={`flex items-center justify-center gap-2 h-12 rounded-xl border transition-colors ${
                                                direction === "above"
                                                    ? "bg-green-500/20 border-green-500/50 text-green-500 hover:bg-green-500/30 hover:text-green-600"
                                                    : "bg-muted border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                                            }`}
                                        >
                                            <TrendingUp className="w-4 h-4" />
                                            Above
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setDirection("below")}
                                            className={`flex items-center justify-center gap-2 h-12 rounded-xl border transition-colors ${
                                                direction === "below"
                                                    ? "bg-destructive/20 border-destructive/50 text-destructive hover:bg-destructive/30"
                                                    : "bg-muted border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                                            }`}
                                        >
                                            <TrendingDown className="w-4 h-4" />
                                            Below
                                        </Button>
                                    </div>

                                    {/* Price Input */}
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            type="number"
                                            value={targetPrice}
                                            onChange={(e) => setTargetPrice(e.target.value)}
                                            placeholder={`Target price (e.g., ${
                                                currentPrices[selectedToken.symbol]
                                                    ? (currentPrices[selectedToken.symbol] * (direction === "above" ? 1.1 : 0.9)).toFixed(2)
                                                    : "0.00"
                                            })`}
                                            className="bg-muted border-border text-foreground pl-7"
                                        />
                                    </div>

                                    {/* Helper text */}
                                    {currentPrices[selectedToken.symbol] && (
                                        <p className="text-xs text-muted-foreground text-center">
                                            Current {selectedToken.symbol} price: ${formatPrice(currentPrices[selectedToken.symbol], selectedToken.symbol)}
                                        </p>
                                    )}

                                    {/* Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsAdding(false);
                                                setTargetPrice("");
                                                setShowTokenPicker(false);
                                            }}
                                            className="flex-1 bg-muted border-border text-foreground"
                                            disabled={isSaving}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleAdd}
                                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                "Create Alert"
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {alerts.length === 0 && !isAdding ? (
                    <div className="text-center py-12">
                        <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No price alerts</p>
                        <p className="text-sm text-muted-foreground/50 mt-1">
                            Get notified via Telegram when prices hit your targets
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {activeAlerts.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-medium text-muted-foreground">Active</h2>
                                    <Badge variant="outline" className="text-[10px]">
                                        {activeAlerts.length} / 10
                                    </Badge>
                                </div>
                                {activeAlerts.map((alert) => {
                                    const token = getTokenInfo(alert.symbol);
                                    return (
                                        <Card key={alert.id} className="bg-card border-border">
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                            alert.direction === "above" ? "bg-green-500/20" : "bg-red-500/20"
                                                        }`}
                                                    >
                                                        {alert.direction === "above" ? (
                                                            <TrendingUp className="w-5 h-5 text-green-500" />
                                                        ) : (
                                                            <TrendingDown className="w-5 h-5 text-destructive" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Image src={token.icon} alt={token.symbol} width={16} height={16} />
                                                            <span className="font-medium text-foreground">
                                                                {alert.symbol} {alert.direction === "above" ? "≥" : "≤"} ${alert.targetPrice.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Alert when price goes {alert.direction}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(alert.id)}
                                                    className="text-destructive hover:text-destructive/80 h-8 w-8"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        {triggeredAlerts.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-sm font-medium text-muted-foreground">Triggered</h2>
                                {triggeredAlerts.map((alert) => {
                                    const token = getTokenInfo(alert.symbol);
                                    return (
                                        <Card key={alert.id} className="bg-card border-border opacity-60">
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-500/20 rounded-full flex items-center justify-center">
                                                        <BellOff className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Image src={token.icon} alt={token.symbol} width={16} height={16} />
                                                            <span className="font-medium text-muted-foreground line-through">
                                                                {alert.symbol} {alert.direction === "above" ? "≥" : "≤"} ${alert.targetPrice.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-green-500">
                                                            {alert.notified ? "Notified via Telegram ✓" : "Triggered ✓"}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(alert.id)}
                                                    className="text-muted-foreground hover:text-foreground h-8 w-8"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Info Banner */}
                <div className="mt-6 p-3 bg-primary/10 border border-primary/20 rounded-xl">
                    <p className="text-xs text-primary/80 text-center">
                        💡 Alerts are checked every minute. You&apos;ll receive a Telegram notification when your price target is hit.
                    </p>
                </div>
            </div>
        </div>
    );
}
