"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useForm } from "@tanstack/react-form";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useUnstakeDataQuery } from "@/app/(hooks)/queries/use-unstake";
import { useWallet } from "../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { stakeAmountSchema } from "@/lib/validations";
import { getSecureMnemonic } from "@/lib/secure-mnemonic";
import {
    unstakeTsTon,
    unstakeInstantTsTon,
} from "@/lib/tonstakers-integration";

type UnstakeMode = "best-rate" | "instant";

export default function UnstakePage() {
    useTelegramBackButton("/wallet/staking");
    const router = useRouter();
    const { jettons, fetchWalletAssets } = useWallet();
    const { telegramId } = useUserContext();
    
    const {
        isOpen: isAuthOpen,
        requestAuth,
        handleSuccess: handleAuthSuccess,
        handleCancel: handleAuthCancel,
    } = useBiometricAuth();
    
    useEffect(() => {
        router.prefetch("/wallet/staking");
    }, [router]);

    const {
        data: unstakeData,
        isLoading,
        refetch,
    } = useUnstakeDataQuery(telegramId);
    const stakingInfo = unstakeData?.stakingInfo ?? null;
    const withdrawals = unstakeData?.withdrawals ?? [];

    const [isProcessing, setIsProcessing] = useState(false);
    const [unstakeMode, setUnstakeMode] = useState<UnstakeMode>("best-rate");

    // TanStack Form for unstake amount
    const form = useForm({
        defaultValues: { amount: "" },
        validators: { onSubmit: stakeAmountSchema },
    });
    const [step, setStep] = useState<"input" | "processing" | "success">("input");

    // Find tsTON balance
    const tsTonJetton = jettons.find(j => 
        j.symbol === "tsTON" || 
        j.name?.toLowerCase().includes("tonstakers") ||
        j.jettonAddress?.toLowerCase() === "eqdnkm9xklq_fufntwhxhi-dqm0rakmzj96tdhkyt7deauzj"
    );
    const tsTonBalance = tsTonJetton 
        ? parseFloat(tsTonJetton.balance) / Math.pow(10, tsTonJetton.decimals)
        : 0;

    // Parse amount from form
    const unstakeAmount = form.getFieldValue("amount");
    const unstakeAmountNum = parseFloat(unstakeAmount || "0") || 0;
    const isValidAmount = unstakeAmountNum > 0 && unstakeAmountNum <= tsTonBalance;

    // Calculate received TON
    const exchangeRate = stakingInfo?.rates?.tsTONTON || 1;
    const receivedTon = unstakeAmountNum * exchangeRate;
    
    // Instant unstake has a small fee (usually 0.5-1%)
    const instantFee = 0.01; // 1%
    const receivedTonInstant = receivedTon * (1 - instantFee);

    // Handle max
    const handleMax = () => {
        form.setFieldValue("amount", tsTonBalance.toFixed(6));
    };

    // Handle unstake
    const handleUnstake = async () => {
        if (!isValidAmount || !telegramId) return;
        
        const authenticated = await requestAuth();
        if (!authenticated) {
            toast.error("Authentication required");
            return;
        }
        
        await executeUnstake();
    };

    // Execute unstake
    const executeUnstake = async () => {
        if (!telegramId) return;

        setIsProcessing(true);
        setStep("processing");

        const amount = form.getFieldValue("amount");

        try {
            const storedMnemonic = await getSecureMnemonic(telegramId);
            const storedAddress = localStorage.getItem(`quantum_wallet_address_${telegramId}`);

            if (!storedMnemonic || !storedAddress) {
                throw new Error("Wallet not found");
            }

            const mnemonic = storedMnemonic.split(" ");

            let result;
            if (unstakeMode === "instant") {
                result = await unstakeInstantTsTon(amount, storedAddress, mnemonic, false);
            } else {
                result = await unstakeTsTon(amount, storedAddress, mnemonic, false);
            }
            
            if (result.success) {
                haptics.success();
                setStep("success");
                toast.success(
                    unstakeMode === "instant" 
                        ? "Instant unstake successful!" 
                        : "Unstake initiated!",
                    {
                        description: unstakeMode === "instant"
                            ? `Received ~${receivedTonInstant.toFixed(4)} TON`
                            : "Your TON will be available in 18-36 hours",
                    }
                );
                setTimeout(() => {
                    fetchWalletAssets();
                    refetch();
                }, 3000);
            } else {
                throw new Error(result.error || "Unstaking failed");
            }
        } catch (error) {
            haptics.error();
            console.error("Unstake failed:", error);
            toast.error("Unstaking failed", {
                description: error instanceof Error ? error.message : "Unknown error",
            });
            setStep("input");
        } finally {
            setIsProcessing(false);
        }
    };

    // Format time remaining
    const formatTimeRemaining = (timestamp: number) => {
        const now = Date.now();
        const diff = timestamp - now;
        if (diff <= 0) return "Ready to claim";
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
            return `~${Math.floor(hours / 24)}d ${hours % 24}h`;
        }
        return `~${hours}h ${minutes}m`;
    };

    return (
        <div className="flex flex-col min-h-screen bg-black pb-28">
            <div className="px-4 pt-2 pb-4 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-white">Unstake tsTON</h1>
                        <p className="text-sm text-gray-500">Convert back to TON</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="text-gray-400"
                    >
                        <Icon icon="lucide:refresh-cw" className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}/>
                    </Button>
                </div>

                <AnimatePresence mode="wait">
                    {step === "input" && (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            {/* tsTON Balance */}
                            <Card className="bg-[#111] border-[#222]">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Icon icon="lucide:wallet" className="w-4 h-4 text-gray-400"/>
                                            <span className="text-sm text-gray-400">Your tsTON</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-white">{tsTonBalance.toFixed(4)} tsTON</p>
                                            {stakingInfo && (
                                                <p className="text-xs text-gray-500">
                                                    ≈ {(tsTonBalance * exchangeRate).toFixed(4)} TON
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Pending Withdrawals */}
                            {withdrawals.length > 0 && (
                                <Card className="bg-yellow-500/5 border-yellow-500/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icon icon="lucide:clock" className="w-4 h-4 text-yellow-500"/>
                                            <span className="text-sm font-medium text-yellow-400">
                                                Pending Withdrawals
                                            </span>
                                        </div>
                                        {withdrawals.map((w, i) => (
                                            <div key={i} className="flex justify-between text-sm py-1">
                                                <span className="text-gray-400">{(w.amount / 1e9).toFixed(4)} tsTON</span>
                                                <span className="text-yellow-400">{formatTimeRemaining(w.estimatedTime)}</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Unstake Mode Selection */}
                            <div className="space-y-3">
                                <Label className="text-gray-400">Unstake Method</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setUnstakeMode("best-rate")}
                                        className={`p-4 rounded-xl border transition-colors ${
                                            unstakeMode === "best-rate"
                                                ? "bg-primary/10 border-primary"
                                                : "bg-[#111] border-[#222] hover:border-[#333]"
                                        }`}
                                    >
                                        <Icon icon="lucide:clock" className={`w-5 h-5 mb-2 ${
                                            unstakeMode === "best-rate" ? "text-primary" : "text-gray-500"
                                        }`}/>
                                        <p className={`font-medium text-sm ${
                                            unstakeMode === "best-rate" ? "text-white" : "text-gray-400"
                                        }`}>Best Rate</p>
                                        <p className="text-xs text-gray-500 mt-1">18-36 hours</p>
                                    </button>
                                    <button
                                        onClick={() => setUnstakeMode("instant")}
                                        className={`p-4 rounded-xl border transition-colors ${
                                            unstakeMode === "instant"
                                                ? "bg-primary/10 border-primary"
                                                : "bg-[#111] border-[#222] hover:border-[#333]"
                                        }`}
                                    >
                                        <Icon icon="lucide:zap" className={`w-5 h-5 mb-2 ${
                                            unstakeMode === "instant" ? "text-primary" : "text-gray-500"
                                        }`}/>
                                        <p className={`font-medium text-sm ${
                                            unstakeMode === "instant" ? "text-white" : "text-gray-400"
                                        }`}>Instant</p>
                                        <p className="text-xs text-gray-500 mt-1">~1% fee</p>
                                    </button>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <Card className="bg-[#111] border-[#222]">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <Label className="text-gray-400">Amount to Unstake</Label>
                                        <button onClick={handleMax} className="text-xs text-primary">
                                            MAX
                                        </button>
                                    </div>
                                    <form.Field name="amount">
                                        {(field) => (
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <Input
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder="0.0"
                                                            value={field.state.value}
                                                            onChange={(e) => {
                                                                const value = e.target.value.replace(",", ".");
                                                                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                                                    field.handleChange(value);
                                                                }
                                                            }}
                                                            className="bg-black border-[#333] text-xl font-bold"
                                                        />
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-medium text-white">tsTON</p>
                                                    </div>
                                                </div>
                                                {field.state.meta.errors.length > 0 && (
                                                    <FieldError errors={field.state.meta.errors.map((e) => ({ message: typeof e === "string" ? e : String(e) }))} />
                                                )}
                                            </>
                                        )}
                                    </form.Field>
                                </CardContent>
                            </Card>

                            {/* You Will Receive */}
                            {unstakeAmountNum > 0 && (
                                <Card className="bg-[#111] border-[#222]">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400">You will receive</span>
                                            <div className="text-right">
                                                <p className="font-bold text-white">
                                                    ~{(unstakeMode === "instant" ? receivedTonInstant : receivedTon).toFixed(4)} TON
                                                </p>
                                                {unstakeMode === "instant" && (
                                                    <p className="text-xs text-yellow-500">
                                                        Includes {(instantFee * 100).toFixed(1)}% fee
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {unstakeMode === "best-rate" && (
                                            <div className="mt-3 pt-3 border-t border-[#222]">
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Icon icon="lucide:clock" className="w-3 h-3"/>
                                                    <span>Available in approximately 18-36 hours</span>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Warning for low balance */}
                            {tsTonBalance < 0.1 && (
                                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                    <div className="flex gap-2">
                                        <Icon icon="lucide:alert-triangle" className="w-4 h-4 text-yellow-500 shrink-0"/>
                                        <p className="text-xs text-yellow-400">
                                            You don&apos;t have any tsTON to unstake. Stake TON first to receive tsTON.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Info */}
                            <Card className="bg-primary/5 border-primary/20">
                                <CardContent className="p-4">
                                    <div className="flex gap-3">
                                        <Icon icon="lucide:info" className="w-4 h-4 text-primary shrink-0 mt-0.5"/>
                                        <p className="text-xs text-gray-400">
                                            <strong className="text-white">Best Rate</strong> gives you full value but takes 18-36 hours. 
                                            <strong className="text-white"> Instant</strong> is immediate but has a small fee.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Unstake Button */}
                            <Button
                                onClick={handleUnstake}
                                disabled={!isValidAmount || isProcessing}
                                className="w-full h-12 bg-primary text-black font-semibold rounded-xl"
                            >
                                {isProcessing ? (
                                    <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin"/>
                                ) : (
                                    <>
                                        {unstakeMode === "instant" ? (
                                            <Icon icon="lucide:zap" className="w-4 h-4 mr-2"/>
                                        ) : (
                                            <Icon icon="lucide:clock" className="w-4 h-4 mr-2"/>
                                        )}
                                        {unstakeMode === "instant" ? "Instant Unstake" : "Unstake"}
                                    </>
                                )}
                            </Button>
                        </motion.div>
                    )}

                    {step === "processing" && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-16 space-y-4"
                        >
                            <Icon icon="lucide:loader-2" className="w-12 h-12 text-primary animate-spin"/>
                            <p className="text-white font-medium">
                                {unstakeMode === "instant" ? "Unstaking instantly..." : "Initiating unstake..."}
                            </p>
                            <p className="text-sm text-gray-500">This may take a few seconds</p>
                        </motion.div>
                    )}

                    {step === "success" && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-12 space-y-4"
                        >
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                <Icon icon="lucide:check-circle" className="w-10 h-10 text-green-500"/>
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-white">
                                    {unstakeMode === "instant" ? "Unstaked!" : "Unstake Initiated!"}
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    {unstakeMode === "instant" 
                                        ? "Your TON is now in your wallet"
                                        : "Your TON will be available in 18-36 hours"}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-white">
                                    ~{(unstakeMode === "instant" ? receivedTonInstant : receivedTon).toFixed(4)} TON
                                </p>
                                <p className="text-sm text-gray-500">from {unstakeAmountNum.toFixed(4)} tsTON</p>
                            </div>
                            <Button
                                variant="outline"
                                className="mt-4"
                                asChild
                            >
                                <Link href="/wallet/staking">
                                Back to Staking
                                </Link>
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Biometric Auth */}
            <BiometricAuth
                isOpen={isAuthOpen}
                onSuccess={handleAuthSuccess}
                onCancel={handleAuthCancel}
                title="Confirm Unstake"
                description={`Unstake ${unstakeAmountNum.toFixed(4)} tsTON`}
            />
        </div>
    );
}
