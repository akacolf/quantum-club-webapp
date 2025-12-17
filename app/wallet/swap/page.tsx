"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
    ArrowDownUp,
    ChevronDown,
    ExternalLink,
    AlertTriangle,
    Info,
    Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Loader from "@/app/(components)/Loader";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { beginCell, Address } from "@ton/core";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { useWallet, IS_TESTNET } from "../WalletContext";
import {
    fetchSwappableAssets,
    simulateSwap,
    toUnits,
    fromUnits,
    formatSwapRate,
    type SwapAsset,
    type SwapSimulation,
} from "@/lib/stonfi";
import { dexFactory } from "@ston-fi/sdk";
import { TonClient } from "@ton/ton";

export default function SwapPage() {
    useTelegramBackButton("/wallet");
    const router = useRouter();

    const {
        isOpen: isAuthOpen,
        requestAuth,
        handleSuccess: handleAuthSuccess,
        handleCancel: handleAuthCancel,
    } = useBiometricAuth();

    const {
        walletAddress,
        tonBalance,
        jettons,
        isLoadingAssets: isContextLoading,
        hasFetched,
        fetchWalletAssets,
    } = useWallet();

    const TON_API_BASE_URL = IS_TESTNET
        ? "https://testnet.tonapi.io"
        : "https://tonapi.io";

    // State
    const [step, setStep] = useState<"input" | "confirm" | "processing" | "success">("input");
    const [swapAssets, setSwapAssets] = useState<SwapAsset[]>([]);
    const [isLoadingAssets, setIsLoadingAssets] = useState(true);
    const [fromAsset, setFromAsset] = useState<SwapAsset | null>(null);
    const [toAsset, setToAsset] = useState<SwapAsset | null>(null);
    const [amount, setAmount] = useState("");
    const [simulation, setSimulation] = useState<SwapSimulation | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isSwapping, setIsSwapping] = useState(false);
    const [lastTxHash, setLastTxHash] = useState<string | null>(null);
    const [slippage, setSlippage] = useState("1"); // 1% default

    const EXPLORER_BASE_URL = IS_TESTNET
        ? "https://testnet.tonviewer.com"
        : "https://tonviewer.com";

    // Redirect if no wallet
    useEffect(() => {
        const storedWallet = localStorage.getItem("quantum_wallet_address");
        if (!storedWallet) {
            router.push("/wallet");
        } else {
            // Refresh wallet assets on page load to get latest balances
            fetchWalletAssets();
        }
    }, [router, fetchWalletAssets]);

    // Load swappable assets on mount
    useEffect(() => {
        const loadAssets = async () => {
            setIsLoadingAssets(true);
            try {
                const assets = await fetchSwappableAssets();
                setSwapAssets(assets);

                // Set default assets (TON as from, first jetton as to)
                const tonAsset = assets.find((a) => a.kind === "Ton");
                const firstJetton = assets.find((a) => a.kind === "Jetton");

                if (tonAsset) setFromAsset(tonAsset);
                if (firstJetton) setToAsset(firstJetton);
            } catch (error) {
                console.error("Failed to load assets:", error);
                toast.error("Failed to load swap assets");
            } finally {
                setIsLoadingAssets(false);
            }
        };

        loadAssets();
    }, []);

    // Helper to convert address to raw format for comparison
    const toRawAddress = (addr: string): string => {
        if (!addr) return "";
        try {
            // Try to parse as Address and get raw format
            const parsed = Address.parse(addr);
            return parsed.toRawString().toLowerCase();
        } catch {
            // If parsing fails, try basic normalization
            if (addr.includes(":")) {
                return addr.toLowerCase();
            }
            return addr.toLowerCase();
        }
    };

    // Get user's balance for an asset
    const getAssetBalance = useCallback(
        (asset: SwapAsset | null): string => {
            if (!asset) return "0";

            if (asset.kind === "Ton") {
                return tonBalance;
            }

            // Convert STON.fi asset address to raw format
            const assetRaw = toRawAddress(asset.contractAddress);

            const jetton = jettons.find((j) => {
                if (!j.jettonAddress) return false;
                // Convert wallet jetton address to raw format
                const jettonRaw = toRawAddress(j.jettonAddress);
                return jettonRaw === assetRaw;
            });

            if (jetton) {
                return (
                    parseFloat(jetton.balance) / Math.pow(10, jetton.decimals)
                ).toFixed(4);
            }

            return "0";
        },
        [tonBalance, jettons]
    );

    // Debounced simulation
    useEffect(() => {
        if (!fromAsset || !toAsset || !amount || parseFloat(amount) <= 0) {
            setSimulation(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSimulating(true);
            try {
                const offerUnits = toUnits(amount, fromAsset.decimals);
                const slippageTolerance = (parseFloat(slippage) / 100).toString();

                const result = await simulateSwap(
                    fromAsset.contractAddress,
                    toAsset.contractAddress,
                    offerUnits,
                    slippageTolerance
                );

                setSimulation(result);
            } catch (error) {
                console.error("Simulation failed:", error);
                setSimulation(null);
            } finally {
                setIsSimulating(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [fromAsset, toAsset, amount, slippage]);

    // Handle swap direction toggle
    const handleToggleDirection = () => {
        const temp = fromAsset;
        setFromAsset(toAsset);
        setToAsset(temp);
        setAmount("");
        setSimulation(null);
    };

    // Handle max amount - set full balance, fees shown separately
    const handleMaxAmount = () => {
        if (fromAsset) {
            const balance = getAssetBalance(fromAsset);
            const balanceNum = parseFloat(balance) || 0;

            if (balanceNum <= 0) {
                toast.error("You don't have any " + fromAsset.symbol + " to swap");
                return;
            }

            setAmount(balance);
        }
    };

    // Validation
    const canProceed = useMemo(() => {
        if (!fromAsset || !toAsset || !amount || parseFloat(amount) <= 0)
            return false;
        if (!simulation) return false;

        const balance = parseFloat(getAssetBalance(fromAsset));
        const sendAmount = parseFloat(amount);

        if (sendAmount > balance) return false;

        // Check TON balance for gas
        if (fromAsset.kind === "Jetton" && parseFloat(tonBalance) < 0.1)
            return false;

        return true;
    }, [fromAsset, toAsset, amount, simulation, getAssetBalance, tonBalance]);

    // Handle continue to confirm
    const handleContinue = () => {
        if (canProceed) {
            setStep("confirm");
        }
    };

    // Handle confirm swap
    const handleConfirmSwap = async () => {
        const authenticated = await requestAuth();

        if (authenticated) {
            await executeSwap();
        } else {
            toast.error("Authentication required to swap");
        }
    };

    // Execute swap
    const executeSwap = async () => {
        const storedMnemonic = localStorage.getItem("quantum_wallet_mnemonic");
        if (!storedMnemonic || !simulation || !fromAsset || !toAsset) {
            toast.error("Wallet credentials not found");
            return;
        }

        setIsSwapping(true);
        setStep("processing");

        try {
            const mnemonic = storedMnemonic.split(" ");
            const keyPair = await mnemonicToPrivateKey(mnemonic);

            const wallet = WalletContractV5R1.create({
                workchain: 0,
                publicKey: keyPair.publicKey,
            });

            const ta = new TonApiClient({ baseUrl: TON_API_BASE_URL });
            const adapter = new ContractAdapter(ta);
            const contract = adapter.open(wallet);

            // Get seqno
            let seqno = 0;
            let isWalletDeployed = false;

            try {
                const state = await ta.accounts.getAccount(wallet.address);
                isWalletDeployed = state.status === "active";

                if (isWalletDeployed) {
                    seqno = await contract.getSeqno();
                }
            } catch {
                isWalletDeployed = false;
                seqno = 0;
            }

            // Build swap transaction using STON.fi SDK
            const tonClient = new TonClient({
                endpoint: "https://toncenter.com/api/v2/jsonRPC",
            });

            const dexContracts = dexFactory(simulation.router);
            const router = tonClient.open(
                dexContracts.Router.create(simulation.router.address)
            );
            const proxyTon = dexContracts.pTON.create(
                simulation.router.ptonMasterAddress
            );

            let txParams;

            if (fromAsset.kind === "Ton") {
                // TON -> Jetton
                // Use the original toAsset.contractAddress to ensure correct direction
                txParams = await router.getSwapTonToJettonTxParams({
                    userWalletAddress: walletAddress,
                    offerAmount: simulation.offerUnits,
                    minAskAmount: simulation.minAskUnits,
                    askJettonAddress: toAsset.contractAddress,
                    proxyTon,
                });
            } else if (toAsset.kind === "Ton") {
                // Jetton -> TON
                // Use the original fromAsset.contractAddress to ensure correct direction
                txParams = await router.getSwapJettonToTonTxParams({
                    userWalletAddress: walletAddress,
                    offerJettonAddress: fromAsset.contractAddress,
                    offerAmount: simulation.offerUnits,
                    minAskAmount: simulation.minAskUnits,
                    proxyTon,
                });
            } else {
                // Jetton -> Jetton
                // Use the original asset addresses to ensure correct direction
                txParams = await router.getSwapJettonToJettonTxParams({
                    userWalletAddress: walletAddress,
                    offerJettonAddress: fromAsset.contractAddress,
                    askJettonAddress: toAsset.contractAddress,
                    offerAmount: simulation.offerUnits,
                    minAskAmount: simulation.minAskUnits,
                });
            }

            // Send the transaction
            if (!isWalletDeployed && seqno === 0) {
                // First transaction with wallet deployment
                const transfer = wallet.createTransfer({
                    seqno: 0,
                    secretKey: keyPair.secretKey,
                    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
                    messages: [internal(txParams)],
                });

                const externalMessage = beginCell()
                    .storeWritable((builder) => {
                        builder.storeUint(0b10, 2);
                        builder.storeUint(0, 2);
                        builder.storeAddress(wallet.address);
                        builder.storeCoins(0);
                    })
                    .storeBit(true)
                    .storeBit(true)
                    .storeRef(
                        beginCell()
                            .storeUint(0, 2)
                            .storeMaybeRef(wallet.init.code)
                            .storeMaybeRef(wallet.init.data)
                            .storeUint(0, 1)
                            .endCell()
                    )
                    .storeBit(true)
                    .storeRef(transfer)
                    .endCell();

                const boc = externalMessage.toBoc().toString("base64");
                await fetch(`${TON_API_BASE_URL}/v2/blockchain/message`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ boc }),
                });
            } else {
                // Normal transfer
                await contract.sendTransfer({
                    seqno,
                    secretKey: keyPair.secretKey,
                    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
                    messages: [internal(txParams)],
                });
            }

            setLastTxHash(walletAddress || "");
            setStep("success");
            toast.success("Swap transaction sent!");

            // Refresh assets after delay
            setTimeout(() => {
                fetchWalletAssets();
            }, 5000);
        } catch (error) {
            console.error("Swap failed:", error);
            const errorMessage =
                error instanceof Error ? error.message : "Swap failed";
            toast.error(`Swap failed: ${errorMessage}`);
            setStep("input");
        } finally {
            setIsSwapping(false);
        }
    };

    // Loading state
    if (isLoadingAssets || (isContextLoading && !hasFetched)) {
        return <Loader />;
    }

    // Get expected output amount for display
    const expectedOutput = simulation
        ? fromUnits(simulation.askUnits, toAsset?.decimals || 9)
        : "";
    const minimumReceived = simulation
        ? fromUnits(simulation.minAskUnits, toAsset?.decimals || 9)
        : "";

    return (
        <div className="min-h-screen bg-black text-white p-4 pt-6">
            <div className="max-w-md mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-white">Swap Tokens</h1>
                    <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1.5">
                        Powered by <span className="font-semibold text-white">STON.fi</span>
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {step === "input" && (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-4"
                        >
                            {/* From Asset */}
                            <Card className="bg-[#111]/80 backdrop-blur-xl border-white/5 rounded-3xl overflow-hidden relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CardContent className="p-5 relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-gray-400">You pay</span>
                                        <button
                                            onClick={handleMaxAmount}
                                            className="text-xs text-blue-400 hover:text-blue-300"
                                        >
                                            MAX: {fromAsset ? getAssetBalance(fromAsset) : "0"}
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="bg-white/5 border border-white/10 hover:bg-white/10 h-11 rounded-xl px-3 gap-2 transition-colors"
                                                >
                                                    {fromAsset?.imageUrl ? (
                                                        <Image
                                                            src={fromAsset.imageUrl}
                                                            alt={fromAsset.symbol}
                                                            width={24}
                                                            height={24}
                                                            className="w-6 h-6 rounded-full"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                                                            {fromAsset?.symbol?.slice(0, 2)}
                                                        </div>
                                                    )}
                                                    <span className="font-bold">
                                                        {fromAsset?.symbol || "Select"}
                                                    </span>
                                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-64 bg-[#1a1a1a] border-[#333] text-white max-h-80 overflow-y-auto">
                                                <DropdownMenuLabel>Select token</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-[#333]" />
                                                {swapAssets.map((asset) => (
                                                    <DropdownMenuItem
                                                        key={asset.contractAddress}
                                                        onClick={() => {
                                                            if (
                                                                asset.contractAddress !== toAsset?.contractAddress
                                                            ) {
                                                                setFromAsset(asset);
                                                                setSimulation(null);
                                                            }
                                                        }}
                                                        className="flex items-center gap-3 p-3 hover:bg-[#222] cursor-pointer"
                                                    >
                                                        {asset.imageUrl ? (
                                                            <Image
                                                                src={asset.imageUrl}
                                                                alt={asset.symbol}
                                                                width={32}
                                                                height={32}
                                                                className="w-8 h-8 rounded-full"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                                                                {asset.symbol.slice(0, 2)}
                                                            </div>
                                                        )}
                                                        <div className="flex-1">
                                                            <div className="font-bold">{asset.symbol}</div>
                                                            <div className="text-xs text-gray-400 truncate">
                                                                {asset.displayName}
                                                            </div>
                                                        </div>
                                                        <div className="text-right text-sm text-gray-400">
                                                            {getAssetBalance(asset)}
                                                        </div>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0.0"
                                            value={amount}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(",", ".");
                                                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                                    setAmount(value);
                                                }
                                            }}
                                            className="flex-1 bg-transparent border-0 text-3xl font-bold text-right h-14 focus-visible:ring-0 p-0 placeholder:text-gray-600"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Swap Direction Toggle */}
                            <div className="flex justify-center -my-5 relative z-10">
                                <button
                                    onClick={handleToggleDirection}
                                    className="w-10 h-10 bg-[#222] hover:bg-[#333] active:scale-95 rounded-xl flex items-center justify-center border-[4px] border-black transition-all shadow-lg text-blue-400 hover:text-blue-300"
                                >
                                    <ArrowDownUp className="w-5 h-5" />
                                </button>
                            </div>

                            {/* To Asset */}
                            <Card className="bg-[#111]/80 backdrop-blur-xl border-white/5 rounded-3xl overflow-hidden relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CardContent className="p-5 relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-gray-400">You receive</span>
                                        <span className="text-xs text-gray-500">
                                            Balance: {toAsset ? getAssetBalance(toAsset) : "0"}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="bg-white/5 border border-white/10 hover:bg-white/10 h-11 rounded-xl px-3 gap-2 transition-colors"
                                                >
                                                    {toAsset?.imageUrl ? (
                                                        <Image
                                                            src={toAsset.imageUrl}
                                                            alt={toAsset.symbol}
                                                            width={24}
                                                            height={24}
                                                            className="w-6 h-6 rounded-full"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold">
                                                            {toAsset?.symbol?.slice(0, 2)}
                                                        </div>
                                                    )}
                                                    <span className="font-bold">
                                                        {toAsset?.symbol || "Select"}
                                                    </span>
                                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-64 bg-[#1a1a1a] border-[#333] text-white max-h-80 overflow-y-auto">
                                                <DropdownMenuLabel>Select token</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-[#333]" />
                                                {swapAssets.map((asset) => (
                                                    <DropdownMenuItem
                                                        key={asset.contractAddress}
                                                        onClick={() => {
                                                            if (
                                                                asset.contractAddress !==
                                                                fromAsset?.contractAddress
                                                            ) {
                                                                setToAsset(asset);
                                                                setSimulation(null);
                                                            }
                                                        }}
                                                        className="flex items-center gap-3 p-3 hover:bg-[#222] cursor-pointer"
                                                    >
                                                        {asset.imageUrl ? (
                                                            <Image
                                                                src={asset.imageUrl}
                                                                alt={asset.symbol}
                                                                width={32}
                                                                height={32}
                                                                className="w-8 h-8 rounded-full"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold">
                                                                {asset.symbol.slice(0, 2)}
                                                            </div>
                                                        )}
                                                        <div className="flex-1">
                                                            <div className="font-bold">{asset.symbol}</div>
                                                            <div className="text-xs text-gray-400 truncate">
                                                                {asset.displayName}
                                                            </div>
                                                        </div>
                                                        <div className="text-right text-sm text-gray-400">
                                                            {getAssetBalance(asset)}
                                                        </div>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <div className="flex-1 text-right">
                                            {isSimulating ? (
                                                <div className="ml-auto"><ButtonLoader /></div>
                                            ) : (
                                                <span className={`text-3xl font-bold ${expectedOutput ? 'text-white' : 'text-gray-600'}`}>
                                                    {expectedOutput
                                                        ? parseFloat(expectedOutput).toFixed(4)
                                                        : "0.0"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Swap Details */}
                            {simulation && (
                                <Card className="bg-[#0a0a0a] border-[#222] rounded-xl">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Rate</span>
                                            <span className="text-white">
                                                {formatSwapRate(
                                                    fromAsset?.symbol || "",
                                                    toAsset?.symbol || "",
                                                    simulation.swapRate
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400 flex items-center gap-1">
                                                Minimum received
                                                <Info className="w-3 h-3" />
                                            </span>
                                            <span className="text-white">
                                                {parseFloat(minimumReceived).toFixed(4)}{" "}
                                                {toAsset?.symbol}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Price impact</span>
                                            <span
                                                className={
                                                    parseFloat(simulation.priceImpact) > 5
                                                        ? "text-red-400"
                                                        : "text-white"
                                                }
                                            >
                                                {parseFloat(simulation.priceImpact).toFixed(2)}%
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Slippage</span>
                                            <div className="flex items-center gap-2">
                                                {["0.5", "1", "3"].map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setSlippage(s)}
                                                        className={`px-2 py-1 rounded text-xs ${slippage === s
                                                            ? "bg-blue-500 text-white"
                                                            : "bg-[#222] text-gray-400 hover:bg-[#333]"
                                                            }`}
                                                    >
                                                        {s}%
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="border-t border-[#222] pt-3 mt-2 space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-400 flex items-center gap-1">
                                                    Network fee
                                                    <Info className="w-3 h-3" />
                                                </span>
                                                <span className="text-white">
                                                    ~{(parseFloat(simulation.gasParams.estimatedGasConsumption) / 1e9).toFixed(4)} TON
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-400">DEX fee</span>
                                                <span className="text-white">
                                                    {(parseFloat(simulation.feePercent) * 100).toFixed(2)}%
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Warning for low TON balance when swapping jettons */}
                            {fromAsset?.kind === "Jetton" && parseFloat(tonBalance) < 0.1 && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-3">
                                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-yellow-500/90">
                                        You need at least 0.1 TON to cover gas fees for token swaps.
                                    </p>
                                </div>
                            )}

                            {/* Warning when swapping TON and remaining balance is low */}
                            {fromAsset?.kind === "Ton" && amount && simulation && parseFloat(tonBalance) - parseFloat(amount) < parseFloat(simulation.gasParams.estimatedGasConsumption) / 1e9 * 1.5 && parseFloat(amount) > 0 && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-3">
                                    <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                                    <p className="text-xs text-blue-400/90">
                                        Network fee (~{(parseFloat(simulation.gasParams.estimatedGasConsumption) / 1e9).toFixed(4)} TON) will be deducted from your balance.
                                    </p>
                                </div>
                            )}

                            {/* Swap Button */}
                            <Button
                                onClick={handleContinue}
                                disabled={!canProceed || isSimulating}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white h-14 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 transition-all active:scale-[0.99]"
                            >
                                {isSimulating ? (
                                    <ButtonLoader />
                                ) : !fromAsset || !toAsset ? (
                                    "Select tokens"
                                ) : !amount || parseFloat(amount) <= 0 ? (
                                    "Enter amount"
                                ) : parseFloat(amount) > parseFloat(getAssetBalance(fromAsset)) ? (
                                    "Insufficient balance"
                                ) : !simulation ? (
                                    "Enter amount"
                                ) : (
                                    "Continue"
                                )}
                            </Button>
                        </motion.div>
                    )}

                    {step === "confirm" && simulation && (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <Card className="bg-[#111] border-[#222] rounded-2xl">
                                <CardContent className="p-6 text-center space-y-4">
                                    <h2 className="text-lg font-bold">Confirm Swap</h2>

                                    <div className="flex items-center justify-center gap-4 py-4">
                                        <div className="text-center">
                                            {fromAsset?.imageUrl ? (
                                                <Image
                                                    src={fromAsset.imageUrl}
                                                    alt={fromAsset.symbol}
                                                    width={48}
                                                    height={48}
                                                    className="w-12 h-12 rounded-full mx-auto mb-2"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                                    {fromAsset?.symbol?.slice(0, 2)}
                                                </div>
                                            )}
                                            <p className="text-xl font-bold">{amount}</p>
                                            <p className="text-gray-400">{fromAsset?.symbol}</p>
                                        </div>

                                        <div className="text-2xl text-gray-500">→</div>

                                        <div className="text-center">
                                            {toAsset?.imageUrl ? (
                                                <Image
                                                    src={toAsset.imageUrl}
                                                    alt={toAsset.symbol}
                                                    width={48}
                                                    height={48}
                                                    className="w-12 h-12 rounded-full mx-auto mb-2"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                                    {toAsset?.symbol?.slice(0, 2)}
                                                </div>
                                            )}
                                            <p className="text-xl font-bold">
                                                {parseFloat(expectedOutput).toFixed(4)}
                                            </p>
                                            <p className="text-gray-400">{toAsset?.symbol}</p>
                                        </div>
                                    </div>

                                    <div className="border-t border-[#222] pt-4 space-y-2 text-sm text-left">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Rate</span>
                                            <span>
                                                {formatSwapRate(
                                                    fromAsset?.symbol || "",
                                                    toAsset?.symbol || "",
                                                    simulation.swapRate
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Minimum received</span>
                                            <span>
                                                {parseFloat(minimumReceived).toFixed(4)}{" "}
                                                {toAsset?.symbol}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Slippage tolerance</span>
                                            <span>{slippage}%</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep("input")}
                                    className="flex-1 bg-[#111] border-[#333] h-12 hover:bg-[#222]"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleConfirmSwap}
                                    disabled={isSwapping}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 h-12"
                                >
                                    {isSwapping ? <ButtonLoader /> : "Confirm Swap"}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === "processing" && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-20"
                        >
                            <div className="relative flex items-center justify-center mb-6">
                                <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                                <div className="absolute w-10 h-10 rounded-full border-2 border-blue-500/20 border-b-blue-500 animate-[spin_1.5s_linear_infinite_reverse]" />
                                <div className="absolute w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Processing Swap</h2>
                            <p className="text-gray-400 text-center">
                                Please wait while your swap is being processed...
                            </p>
                        </motion.div>
                    )}

                    {step === "success" && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-6"
                        >
                            <Card className="bg-[#111] border-[#222] rounded-2xl">
                                <CardContent className="p-8 text-center space-y-4">
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                                        <Check className="w-10 h-10 text-green-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold">Swap Sent!</h2>
                                    <p className="text-gray-400">
                                        Your swap transaction has been submitted to the network.
                                    </p>

                                    {lastTxHash && (
                                        <a
                                            href={`${EXPLORER_BASE_URL}/${lastTxHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                                        >
                                            View on Explorer
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                </CardContent>
                            </Card>

                            <Button
                                onClick={() => router.push("/wallet")}
                                className="w-full bg-white text-black hover:bg-gray-200 h-12 rounded-xl font-bold"
                            >
                                Back to Wallet
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <BiometricAuth
                isOpen={isAuthOpen}
                onSuccess={handleAuthSuccess}
                onCancel={handleAuthCancel}
            />
        </div>
    );
}
