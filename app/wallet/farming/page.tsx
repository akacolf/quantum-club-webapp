"use client";

import { useState, useEffect } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useFarmingDataQuery } from "@/app/(hooks)/queries/use-farming";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { useRouter } from "next/navigation";
import { farmStakeSchema } from "@/lib/validations";
import { getSecureMnemonic } from "@/lib/secure-mnemonic";
import {
    stakeLpTokens,
    unstakeLpTokens,
    type FarmPool,
    type FarmPosition,
} from "@/lib/farming-integration";

type ViewMode = "list" | "stake" | "positions" | "details";

export default function FarmingPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { walletAddress, fetchWalletAssets, jettons } = useWallet();
    const { telegramId } = useUserContext();

    const {
        data: farmingData,
        isLoading,
        refetch,
    } = useFarmingDataQuery(walletAddress);
    const farms = farmingData?.farms ?? [];
    const positions = farmingData?.positions ?? [];
    
    const {
        isOpen: isAuthOpen,
        requestAuth,
        handleSuccess: handleAuthSuccess,
        handleCancel: handleAuthCancel,
    } = useBiometricAuth();
    
    useEffect(() => {
        router.prefetch("/wallet/earn");
        router.prefetch("/wallet/liquidity");
    }, [router]);

    const [viewMode, setViewMode] = useQueryState("view", parseAsStringLiteral(["list", "stake", "positions", "details"] as const).withDefault("list").withOptions({ history: "push" }));
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedFarm, setSelectedFarm] = useState<FarmPool | null>(null);
    const [stakeAmount, setStakeAmount] = useState("");
    const [step, setStep] = useState<"input" | "confirm" | "processing" | "success">("input");

    // Custom Telegram back button that handles internal navigation
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        tg?.ready();
        
        const handleBackButtonClick = () => {
            if (viewMode === "stake" || viewMode === "details") {
                setViewMode("list");
                setSelectedFarm(null);
            } else if (viewMode === "positions") {
                setViewMode("list");
            } else {
                router.push("/wallet/earn");
            }
        };
        
        tg?.BackButton.show();
        tg?.BackButton.onClick(handleBackButtonClick);
        
        return () => {
            tg?.BackButton.offClick(handleBackButtonClick);
        };
    }, [router, viewMode, setViewMode]);

    // Find LP token balance for selected farm
    const lpBalance = selectedFarm 
        ? jettons.find(j => j.jettonAddress?.toLowerCase() === selectedFarm.lpAddress.toLowerCase())
        : null;
    const lpBalanceNum = lpBalance 
        ? parseFloat(lpBalance.balance) / Math.pow(10, lpBalance.decimals)
        : 0;

    // Handle farm selection
    const handleSelectFarm = (farm: FarmPool) => {
        setSelectedFarm(farm);
        setViewMode("stake");
        setStep("input");
        setStakeAmount("");
    };

    // Handle max
    const handleMax = () => {
        setStakeAmount(lpBalanceNum.toFixed(6));
    };

    // Validate stake
    const stakeAmountNum = parseFloat(stakeAmount) || 0;
    const isValidStake = stakeAmountNum > 0 && stakeAmountNum <= lpBalanceNum;

    // Handle stake
    const handleStake = async () => {
        // Zod schema validation at submit boundary
        const parsed = farmStakeSchema.safeParse({ amount: stakeAmount || "" });
        if (!parsed.success) {
            toast.error(parsed.error.issues[0].message);
            return;
        }

        if (!selectedFarm || !isValidStake || !telegramId) return;

        const authenticated = await requestAuth();
        if (!authenticated) {
            toast.error("Authentication required");
            return;
        }

        await executeStake();
    };

    // Execute stake
    const executeStake = async () => {
        if (!selectedFarm || !telegramId) return;
        
        setIsProcessing(true);
        setStep("processing");
        
        try {
            const storedMnemonic = await getSecureMnemonic(telegramId);
            if (!storedMnemonic) {
                throw new Error("Wallet not found");
            }

            const result = await stakeLpTokens(
                selectedFarm.address,
                selectedFarm.lpAddress,
                stakeAmount,
                storedMnemonic.split(" "),
                false
            );
            
            if (result.success) {
                haptics.success();
                setStep("success");
                toast.success("LP tokens staked successfully!");
                setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ["farming"] });
                    fetchWalletAssets();
                }, 3000);
            } else {
                throw new Error(result.error || "Staking failed");
            }
        } catch (error) {
            haptics.error();
            console.error("Stake failed:", error);
            toast.error("Staking failed", {
                description: error instanceof Error ? error.message : "Unknown error",
            });
            setStep("input");
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle unstake
    const handleUnstake = async (position: FarmPosition) => {
        if (!telegramId) return;
        
        const authenticated = await requestAuth();
        if (!authenticated) {
            toast.error("Authentication required");
            return;
        }
        
        setIsProcessing(true);
        
        try {
            const storedMnemonic = await getSecureMnemonic(telegramId);
            if (!storedMnemonic) {
                throw new Error("Wallet not found");
            }

            const result = await unstakeLpTokens(
                position.nftAddress,
                storedMnemonic.split(" "),
                false
            );
            
            if (result.success) {
                haptics.success();
                toast.success("LP tokens unstaked successfully!");
                setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ["farming"] });
                    fetchWalletAssets();
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
        } finally {
            setIsProcessing(false);
        }
    };

    // Format number
    const formatNumber = (num: number, decimals: number = 2) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
        return num.toFixed(decimals);
    };

    return (
        <div className="flex flex-col min-h-screen bg-black pb-28">
            <div className="px-4 pt-2 pb-4 space-y-5">
                <AnimatePresence mode="wait">
                    {viewMode === "list" && (
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
                                    <h1 className="text-2xl font-bold text-white">Farming</h1>
                                    <p className="text-sm text-gray-500">Stake LP tokens to earn rewards</p>
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

                            {/* Stats Row */}
                            <div className="grid grid-cols-2 gap-3">
                                <Card className="bg-[#111] border-[#222]">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon icon="lucide:sprout" className="w-4 h-4 text-green-500"/>
                                            <span className="text-xs text-gray-500">Active Farms</span>
                                        </div>
                                        <p className="text-xl font-bold text-white">{farms.length}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-[#111] border-[#222]">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon icon="lucide:gift" className="w-4 h-4 text-primary"/>
                                            <span className="text-xs text-gray-500">Your Positions</span>
                                        </div>
                                        <p className="text-xl font-bold text-white">{positions.length}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Your Positions */}
                            {positions.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-white">Your Positions</h3>
                                        <Badge variant="secondary" className="bg-green-500/10 text-green-400">
                                            Earning
                                        </Badge>
                                    </div>
                                    {positions.map((position, i) => (
                                        <Card key={i} className="bg-[#111] border-[#222]">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center">
                                                            <Icon icon="lucide:sprout" className="w-4 h-4 text-green-500"/>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white text-sm">{position.poolName}</p>
                                                            <p className="text-xs text-gray-500">Staked LP</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-medium text-white text-sm">
                                                            {formatNumber(parseFloat(position.stakedLpAmount) / 1e9)} LP
                                                        </p>
                                                        <p className="text-xs text-green-400">
                                                            +{formatNumber(parseFloat(position.pendingRewards) / 1e9)} {position.rewardTokenSymbol}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => handleUnstake(position)}
                                                    disabled={isProcessing || !position.nftAddress}
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full border-[#333] text-gray-400"
                                                >
                                                    {isProcessing ? <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin"/> : "Unstake & Claim"}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {/* Available Farms */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-white">Available Farms</h3>
                                
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Icon icon="lucide:loader-2" className="w-6 h-6 animate-spin text-gray-500"/>
                                    </div>
                                ) : farms.length === 0 ? (
                                    <Card className="bg-[#111] border-[#222]">
                                        <CardContent className="py-8 text-center">
                                            <Icon icon="lucide:sprout" className="w-10 h-10 text-gray-600 mx-auto mb-3"/>
                                            <p className="text-gray-500 text-sm">No farming pools available</p>
                                            <p className="text-gray-600 text-xs mt-1">Check back later</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    farms.slice(0, 10).map((farm, i) => (
                                        <Card 
                                            key={i} 
                                            className="bg-[#111] border-[#222] hover:bg-[#161616] cursor-pointer transition-colors"
                                            onClick={() => handleSelectFarm(farm)}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center">
                                                            <Icon icon="lucide:sprout" className="w-5 h-5 text-green-500"/>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white text-sm">{farm.poolName}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {farm.apr && (
                                                                    <Badge variant="secondary" className="bg-green-500/10 text-green-400 text-xs">
                                                                        {farm.apr.toFixed(1)}% APR
                                                                    </Badge>
                                                                )}
                                                                <span className="text-xs text-gray-500 flex items-center gap-0.5">
                                                                    <Icon icon="lucide:arrow-right" className="w-3 h-3"/> {farm.rewardTokenSymbol}
                                                                </span>
                                                            </div>
                                                            {farm.tvl && farm.tvl > 0 && (
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    ${formatNumber(farm.tvl)} TVL
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Icon icon="lucide:arrow-right" className="w-4 h-4 text-gray-500"/>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>

                            {/* Info Card */}
                            <Card className="bg-primary/5 border-primary/20">
                                <CardContent className="p-4">
                                    <div className="flex gap-3">
                                        <Icon icon="lucide:info" className="w-4 h-4 text-primary shrink-0 mt-0.5"/>
                                        <div className="space-y-1">
                                            <p className="text-sm text-white font-medium">How Farming Works</p>
                                            <p className="text-xs text-gray-400">
                                                1. Add liquidity to a DEX pool to receive LP tokens<br/>
                                                2. Stake your LP tokens in a farm<br/>
                                                3. Earn <strong className="text-primary">STON tokens</strong> as rewards over time<br/>
                                                4. Unstake anytime to claim your LP + rewards
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Link to Liquidity */}
                            <Button
                                variant="outline"
                                className="w-full border-[#333] text-gray-400"
                                asChild
                            >
                                <Link href="/wallet/liquidity">
                                    <Icon icon="lucide:coins" className="w-4 h-4 mr-2"/>
                                    Add Liquidity First
                                </Link>
                            </Button>
                        </motion.div>
                    )}

                    {viewMode === "stake" && selectedFarm && (
                        <motion.div
                            key="stake"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-5"
                        >
                            {/* Header */}
                            <div>
                                <h1 className="text-xl font-bold text-white">Stake LP Tokens</h1>
                                <p className="text-sm text-gray-500">{selectedFarm.poolName}</p>
                            </div>

                            {step === "input" && (
                                <>
                                    {/* Farm Info */}
                                    <Card className="bg-[#111] border-[#222]">
                                        <CardContent className="p-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">APR</p>
                                                    <p className="text-lg font-bold text-green-400">
                                                        {selectedFarm.apr ? `${selectedFarm.apr.toFixed(1)}%` : "~"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">Total Value Locked</p>
                                                    <p className="text-lg font-bold text-white">
                                                        {selectedFarm.tvl ? `$${formatNumber(selectedFarm.tvl)}` : "~"}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* LP Balance */}
                                    <Card className="bg-[#111] border-[#222]">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <Label className="text-gray-400">Your LP Balance</Label>
                                                <button onClick={handleMax} className="text-xs text-primary">
                                                    MAX
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <Input
                                                        type="number"
                                                        placeholder="0.0"
                                                        value={stakeAmount}
                                                        onChange={(e) => setStakeAmount(e.target.value)}
                                                        className="bg-black border-[#333] text-xl font-bold"
                                                    />
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-white">LP</p>
                                                    <p className="text-xs text-gray-500">
                                                        Bal: {lpBalanceNum.toFixed(4)}
                                                    </p>
                                                </div>
                                            </div>
                                            {lpBalanceNum === 0 && (
                                                <p className="text-xs text-yellow-500 mt-2">
                                                    You need LP tokens to stake. Add liquidity first.
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Estimated Earnings */}
                                    {stakeAmountNum > 0 && selectedFarm.apr && (
                                        <Card className="bg-[#111] border-[#222]">
                                            <CardContent className="p-4">
                                                <p className="text-xs text-gray-500 mb-2">Estimated Yearly Rewards</p>
                                                <p className="text-lg font-bold text-green-400">
                                                    +{((stakeAmountNum * selectedFarm.apr) / 100).toFixed(4)} LP value
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Stake Button */}
                                    <Button
                                        onClick={handleStake}
                                        disabled={!isValidStake || isProcessing}
                                        className="w-full h-12 bg-primary text-black font-semibold rounded-xl"
                                    >
                                        {isProcessing ? (
                                            <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin"/>
                                        ) : (
                                            <>
                                                <Icon icon="lucide:sprout" className="w-4 h-4 mr-2"/>
                                                Stake LP Tokens
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}

                            {step === "processing" && (
                                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                                    <Icon icon="lucide:loader-2" className="w-12 h-12 text-primary animate-spin"/>
                                    <p className="text-white font-medium">Staking LP tokens...</p>
                                    <p className="text-sm text-gray-500">This may take a few seconds</p>
                                </div>
                            )}

                            {step === "success" && (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                        <Icon icon="lucide:check-circle" className="w-10 h-10 text-green-500"/>
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold text-white">Staked Successfully!</h3>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Your LP tokens are now earning rewards
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-white">{stakeAmount} LP</p>
                                        {selectedFarm.apr && (
                                            <p className="text-sm text-green-400">~{selectedFarm.apr.toFixed(1)}% APR</p>
                                        )}
                                    </div>
                                    <Button
                                        onClick={() => {
                                            setViewMode("list");
                                            setSelectedFarm(null);
                                            setStep("input");
                                        }}
                                        variant="outline"
                                        className="mt-4"
                                    >
                                        Back to Farms
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Biometric Auth */}
            <BiometricAuth
                isOpen={isAuthOpen}
                onSuccess={handleAuthSuccess}
                onCancel={handleAuthCancel}
                title="Confirm Farming"
                description="Authenticate to stake your LP tokens"
            />
        </div>
    );
}
