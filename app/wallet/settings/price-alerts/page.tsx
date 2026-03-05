"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import Loader from "@/app/(components)/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { toast } from "sonner";
import { createPriceAlert, deletePriceAlert } from "./actions";
import Image from "next/image";
import { useAllPrices } from "@/app/(hooks)/queries/use-prices";
import { usePriceAlerts } from "@/app/(hooks)/queries/use-trades";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useStore } from "@tanstack/react-form";
import { priceAlertSchema } from "@/lib/validations";
import { Field, FieldError } from "@/components/ui/field";

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
    const { telegramId } = useUserContext();
    const queryClient = useQueryClient();

    const { data: alerts = [], isFetching: isLoading } = usePriceAlerts(telegramId);
    const { data: pricesData } = useAllPrices();
    const currentPrices: Record<string, number> = {
        TON: pricesData?.ton || 0,
        BTC: pricesData?.btc || 0,
        ETH: pricesData?.eth || 0,
        SOL: pricesData?.sol || 0,
        TRX: pricesData?.trx || 0,
    };

    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showTokenPicker, setShowTokenPicker] = useState(false);

    const form = useForm({
        defaultValues: {
            symbol: "TON",
            targetPrice: "",
            direction: "above" as "above" | "below",
        },
        validators: { onSubmit: priceAlertSchema },
        onSubmit: async ({ value }) => {
            await handleAdd(value);
        },
    });

    const symbol = useStore(form.store, (s) => s.values.symbol);
    const direction = useStore(form.store, (s) => s.values.direction);
    const selectedToken = SUPPORTED_TOKENS.find((t) => t.symbol === symbol) || SUPPORTED_TOKENS[0];

    const handleAdd = async (value: { symbol: string; targetPrice: string; direction: "above" | "below" }) => {
        const price = parseFloat(value.targetPrice);

        if (!telegramId) {
            toast.error("Not logged in");
            return;
        }

        setIsSaving(true);
        try {
            const result = await createPriceAlert({
                symbol: value.symbol,
                targetPrice: price,
                direction: value.direction,
            });

            if (result?.serverError) {
                toast.error(result.serverError);
                return;
            }

            if (result?.data?.success) {
                queryClient.invalidateQueries({ queryKey: ["priceAlerts", telegramId] });
                form.reset();
                setIsAdding(false);
                toast.success("Price alert created! You'll receive a Telegram notification when triggered.");
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
            const result = await deletePriceAlert({ alertId });

            if (result?.serverError) {
                toast.error(result.serverError);
                return;
            }

            if (result?.data?.success) {
                queryClient.invalidateQueries({ queryKey: ["priceAlerts", telegramId] });
                toast.success("Alert removed");
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
        if (symbol === "BTC") return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return price.toFixed(2);
    };

    if (isLoading) {
        return <Loader />;
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
                            onClick={() => { queryClient.invalidateQueries({ queryKey: ["priceAlerts", telegramId] }); queryClient.invalidateQueries({ queryKey: ["prices", "all"] }); }}
                            className="h-9 w-9 rounded-xl"
                        >
                            <Icon icon="lucide:refresh-cw" className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setIsAdding(true)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 rounded-xl px-4 font-semibold shadow-sm"
                        >
                            <Icon icon="lucide:plus" className="w-4 h-4 mr-1" />
                            Add
                        </Button>
                    </div>
                </div>

                {/* Current Prices */}
                <div className="mb-4 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
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
                                            <Icon icon="lucide:chevron-down" className="w-4 h-4 text-muted-foreground" />
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
                                                                form.setFieldValue("symbol", token.symbol);
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
                                            onClick={() => form.setFieldValue("direction", "above")}
                                            className={`flex items-center justify-center gap-2 h-12 rounded-xl border transition-colors ${
                                                direction === "above"
                                                    ? "bg-green-500/20 border-green-500/50 text-green-500 hover:bg-green-500/30 hover:text-green-600"
                                                    : "bg-muted border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                                            }`}
                                        >
                                            <Icon icon="lucide:trending-up" className="w-4 h-4" />
                                            Above
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => form.setFieldValue("direction", "below")}
                                            className={`flex items-center justify-center gap-2 h-12 rounded-xl border transition-colors ${
                                                direction === "below"
                                                    ? "bg-destructive/20 border-destructive/50 text-destructive hover:bg-destructive/30"
                                                    : "bg-muted border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                                            }`}
                                        >
                                            <Icon icon="lucide:trending-down" className="w-4 h-4" />
                                            Below
                                        </Button>
                                    </div>

                                    {/* Price Input */}
                                    <form.Field name="targetPrice">
                                        {(field) => {
                                            const hasErrors = field.state.meta.errors.length > 0;
                                            return (
                                                <Field data-invalid={hasErrors}>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                                        <Input
                                                            id={field.name}
                                                            type="number"
                                                            value={field.state.value}
                                                            onBlur={field.handleBlur}
                                                            onChange={(e) => field.handleChange(e.target.value)}
                                                            aria-invalid={hasErrors}
                                                            placeholder={`Target price (e.g., ${
                                                                currentPrices[selectedToken.symbol]
                                                                    ? (currentPrices[selectedToken.symbol] * (direction === "above" ? 1.1 : 0.9)).toFixed(2)
                                                                    : "0.00"
                                                            })`}
                                                            className="bg-muted border-border text-foreground pl-7"
                                                        />
                                                    </div>
                                                    {hasErrors && <FieldError errors={field.state.meta.errors.map(e => ({ message: String(e) }))} />}
                                                </Field>
                                            );
                                        }}
                                    </form.Field>

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
                                                form.reset();
                                                setShowTokenPicker(false);
                                            }}
                                            className="flex-1 bg-muted border-border text-foreground"
                                            disabled={isSaving}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() => form.handleSubmit()}
                                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <ButtonLoader />
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
                        <Icon icon="lucide:bell" className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
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
                                                            <Icon icon="lucide:trending-up" className="w-5 h-5 text-green-500" />
                                                        ) : (
                                                            <Icon icon="lucide:trending-down" className="w-5 h-5 text-destructive" />
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
                                                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
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
                                                        <Icon icon="lucide:bell-off" className="w-5 h-5 text-gray-400" />
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
                                                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-6 p-3 bg-primary/10 border border-primary/20 rounded-xl">
                    <p className="text-xs text-primary/80 text-left flex items-center justify-start gap-1.5">
                        <Icon icon="lucide:info" className="w-3.5 h-3.5 shrink-0" />
                        Alerts are checked every minute. You&apos;ll receive a Telegram notification when your price target is hit.
                    </p>
                </div>
            </div>
        </div>
    );
}
