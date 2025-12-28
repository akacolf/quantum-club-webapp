"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TradeConfirmationProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    type: "buy" | "sell";
    tokenSymbol: string;
    amount: string;
    preview: {
        tokensReceived?: string;
        tonReceived?: string;
        averagePrice?: string;
        priceImpact?: string;
        fee?: string;
    } | null;
    isLoading?: boolean;
}

export function TradeConfirmation({
    isOpen,
    onClose,
    onConfirm,
    type,
    tokenSymbol,
    amount,
    preview,
    isLoading,
}: TradeConfirmationProps) {
    const isBuy = type === "buy";

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="bg-[#0a0a0a] border-white/10 max-w-sm">
                <AlertDialogHeader>
                    <div className="flex items-center justify-center mb-2">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isBuy ? "bg-green-500/10" : "bg-red-500/10"
                            }`}>
                            <Icon
                                icon={isBuy ? "solar:arrow-up-bold" : "solar:arrow-down-bold"}
                                className={`w-7 h-7 ${isBuy ? "text-green-400" : "text-red-400"}`}
                            />
                        </div>
                    </div>
                    <AlertDialogTitle className="text-center text-white">
                        Confirm {isBuy ? "Purchase" : "Sale"}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-muted-foreground">
                        Review your {type} order details below
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {preview && (
                    <div className="space-y-3 py-4">
                        <div className="p-3 rounded-xl bg-white/5 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Amount</span>
                                <span className="text-white font-medium">
                                    {isBuy ? `${amount} TON` : `${(Number(amount) / 1e9).toLocaleString()} ${tokenSymbol}`}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">You {isBuy ? "Receive" : "Get"}</span>
                                <span className={`font-semibold ${isBuy ? "text-green-400" : "text-green-400"}`}>
                                    {isBuy
                                        ? `${(Number(preview.tokensReceived) / 1e9).toLocaleString()} ${tokenSymbol}`
                                        : `${preview.tonReceived} TON`
                                    }
                                </span>
                            </div>
                            {preview.priceImpact && Number(preview.priceImpact) > 1 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Price Impact</span>
                                    <span className={`font-medium ${Number(preview.priceImpact) > 5 ? "text-red-400" : "text-orange-400"
                                        }`}>
                                        {preview.priceImpact}%
                                    </span>
                                </div>
                            )}
                            {preview.fee && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Fee (1.5%)</span>
                                    <span className="text-muted-foreground">{preview.fee} TON</span>
                                </div>
                            )}
                        </div>

                        <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                            <div className="flex items-start gap-2">
                                <Icon icon="solar:info-circle-bold" className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-orange-300/80">
                                    This transaction is irreversible. Please verify all details before confirming.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <AlertDialogFooter className="gap-2 sm:gap-2">
                    <AlertDialogCancel
                        onClick={onClose}
                        className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 ${isBuy
                            ? "bg-green-500 hover:bg-green-600 text-white"
                            : "bg-red-500 hover:bg-red-600 text-white"
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <Icon icon="solar:spinner-bold" className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            `Confirm ${isBuy ? "Buy" : "Sell"}`
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// First trade disclaimer modal
interface FirstTradeDisclaimerProps {
    isOpen: boolean;
    onAccept: () => void;
}

export function FirstTradeDisclaimer({ isOpen, onAccept }: FirstTradeDisclaimerProps) {
    const [accepted, setAccepted] = useState(false);

    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent className="bg-[#0a0a0a] border-white/10 max-w-sm">
                <AlertDialogHeader>
                    <div className="flex items-center justify-center mb-2">
                        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                            <Icon icon="solar:shield-warning-bold" className="w-7 h-7 text-orange-400" />
                        </div>
                    </div>
                    <AlertDialogTitle className="text-center text-white">
                        Trading Risk Disclaimer
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        Before you start trading on RocketStart
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3 py-4">
                    <div className="p-3 rounded-xl bg-white/5 text-sm text-muted-foreground space-y-2">
                        <div className="flex items-start gap-2">
                            <Icon icon="solar:danger-triangle-bold" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <span>Tokens are highly speculative and may lose <strong className="text-white">all value</strong></span>
                        </div>
                        <div className="flex items-start gap-2">
                            <Icon icon="solar:lock-keyhole-bold" className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                            <span>All trades are <strong className="text-white">final and irreversible</strong></span>
                        </div>
                        <div className="flex items-start gap-2">
                            <Icon icon="solar:chart-bold" className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                            <span>Prices are set by bonding curve, <strong className="text-white">not order matching</strong></span>
                        </div>
                        <div className="flex items-start gap-2">
                            <Icon icon="solar:wallet-2-bold" className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                            <span>Only trade with funds you can <strong className="text-white">afford to lose entirely</strong></span>
                        </div>
                    </div>

                    <label className="flex items-start gap-3 p-3 rounded-xl bg-white/5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-white/20"
                        />
                        <span className="text-sm text-muted-foreground">
                            I understand and accept the risks of token trading
                        </span>
                    </label>
                </div>

                <AlertDialogFooter>
                    <Button
                        onClick={onAccept}
                        disabled={!accepted}
                        className="w-full bg-primary hover:bg-primary/90"
                    >
                        <Icon icon="solar:check-circle-bold" className="w-4 h-4 mr-2" />
                        I Understand, Continue
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
