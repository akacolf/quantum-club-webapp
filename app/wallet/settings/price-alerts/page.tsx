"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Bell, BellOff, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { toast } from "sonner";

interface PriceAlert {
    id: string;
    symbol: string;
    targetPrice: number;
    direction: "above" | "below";
    createdAt: number;
    triggered: boolean;
}

const STORAGE_KEY = "quantum_price_alerts";

export default function PriceAlertsPage() {
    useTelegramBackButton("/wallet/settings");

    const [alerts, setAlerts] = useState<PriceAlert[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const symbol = "TON"; // Currently only supporting TON alerts
    const [targetPrice, setTargetPrice] = useState("");
    const [direction, setDirection] = useState<"above" | "below">("above");
    const [currentTonPrice, setCurrentTonPrice] = useState<number>(0);

    // Load alerts from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setAlerts(JSON.parse(stored));
        }
    }, []);

    // Fetch current TON price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const response = await fetch("https://tonapi.io/v2/rates?tokens=ton&currencies=usd");
                if (response.ok) {
                    const data = await response.json();
                    const price = data.rates?.TON?.prices?.USD || 0;
                    setCurrentTonPrice(price);
                }
            } catch (error) {
                console.error("Failed to fetch TON price:", error);
            }
        };
        fetchPrice();
        const interval = setInterval(fetchPrice, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    // Check for triggered alerts
    useEffect(() => {
        if (currentTonPrice === 0) return;

        const stored = localStorage.getItem(STORAGE_KEY);
        const currentAlerts: PriceAlert[] = stored ? JSON.parse(stored) : [];

        let hasTriggered = false;
        const updatedAlerts = currentAlerts.map(alert => {
            if (alert.triggered) return alert;

            const triggered =
                (alert.direction === "above" && currentTonPrice >= alert.targetPrice) ||
                (alert.direction === "below" && currentTonPrice <= alert.targetPrice);

            if (triggered) {
                hasTriggered = true;
                toast.success(
                    `🔔 Price Alert: ${alert.symbol} is now ${alert.direction === "above" ? "above" : "below"} $${alert.targetPrice.toFixed(2)}!`,
                    { duration: 10000 }
                );
                return { ...alert, triggered: true };
            }
            return alert;
        });

        if (hasTriggered) {
            setAlerts(updatedAlerts);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlerts));
        }
    }, [currentTonPrice]);

    // Save to localStorage
    const saveAlerts = (newAlerts: PriceAlert[]) => {
        setAlerts(newAlerts);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newAlerts));
    };

    const handleAdd = () => {
        const price = parseFloat(targetPrice);
        if (isNaN(price) || price <= 0) {
            toast.error("Please enter a valid price");
            return;
        }

        const newAlert: PriceAlert = {
            id: Date.now().toString(),
            symbol: symbol,
            targetPrice: price,
            direction: direction,
            createdAt: Date.now(),
            triggered: false,
        };
        saveAlerts([...alerts, newAlert]);
        setTargetPrice("");
        setIsAdding(false);
        toast.success("Price alert created!");
    };

    const handleDelete = (id: string) => {
        saveAlerts(alerts.filter(a => a.id !== id));
        toast.success("Alert removed");
    };

    const activeAlerts = alerts.filter(a => !a.triggered);
    const triggeredAlerts = alerts.filter(a => a.triggered);

    return (
        <div className="min-h-screen bg-black text-white p-4 pt-6 pb-24">
            <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-bold">Price Alerts</h1>
                        {currentTonPrice > 0 && (
                            <p className="text-sm text-gray-500">TON: ${currentTonPrice.toFixed(2)}</p>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAdding(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white border-0"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                    </Button>
                </div>

                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <Card className="bg-[#111] border-[#222] mb-4">
                                <CardContent className="p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setDirection("above")}
                                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-colors ${direction === "above"
                                                ? "bg-green-500/20 border-green-500/50 text-green-400"
                                                : "bg-[#1a1a1a] border-[#333] text-gray-400"
                                                }`}
                                        >
                                            <TrendingUp className="w-4 h-4" />
                                            Above
                                        </button>
                                        <button
                                            onClick={() => setDirection("below")}
                                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-colors ${direction === "below"
                                                ? "bg-red-500/20 border-red-500/50 text-red-400"
                                                : "bg-[#1a1a1a] border-[#333] text-gray-400"
                                                }`}
                                        >
                                            <TrendingDown className="w-4 h-4" />
                                            Below
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl">
                                            <span className="text-white font-medium">{symbol}</span>
                                        </div>
                                        <Input
                                            type="number"
                                            value={targetPrice}
                                            onChange={(e) => setTargetPrice(e.target.value)}
                                            placeholder="Target price (USD)"
                                            className="bg-[#1a1a1a] border-[#333] text-white flex-1"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsAdding(false);
                                                setTargetPrice("");
                                            }}
                                            className="flex-1 bg-[#1a1a1a] border-[#333] text-white"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleAdd}
                                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                                        >
                                            Create Alert
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {alerts.length === 0 && !isAdding ? (
                    <div className="text-center py-12">
                        <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No price alerts</p>
                        <p className="text-sm text-gray-600 mt-1">
                            Get notified when TON hits your target price
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {activeAlerts.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-sm font-medium text-gray-400">Active</h2>
                                {activeAlerts.map((alert) => (
                                    <Card key={alert.id} className="bg-[#111] border-[#222]">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alert.direction === "above" ? "bg-green-500/20" : "bg-red-500/20"
                                                    }`}>
                                                    {alert.direction === "above" ? (
                                                        <TrendingUp className="w-5 h-5 text-green-400" />
                                                    ) : (
                                                        <TrendingDown className="w-5 h-5 text-red-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">
                                                        {alert.symbol} {alert.direction === "above" ? "≥" : "≤"} ${alert.targetPrice.toFixed(2)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Alert when price goes {alert.direction}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleDelete(alert.id)}
                                                className="text-red-500 hover:text-red-400 h-8 w-8"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {triggeredAlerts.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-sm font-medium text-gray-400">Triggered</h2>
                                {triggeredAlerts.map((alert) => (
                                    <Card key={alert.id} className="bg-[#111] border-[#222] opacity-60">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-500/20 rounded-full flex items-center justify-center">
                                                    <BellOff className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-400 line-through">
                                                        {alert.symbol} {alert.direction === "above" ? "≥" : "≤"} ${alert.targetPrice.toFixed(2)}
                                                    </div>
                                                    <div className="text-xs text-green-400">Triggered ✓</div>
                                                </div>
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleDelete(alert.id)}
                                                className="text-gray-500 hover:text-gray-400 h-8 w-8"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
