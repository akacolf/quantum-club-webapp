"use client";

import { useState, useEffect } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useWallet } from "../WalletContext";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { toast } from "sonner";
import Image from "next/image";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { stakeAmountSchema } from "@/lib/validations";
import { getSecureMnemonic } from "@/lib/secure-mnemonic";
import {
    calculateRewards,
    validateStakeAmount,
    executeStake,
    type StakingPool,
} from "@/lib/staking-service";
import { useStakingApyQuery } from "@/app/(hooks)/queries/use-staking-pools";



export default function StakingPage() {
    const router = useRouter();
    const { tonBalance, tonPrice, fetchWalletAssets } = useWallet();
    const { telegramId } = useUserContext();
    
    const {
        isOpen: isAuthOpen,
        requestAuth,
        handleSuccess: handleAuthSuccess,
        handleCancel: handleAuthCancel,
    } = useBiometricAuth();
    
    useEffect(() => {
        router.prefetch("/wallet");
        router.prefetch("/wallet/unstake");
    }, [router]);

    const [viewMode, setViewMode] = useQueryState("view", parseAsStringLiteral(["list", "stake"] as const).withDefault("list").withOptions({ history: "replace" }));
    const { data: stakingData, isLoading, refetch: fetchStakingData } = useStakingApyQuery();
    const pools = stakingData?.pools ?? [];
    const [isStaking, setIsStaking] = useState(false);
    const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
    const [step, setStep] = useState<"input" | "confirm" | "processing" | "success">("input");

    // TanStack Form for stake amount
    const form = useForm({
        defaultValues: { amount: "" },
        validators: { onSubmit: stakeAmountSchema },
    });

    // Custom Telegram back button that handles internal navigation
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        tg?.ready();

        const handleBackButtonClick = () => {
            if (viewMode === "stake") {
                // Go back to pool list
                setViewMode("list");
                setSelectedPool(null);
                form.setFieldValue("amount", "");
                setStep("input");
            } else {
                // Go back to wallet
                router.push("/wallet");
            }
        };

        tg?.BackButton.show();
        tg?.BackButton.onClick(handleBackButtonClick);

        return () => {
            tg?.BackButton.offClick(handleBackButtonClick);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- form is a stable TanStack Form instance; only re-register when viewMode or router changes
    }, [router, viewMode]);


    const tonBalanceNum = parseFloat(tonBalance) || 0;
    const tonValueUsd = tonBalanceNum * tonPrice;
    const stakeAmount = form.getFieldValue("amount");
    const stakeAmountNum = parseFloat(stakeAmount) || 0;

    // Average APY
    const avgApy = pools.length > 0 
        ? pools.reduce((sum, p) => sum + p.liveApy, 0) / pools.length 
        : 0;

    // Total staked across all providers (mock calculation)
    // Could be used for displaying aggregate TVL in the future

    // Handle selecting a pool
    const handleSelectPool = (pool: StakingPool) => {
        setSelectedPool(pool);
        setViewMode("stake");
        setStep("input");
        form.setFieldValue("amount", "");
    };

    // Handle max amount
    const handleMax = () => {
        // Leave 0.1 TON for gas
        const maxAmount = Math.max(0, tonBalanceNum - 0.1);
        form.setFieldValue("amount", maxAmount.toFixed(4));
    };

    // Validate current stake
    const validation = selectedPool 
        ? validateStakeAmount(selectedPool, stakeAmountNum, tonBalanceNum)
        : { valid: false, error: "Select a pool" };

    // Handle stake confirmation
    const handleConfirmStake = async () => {
        if (!selectedPool || !validation.valid) return;
        
        const authenticated = await requestAuth();
        if (!authenticated) {
            toast.error("Authentication required");
            return;
        }
        
        await executeStakeTransaction();
    };

    // Execute stake transaction
    const executeStakeTransaction = async () => {
        if (!selectedPool || !telegramId) return;

        setIsStaking(true);
        setStep("processing");

        const amount = form.getFieldValue("amount");

        try {
            const storedMnemonic = await getSecureMnemonic(telegramId);
            if (!storedMnemonic) {
                throw new Error("Wallet not found");
            }

            const mnemonic = storedMnemonic.split(" ");

            const result = await executeStake(
                selectedPool,
                amount,
                mnemonic
            );

            if (result.success) {
                setStep("success");
                toast.success(`Staked ${amount} TON`, {
                    description: `You'll receive ${result.estimatedLiquidTokens} ${selectedPool.liquidToken}`,
                });
                
                // Refresh balances after a delay
                setTimeout(() => {
                    fetchWalletAssets();
                }, 3000);
            } else {
                throw new Error(result.error || "Transaction failed");
            }
        } catch (error) {
            console.error("Stake failed:", error);
            toast.error("Stake failed", {
                description: error instanceof Error ? error.message : "Transaction failed",
            });
            setStep("input");
        } finally {
            setIsStaking(false);
        }
    };

    // Estimated rewards for selected pool
    const rewards = selectedPool && stakeAmountNum > 0
        ? calculateRewards(stakeAmountNum, selectedPool.apy)
        : null;

    return (
        <div className="flex flex-col min-h-screen bg-black pb-28">
            <div className="px-4 pt-2 pb-4 space-y-5">
                <AnimatePresence mode="wait">
                    {viewMode === "list" ? (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-5"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h1 className="text-2xl font-bold text-white">TON Staking</h1>
                                    <p className="text-sm text-gray-500">
                                        Stake TON and earn passive rewards
                                    </p>
                                </div>
                                <button
                                    onClick={() => fetchStakingData()}
                                    disabled={isLoading}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:bg-white/10"
                                >
                                    <Icon icon="lucide:refresh-cw" className={`w-5 h-5 text-gray-400 ${isLoading ? "animate-spin" : ""}`}/>
                                </button>
                            </div>

                            {/* Stats Overview */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-3 rounded-xl bg-[#111] border border-[#222] text-center">
                                    <p className="text-xs text-gray-500 mb-1">Avg APY</p>
                                    <p className="text-lg font-bold text-green-500">{avgApy.toFixed(2)}%</p>
                                </div>
                                <div className="p-3 rounded-xl bg-[#111] border border-[#222] text-center">
                                    <p className="text-xs text-gray-500 mb-1">Your Balance</p>
                                    <p className="text-lg font-bold text-white">{tonBalanceNum.toFixed(2)}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-[#111] border border-[#222] text-center">
                                    <p className="text-xs text-gray-500 mb-1">Providers</p>
                                    <p className="text-lg font-bold text-white">{pools.length}</p>
                                </div>
                            </div>

                            {/* Available Balance Card */}
                            <div className="p-4 rounded-xl bg-[#111] border border-[#222]">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Image
                                            src="/svg/ton-logo.svg"
                                            alt="TON"
                                            width={32}
                                            height={32}
                                            className="w-8 h-8"
                                        />
                                        <div>
                                            <p className="text-sm text-gray-500">Available to Stake</p>
                                            <p className="text-xl font-bold text-white">{tonBalanceNum.toFixed(4)} TON</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">${tonValueUsd.toFixed(2)}</p>
                                    </div>
                                </div>
                                {tonBalanceNum > 1 && avgApy > 0 && (
                                    <div className="pt-3 border-t border-[#222]">
                                        <p className="text-xs text-gray-500">
                                            If you stake all: <span className="text-green-500 font-medium">
                                                +{(tonBalanceNum * avgApy / 100).toFixed(3)} TON/year
                                            </span> (~${((tonBalanceNum * avgApy / 100) * tonPrice).toFixed(2)})
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Unstake Button */}
                            <button
                                onClick={() => router.push("/wallet/unstake")}
                                className="w-full p-4 rounded-xl bg-[#111] border border-[#222] flex items-center justify-between hover:bg-[#161616] transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#222] flex items-center justify-center">
                                        <Icon icon="lucide:arrow-up-right" className="w-5 h-5 text-gray-400"/>
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-white text-sm">Unstake tsTON</p>
                                        <p className="text-xs text-gray-500">Convert tsTON back to TON</p>
                                    </div>
                                </div>
                                <Icon icon="lucide:arrow-right" className="w-4 h-4 text-gray-500"/>
                            </button>

                            {/* Staking Pools */}
                            <div className="space-y-3">
                                <h2 className="text-base font-semibold text-white">Choose a Pool</h2>

                                {isLoading ? (
                                    <div className="flex justify-center py-8">
                                        <ButtonLoader size="lg" />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pools.map((pool) => {
                                            const poolRewards = calculateRewards(tonBalanceNum, pool.liveApy);
                                            
                                            return (
                                                <motion.div
                                                    key={pool.id}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="rounded-xl bg-[#111] border border-[#222] overflow-hidden"
                                                >
                                                    <button
                                                        onClick={() => handleSelectPool(pool)}
                                                        className="w-full p-4 text-left active:bg-[#161616]"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-12 h-12 rounded-xl bg-[#222] overflow-hidden flex-shrink-0">
                                                                <Image
                                                                    src={pool.icon}
                                                                    alt={pool.name}
                                                                    width={48}
                                                                    height={48}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h3 className="font-semibold text-white">{pool.name}</h3>
                                                                    {pool.isInstantUnstake && (
                                                                        <Badge variant="secondary" className="text-[10px] h-5 whitespace-nowrap">
                                                                            Instant Unstake
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Features - filter out "Instant unstake" if already showing badge */}
                                                                <div className="flex flex-wrap gap-1 mb-2">
                                                                    {pool.features
                                                                        .filter(f => !pool.isInstantUnstake || !f.toLowerCase().includes("instant"))
                                                                        .slice(0, 3)
                                                                        .map((feature, i) => (
                                                                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-gray-500 whitespace-nowrap">
                                                                            {feature}
                                                                        </span>
                                                                    ))}
                                                                </div>

                                                                {/* Stats Row */}
                                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                                    <span className="flex items-center gap-1">
                                                                        <Icon icon="lucide:coins" className="w-3 h-3"/>
                                                                        Min: {pool.minStake} TON
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Icon icon="lucide:clock" className="w-3 h-3"/>
                                                                        {pool.unstakeTime}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <p className="text-xl font-bold text-green-500">{pool.liveApy.toFixed(2)}%</p>
                                                                <p className="text-xs text-gray-500">APY</p>
                                                                <p className="text-[10px] text-blue-400 mt-1 flex items-center gap-0.5">
                                                                    <Icon icon="lucide:arrow-right" className="w-3 h-3"/> {pool.liquidToken}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Potential Rewards */}
                                                        {tonBalanceNum >= pool.minStake && (
                                                            <div className="mt-3 pt-3 border-t border-[#222] grid grid-cols-3 gap-2 text-center">
                                                                <div>
                                                                    <p className="text-xs text-gray-500">Daily</p>
                                                                    <p className="text-sm font-medium text-white">
                                                                        +{poolRewards.daily.toFixed(4)}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-500">Monthly</p>
                                                                    <p className="text-sm font-medium text-white">
                                                                        +{poolRewards.monthly.toFixed(3)}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-500">Yearly</p>
                                                                    <p className="text-sm font-medium text-white">
                                                                        +{poolRewards.yearly.toFixed(2)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-primary">
                                                            <span>Stake Now</span>
                                                            <Icon icon="lucide:arrow-right" className="w-4 h-4"/>
                                                        </div>
                                                    </button>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Info Card */}
                            <div className="p-4 rounded-xl bg-[#111] border border-[#222]">
                                <div className="flex gap-3">
                                    <Icon icon="lucide:info" className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5"/>
                                    <div>
                                        <p className="text-sm font-medium text-gray-400">
                                            What is Liquid Staking?
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Liquid staking lets you stake TON while receiving a liquid token (like tsTON or stTON) that you can use in DeFi while still earning staking rewards. Your staked TON automatically compounds.
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                <Icon icon="lucide:check-circle" className="w-3 h-3 text-gray-400"/>
                                                Earn ~5% APY
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                <Icon icon="lucide:check-circle" className="w-3 h-3 text-gray-400"/>
                                                Stay liquid
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                <Icon icon="lucide:check-circle" className="w-3 h-3 text-gray-400"/>
                                                Auto-compound
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="stake"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-5"
                        >
                            {/* Header */}
                            <div>
                                <h1 className="text-xl font-bold text-white">Stake with {selectedPool?.name}</h1>
                                <p className="text-sm text-gray-500">
                                    You&apos;ll receive {selectedPool?.liquidToken} tokens
                                </p>
                            </div>

                            <AnimatePresence mode="wait">
                                {step === "input" && (
                                    <motion.div
                                        key="stake-input"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        {/* Pool Info Card */}
                                        {selectedPool && (
                                            <Card className="bg-[#111] border-[#222]">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl bg-[#222] overflow-hidden">
                                                            <Image
                                                                src={selectedPool.icon}
                                                                alt={selectedPool.name}
                                                                width={48}
                                                                height={48}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-white">{selectedPool.name}</p>
                                                            <p className="text-sm text-gray-500">{selectedPool.description}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xl font-bold text-green-500">{selectedPool.apy.toFixed(2)}%</p>
                                                            <p className="text-xs text-gray-500">APY</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Amount Input */}
                                        <Card className="bg-[#111] border-[#222]">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm text-gray-400">Amount to Stake</Label>
                                                    <span className="text-xs text-gray-500">
                                                        Balance: {tonBalanceNum.toFixed(4)} TON
                                                    </span>
                                                </div>
                                                <form.Field name="amount">
                                                    {(field) => (
                                                        <>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#222]">
                                                                    <Image
                                                                        src="/svg/ton-logo.svg"
                                                                        alt="TON"
                                                                        width={24}
                                                                        height={24}
                                                                        className="w-6 h-6"
                                                                    />
                                                                    <span className="font-bold text-white">TON</span>
                                                                </div>
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
                                                                    className="flex-1 bg-transparent border-0 text-2xl font-bold text-right h-12 focus-visible:ring-0"
                                                                />
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={handleMax}
                                                                    className="text-primary border-primary/30"
                                                                >
                                                                    MAX
                                                                </Button>
                                                            </div>
                                                            {field.state.meta.errors.length > 0 && (
                                                                <FieldError errors={field.state.meta.errors.map((e) => ({ message: typeof e === "string" ? e : String(e) }))} />
                                                            )}
                                                        </>
                                                    )}
                                                </form.Field>
                                                {stakeAmountNum > 0 && (
                                                    <p className="text-right text-sm text-gray-500">
                                                        ≈ ${(stakeAmountNum * tonPrice).toFixed(2)}
                                                    </p>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* You Will Receive */}
                                        {selectedPool && stakeAmountNum > 0 && (
                                            <Card className="bg-[#111] border-[#222]">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-sm text-gray-400">You Will Receive</span>
                                                        <div className="flex items-center gap-2">
                                                            <Image
                                                                src={selectedPool.liquidTokenIcon}
                                                                alt={selectedPool.liquidToken}
                                                                width={20}
                                                                height={20}
                                                                className="w-5 h-5 rounded-full"
                                                            />
                                                            <span className="font-bold text-white">
                                                                ~{stakeAmountNum.toFixed(4)} {selectedPool.liquidToken}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Estimated Rewards */}
                                        {rewards && stakeAmountNum > 0 && (
                                            <Card className="bg-green-500/10 border-green-500/20">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Icon icon="lucide:gift" className="w-5 h-5 text-green-500"/>
                                                        <span className="font-medium text-green-500">Estimated Rewards</span>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2 text-center">
                                                        <div>
                                                            <p className="text-xs text-gray-500">Daily</p>
                                                            <p className="text-sm font-medium text-white">+{rewards.daily.toFixed(4)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500">Weekly</p>
                                                            <p className="text-sm font-medium text-white">+{rewards.weekly.toFixed(4)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500">Monthly</p>
                                                            <p className="text-sm font-medium text-white">+{rewards.monthly.toFixed(3)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500">Yearly</p>
                                                            <p className="text-sm font-medium text-white">+{rewards.yearly.toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Stake Button */}
                                        <Button
                                            onClick={handleConfirmStake}
                                            disabled={!validation.valid || isStaking}
                                            className="w-full h-14 bg-primary text-primary-foreground rounded-xl font-bold text-lg"
                                        >
                                            {isStaking ? (
                                                <>
                                                    <Icon icon="lucide:loader-2" className="w-5 h-5 mr-2 animate-spin"/>
                                                    Processing...
                                                </>
                                            ) : !stakeAmount ? (
                                                "Enter Amount"
                                            ) : !validation.valid ? (
                                                validation.error
                                            ) : (
                                                `Stake ${stakeAmountNum.toFixed(2)} TON`
                                            )}
                                        </Button>
                                    </motion.div>
                                )}

                                {step === "processing" && (
                                    <motion.div
                                        key="stake-processing"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center py-16 space-y-4"
                                    >
                                        <div className="relative mx-auto w-20 h-20">
                                            <div className="w-full h-full rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                        </div>
                                        <h2 className="text-xl font-bold text-white">Staking in Progress...</h2>
                                        <p className="text-gray-500 text-sm">
                                            Please wait while your transaction is processed
                                        </p>
                                    </motion.div>
                                )}

                                {step === "success" && (
                                    <motion.div
                                        key="stake-success"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center py-16 space-y-4"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                                            <Icon icon="lucide:check-circle" className="w-10 h-10 text-green-500"/>
                                        </div>
                                        <h2 className="text-xl font-bold text-green-500">Staked Successfully!</h2>
                                        <p className="text-gray-500 text-sm">
                                            You&apos;ve staked {stakeAmount} TON with {selectedPool?.name}
                                        </p>
                                        <p className="text-sm text-white">
                                            You&apos;ll receive ~{stakeAmountNum.toFixed(4)} {selectedPool?.liquidToken}
                                        </p>
                                        <Button
                                            onClick={() => {
                                                setViewMode("list");
                                                setSelectedPool(null);
                                                form.setFieldValue("amount", "");
                                                setStep("input");
                                            }}
                                            variant="outline"
                                            className="mt-4"
                                        >
                                            Back to Pools
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Biometric Auth */}
            <BiometricAuth
                isOpen={isAuthOpen}
                onSuccess={handleAuthSuccess}
                onCancel={handleAuthCancel}
                title="Confirm Stake"
                description="Authenticate to stake your TON"
            />
        </div>
    );
}
