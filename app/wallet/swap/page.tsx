"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Loader from "@/app/(components)/Loader";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { beginCell, Address, Cell } from "@ton/core";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { useWallet } from "../WalletContext";
import {
    fetchSwappableAssets,
    toUnits,
    fromUnits,
    type SwapAsset,
} from "@/lib/stonfi";
import { useOmnistonSwap, type QuoteParams } from "./hooks/useOmnistonSwap";
import { useUserContext } from "@/app/(contexts)/UserContext";

// Custom hook for debouncing values
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    
    return debouncedValue;
}

// Format large numbers to prevent layout issues
function formatDisplayNumber(value: string | number, maxDecimals: number = 4): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num === 0) return "0.0";
    
    // For very large numbers, use compact notation
    if (Math.abs(num) >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(2) + "B";
    }
    if (Math.abs(num) >= 1_000_000) {
        return (num / 1_000_000).toFixed(2) + "M";
    }
    if (Math.abs(num) >= 1_000) {
        return (num / 1_000).toFixed(2) + "K";
    }
    
    // For small numbers, show appropriate precision
    if (Math.abs(num) < 0.0001 && num !== 0) {
        return num.toExponential(2);
    }
    
    return num.toFixed(maxDecimals);
}

const CHAIN_ID = { TON: 607, TRON: 195 } as const;

export default function SwapPage() {
    useTelegramBackButton("/wallet");
    const { telegramId } = useUserContext();
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
        isTestnet
    } = useWallet();

    const TON_API_BASE_URL = isTestnet
        ? "https://testnet.tonapi.io"
        : "https://tonapi.io";

    // State
    const [step, setStep] = useState<"input" | "confirm" | "processing" | "success">("input");
    const [swapAssets, setSwapAssets] = useState<SwapAsset[]>([]);
    const [isLoadingAssets, setIsLoadingAssets] = useState(true);
    const [fromAsset, setFromAsset] = useState<SwapAsset | null>(null);
    const [toAsset, setToAsset] = useState<SwapAsset | null>(null);
    const [amount, setAmount] = useState("");
    const [isSwapping, setIsSwapping] = useState(false);
    const [lastTxHash, setLastTxHash] = useState<string | null>(null);
    const [slippage, setSlippage] = useState("1"); // 1% default
    const [preferGasless, setPreferGasless] = useState(false); // Gasless swap toggle
    const [confirmedQuote, setConfirmedQuote] = useState<typeof omnistonQuote>(null); // Store quote for confirm step

    // Cross-chain state
    const [fromChain, setFromChain] = useState<"TON" | "TRON">("TON");
    const [toChain, setToChain] = useState<"TON" | "TRON">("TON");
    const [tronDestAddress, setTronDestAddress] = useState("");
    const isCrossChain = fromChain !== toChain;

    // Debounce the amount for quote requests (500ms)
    const debouncedAmount = useDebounce(amount, 500);

    // Build quote params based on current form state
    const quoteParams = useMemo((): QuoteParams | null => {
        if (!fromAsset || !toAsset || !debouncedAmount || parseFloat(debouncedAmount) <= 0) {
            return null;
        }

        const offerUnits = toUnits(debouncedAmount, fromAsset.decimals);
        
        return {
            fromAsset: {
                address: fromAsset.contractAddress,
                blockchain: CHAIN_ID[fromChain],
                kind: fromAsset.kind,
                symbol: fromAsset.symbol,
                displayName: fromAsset.displayName,
                imageUrl: fromAsset.imageUrl,
                decimals: fromAsset.decimals,
            },
            toAsset: {
                address: toAsset.contractAddress,
                blockchain: CHAIN_ID[toChain],
                kind: toAsset.kind as "Ton" | "Jetton" | "Trc20",
                symbol: toAsset.symbol,
                displayName: toAsset.displayName,
                imageUrl: toAsset.imageUrl,
                decimals: toAsset.decimals,
            },
            amount: offerUnits,
            slippageBps: Math.round(parseFloat(slippage) * 100), // Convert % to basis points
            preferGasless, // Pass gasless preference
        };
    }, [fromAsset, toAsset, debouncedAmount, slippage, preferGasless, fromChain, toChain]);

    // Omniston hook for quotes and execution
    const {
        quote: omnistonQuote,
        isQuoting,
        quoteError,
        resolverName,
        resolverId: _resolverId, // Reserved for future RFQ analytics
        isGasless,
        priceImpact: _priceImpact, // Reserved for future price impact display
        isConnected,
        buildAndExecute,
        unsubscribe: cancelQuote,
    } = useOmnistonSwap({ 
        params: quoteParams,
        enabled: step === "input", // Only fetch quotes on input step
    });

    // Suppress unused variable warnings for reserved fields
    void _resolverId;
    void _priceImpact;

    // Gas reserve constants
    const MIN_TON_BALANCE = 0.35; // Minimum 0.35 TON required in wallet for swaps
    const MIN_GAS_RESERVE_TON = 0.1; // Minimum gas reserve fallback
    const GAS_SAFETY_MULTIPLIER = 1.5; // Add 50% safety buffer to estimated gas

    const EXPLORER_BASE_URL = isTestnet
        ? "https://testnet.tonviewer.com"
        : "https://tonviewer.com";

    // Redirect if no wallet
    useEffect(() => {
        const storedWallet = localStorage.getItem(`quantum_wallet_address_${telegramId}`);
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

    // Handle swap direction toggle (only if it won't set TRON as source)
    const handleToggleDirection = () => {
        if (toChain === "TRON") return;
        const temp = fromAsset;
        setFromAsset(toAsset);
        setToAsset(temp);
        const tempChain = fromChain;
        setFromChain(toChain);
        setToChain(tempChain);
        setAmount("");
    };

    // Handle max amount - show full balance, gas will be deducted during execution if needed
    const handleMaxAmount = () => {
        if (fromAsset) {
            const balance = getAssetBalance(fromAsset);
            const balanceNum = parseFloat(balance) || 0;

            if (balanceNum <= 0) {
                toast.error("You don't have any " + fromAsset.symbol + " to swap");
                return;
            }

            // For TON: check minimum balance requirement
            if (fromAsset.kind === "Ton" && balanceNum < MIN_TON_BALANCE) {
                toast.error(`You need at least ${MIN_TON_BALANCE} TON in your wallet to swap`);
                return;
            }

            // Set full balance - gas deduction happens during execution
            setAmount(balance);
        }
    };

    // Calculate required gas based on Omniston quote
    const requiredGas = useMemo(() => {
        if (omnistonQuote && omnistonQuote.gasBudget) {
            const gasBudget = parseFloat(omnistonQuote.gasBudget) / 1e9;
            // Apply safety multiplier
            return Math.max(gasBudget * GAS_SAFETY_MULTIPLIER, MIN_GAS_RESERVE_TON);
        }
        return MIN_GAS_RESERVE_TON;
    }, [omnistonQuote]);

    // Calculate swap details including gas handling
    const swapDetails = useMemo(() => {
        if (!fromAsset || !amount || parseFloat(amount) <= 0) {
            return {
                swapAmount: 0,
                actualSwapAmount: 0,
                isMaxSwap: false,
                hasEnoughForGas: true,
                hasMinBalance: true,
                estimatedGas: requiredGas
            };
        }

        const balance = parseFloat(getAssetBalance(fromAsset));
        const swapAmount = parseFloat(amount);

        if (fromAsset.kind === "Ton") {
            // Check minimum balance requirement
            const hasMinBalance = balance >= MIN_TON_BALANCE;

            // Check if user is swapping their full balance (MAX)
            const isMaxSwap = Math.abs(balance - swapAmount) < 0.0001;

            // If MAX swap, gas will be deducted from swap amount
            // Otherwise, gas comes from remaining balance
            const remainingAfterSwap = balance - swapAmount;

            if (isMaxSwap) {
                // MAX swap: deduct gas from swap amount
                const actualSwapAmount = swapAmount - requiredGas;
                return {
                    swapAmount,
                    actualSwapAmount: Math.max(0, actualSwapAmount),
                    isMaxSwap: true,
                    hasEnoughForGas: actualSwapAmount > 0,
                    hasMinBalance,
                    estimatedGas: requiredGas
                };
            } else {
                // Normal swap: gas from remaining balance
                const hasEnoughForGas = remainingAfterSwap >= requiredGas;
                return {
                    swapAmount,
                    actualSwapAmount: swapAmount,
                    isMaxSwap: false,
                    hasEnoughForGas,
                    hasMinBalance,
                    estimatedGas: requiredGas
                };
            }
        }

        // For jettons, check if user has enough TON for gas
        const hasEnoughTonForGas = parseFloat(tonBalance) >= requiredGas;
        return {
            swapAmount,
            actualSwapAmount: swapAmount,
            isMaxSwap: false,
            hasEnoughForGas: hasEnoughTonForGas,
            hasMinBalance: true,
            estimatedGas: requiredGas
        };
    }, [fromAsset, amount, getAssetBalance, tonBalance, requiredGas]);

    // Validation
    const canProceed = useMemo(() => {
        if (!fromAsset || !toAsset || !amount || parseFloat(amount) <= 0)
            return false;
        if (!omnistonQuote) return false;

        // Cross-chain: require valid TRON destination address
        if (isCrossChain && toChain === "TRON" && !tronDestAddress.match(/^T[1-9A-HJ-NP-Za-km-z]{33}$/))
            return false;

        const balance = parseFloat(getAssetBalance(fromAsset));
        const sendAmount = parseFloat(amount);

        if (sendAmount > balance) return false;

        // Check minimum TON balance requirement
        if (fromAsset.kind === "Ton" && !swapDetails.hasMinBalance) return false;

        // Check if there's enough for gas
        if (!swapDetails.hasEnoughForGas) return false;

        // For TON swaps: ensure actual swap amount is positive
        if (fromAsset.kind === "Ton" && swapDetails.actualSwapAmount <= 0) return false;

        // Check TON balance for gas when swapping jettons
        if (fromAsset.kind === "Jetton" && parseFloat(tonBalance) < MIN_GAS_RESERVE_TON)
            return false;

        return true;
    }, [fromAsset, toAsset, amount, omnistonQuote, getAssetBalance, tonBalance, swapDetails, isCrossChain, toChain, tronDestAddress]);

    // Handle continue to confirm
    const handleContinue = () => {
        if (canProceed && omnistonQuote) {
            setConfirmedQuote(omnistonQuote); // Store quote before changing step
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

    // Execute swap using Omniston
    const executeSwap = async () => {
        const storedMnemonic = localStorage.getItem(`quantum_wallet_mnemonic_${telegramId}`);
        if (!storedMnemonic || !confirmedQuote || !fromAsset || !toAsset) {
            toast.error("Wallet credentials or quote not found");
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

            // Use Omniston to build and send the transaction
            const sendTransaction = async (params: { to: string; value: bigint; body: string }) => {
                const toAddress = Address.parse(params.to);
                
                // Parse the body from base64 BOC to Cell
                // The payload from Omniston is base64-encoded BOC, not a text comment
                let bodyCell: Cell | undefined;
                if (params.body) {
                    try {
                        const bodyBuffer = Buffer.from(params.body, 'base64');
                        bodyCell = Cell.fromBoc(bodyBuffer)[0];
                    } catch (e) {
                        console.error('Failed to parse body as Cell:', e);
                        // If parsing fails, it might be a hex string
                        try {
                            const bodyBuffer = Buffer.from(params.body, 'hex');
                            bodyCell = Cell.fromBoc(bodyBuffer)[0];
                        } catch {
                            console.error('Failed to parse body as hex Cell, using undefined');
                        }
                    }
                }
                
                // Create internal message with proper Cell body
                const internalMsg = internal({
                    to: toAddress,
                    value: params.value,
                    body: bodyCell,
                });

                if (!isWalletDeployed && seqno === 0) {
                    // First transaction with wallet deployment
                    const transfer = wallet.createTransfer({
                        seqno: 0,
                        secretKey: keyPair.secretKey,
                        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
                        messages: [internalMsg],
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
                        messages: [internalMsg],
                    });
                }
            };

            // Execute via Omniston
            await buildAndExecute(confirmedQuote, walletAddress, sendTransaction, {
                sourceBlockchain: CHAIN_ID[fromChain],
                destinationBlockchain: CHAIN_ID[toChain],
                destinationAddress: isCrossChain && toChain === "TRON" ? tronDestAddress : walletAddress,
            });

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

    // Use the appropriate quote based on step
    const activeQuote = step === "input" ? omnistonQuote : confirmedQuote;

    // Get expected output amount for display
    const expectedOutput = useMemo(() => {
        if (!activeQuote || !toAsset) return "0.0";
        return parseFloat(fromUnits(activeQuote.askUnits, toAsset.decimals)).toFixed(4);
    }, [activeQuote, toAsset]);

    const minimumReceived = useMemo(() => {
        if (!activeQuote || !toAsset) return "0.0";
        // Omniston includes slippage in the quote, askUnits is already the minimum
        return parseFloat(fromUnits(activeQuote.askUnits, toAsset.decimals)).toFixed(4);
    }, [activeQuote, toAsset]);

    // Loading state
    if (isLoadingAssets || (isContextLoading && !hasFetched)) {
        return <Loader />;
    }

    // Swap not available in testnet mode
    if (isTestnet) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 pt-6">
                <div className="max-w-md mx-auto">
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-bold text-foreground">Swap Tokens</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Powered by <span className="font-semibold text-foreground">STON.fi</span>
                        </p>
                    </div>

                    <div className="text-center py-16 space-y-6">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                            <Icon icon="lucide:alert-triangle" className="w-10 h-10 text-primary"/>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-foreground">Not Available in Testnet</h2>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                                Token swapping is only available on mainnet. Switch to mainnet mode in Settings to use this feature.
                            </p>
                        </div>
                        <Button
                            onClick={() => router.push("/wallet")}
                            className="bg-card border border-border text-foreground hover:bg-accent h-12 px-8 rounded-xl"
                        >
                            Back to Wallet
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pt-6">
            <div className="max-w-md mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-foreground">Swap Tokens</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {isCrossChain ? "Cross-chain swap" : "Same-chain swap"} powered by <span className="font-semibold text-foreground">STON.fi Omniston</span>
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
                            {/* Cross-chain Selector */}
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">From</span>
                                    <Button
                                        variant={fromChain === "TON" ? "default" : "outline"}
                                        size="sm"
                                        className="h-7 text-xs rounded-lg px-2.5"
                                        onClick={() => { setFromChain("TON"); setFromAsset(null); setAmount(""); }}
                                    >
                                        <Icon icon="cryptocurrency-color:ton" className="w-3.5 h-3.5 mr-1" />
                                        TON
                                    </Button>
                                    <Button
                                        variant={fromChain === "TRON" ? "default" : "outline"}
                                        size="sm"
                                        className="h-7 text-xs rounded-lg px-2.5"
                                        onClick={() => { setFromChain("TRON"); setFromAsset(null); setAmount(""); }}
                                        disabled
                                        title="TRON as source coming soon"
                                    >
                                        <Icon icon="cryptocurrency-color:trx" className="w-3.5 h-3.5 mr-1" />
                                        TRON
                                    </Button>
                                </div>
                                <Icon icon="lucide:arrow-right" className="w-4 h-4 text-muted-foreground" />
                                <div className="flex-1 flex items-center justify-end gap-2">
                                    <span className="text-xs text-muted-foreground">To</span>
                                    <Button
                                        variant={toChain === "TON" ? "default" : "outline"}
                                        size="sm"
                                        className="h-7 text-xs rounded-lg px-2.5"
                                        onClick={() => { setToChain("TON"); setToAsset(null); setTronDestAddress(""); }}
                                    >
                                        <Icon icon="cryptocurrency-color:ton" className="w-3.5 h-3.5 mr-1" />
                                        TON
                                    </Button>
                                    <Button
                                        variant={toChain === "TRON" ? "default" : "outline"}
                                        size="sm"
                                        className="h-7 text-xs rounded-lg px-2.5"
                                        onClick={() => { setToChain("TRON"); setToAsset(null); }}
                                    >
                                        <Icon icon="cryptocurrency-color:trx" className="w-3.5 h-3.5 mr-1" />
                                        TRON
                                    </Button>
                                </div>
                            </div>

                            {/* From Asset */}
                            <Card className="bg-card/80 backdrop-blur-xl border-border rounded-3xl overflow-hidden relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CardContent className="p-5 relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">You pay</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleMaxAmount}
                                            className="h-auto p-0 text-xs text-primary hover:text-primary/80 hover:bg-transparent"
                                        >
                                            MAX: {fromAsset ? getAssetBalance(fromAsset) : "0"}
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="bg-accent/50 border border-border hover:bg-accent h-11 rounded-xl px-3 gap-2 transition-colors"
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
                                                    <Icon icon="lucide:chevron-down" className="w-4 h-4 text-muted-foreground"/>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-64 bg-popover border-border text-popover-foreground max-h-80 overflow-y-auto scrollbar-hide">
                                                <DropdownMenuLabel>Select token</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-border" />
                                                {swapAssets.filter(asset => {
                                                    const balance = getAssetBalance(asset);
                                                    return balance && parseFloat(balance) > 0;
                                                }).length === 0 ? (
                                                    <div className="p-4 text-center text-muted-foreground">
                                                        <p className="text-sm font-medium">No assets available</p>
                                                    </div>
                                                ) : (
                                                    swapAssets.map((asset) => (
                                                        getAssetBalance(asset) && parseFloat(getAssetBalance(asset)) > 0 &&
                                                        (<DropdownMenuItem
                                                            key={asset.contractAddress}
                                                            onClick={() => {
                                                                if (
                                                                    asset.contractAddress !== toAsset?.contractAddress
                                                                ) {
                                                                setFromAsset(asset);
                                                                    cancelQuote();
                                                                }
                                                            }}
                                                            className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer"
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
                                                            <div className="text-right text-sm text-muted-foreground">
                                                                {getAssetBalance(asset)}
                                                            </div>
                                                        </DropdownMenuItem>)
                                                    ))
                                                )}

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
                                            className="flex-1 bg-transparent border-0 text-3xl font-bold text-right h-14 focus-visible:ring-0 p-0 placeholder:text-muted-foreground/50"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Swap Direction Toggle */}
                            <div className="flex justify-center -my-5 relative z-10">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleToggleDirection}
                                    className="w-10 h-10 bg-card hover:bg-accent active:scale-95 rounded-xl flex items-center justify-center border-[4px] border-background transition-all shadow-lg text-primary hover:text-primary/80"
                                >
                                    <Icon icon="lucide:arrow-down-up" className="w-5 h-5"/>
                                </Button>
                            </div>

                            {/* To Asset */}
                            <Card className="bg-card/80 backdrop-blur-xl border-border rounded-3xl overflow-hidden relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CardContent className="p-5 relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">You receive</span>
                                        <span className="text-xs text-muted-foreground">
                                            Balance: {toAsset ? getAssetBalance(toAsset) : "0"}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="bg-accent/50 border border-border hover:bg-accent h-11 rounded-xl px-3 gap-2 transition-colors"
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
                                                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold">
                                                            {toAsset?.symbol?.slice(0, 2)}
                                                        </div>
                                                    )}
                                                    <span className="font-bold">
                                                        {toAsset?.symbol || "Select"}
                                                    </span>
                                                    <Icon icon="lucide:chevron-down" className="w-4 h-4 text-muted-foreground"/>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-64 bg-popover border-border text-popover-foreground max-h-80 overflow-y-auto scrollbar-hide">
                                                <DropdownMenuLabel>Select token</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-border" />
                                                {swapAssets.map((asset) => (
                                                    <DropdownMenuItem
                                                        key={asset.contractAddress}
                                                        onClick={() => {
                                                            if (
                                                                asset.contractAddress !==
                                                                fromAsset?.contractAddress
                                                            ) {
                                                                setToAsset(asset);
                                                                cancelQuote();
                                                            }
                                                        }}
                                                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer"
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
                                                            <div className="text-xs text-muted-foreground truncate">
                                                                {asset.displayName}
                                                            </div>
                                                        </div>
                                                        <div className="text-right text-sm text-muted-foreground">
                                                            {getAssetBalance(asset)}
                                                        </div>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <div className="flex-1 min-w-0 text-right overflow-hidden">
                                            {isQuoting ? (
                                                <div className="flex justify-end"><ButtonLoader /></div>
                                            ) : (
                                                <span className={`text-3xl font-bold truncate block ${expectedOutput ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {expectedOutput
                                                        ? formatDisplayNumber(expectedOutput)
                                                        : "0.0"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* TRON Destination Address (cross-chain) */}
                            {isCrossChain && toChain === "TRON" && (
                                <Card className="bg-card/80 backdrop-blur-xl border-border rounded-3xl overflow-hidden">
                                    <CardContent className="p-4">
                                        <Label className="text-xs text-muted-foreground mb-2 block">
                                            TRON destination address
                                        </Label>
                                        <Input
                                            placeholder="T... (your TRON address)"
                                            value={tronDestAddress}
                                            onChange={(e) => setTronDestAddress(e.target.value.trim())}
                                            className="bg-transparent border-border text-sm"
                                        />
                                        {tronDestAddress && !tronDestAddress.match(/^T[1-9A-HJ-NP-Za-km-z]{33}$/) && (
                                            <p className="text-xs text-destructive mt-1">Invalid TRON address format</p>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Swap Details */}
                            {omnistonQuote && (
                                <Card className="bg-muted/50 border-border rounded-xl overflow-hidden">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between text-sm gap-2">
                                            <span className="text-muted-foreground shrink-0">Rate</span>
                                            <span className="text-foreground text-right truncate min-w-0">
                                                1 {fromAsset?.symbol} = {formatDisplayNumber(parseFloat(omnistonQuote.askUnits) / parseFloat(omnistonQuote.bidUnits) * Math.pow(10, (fromAsset?.decimals || 9) - (toAsset?.decimals || 9)), 6)} {toAsset?.symbol}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm gap-2">
                                            <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                                                Minimum received
                                                <Icon icon="lucide:info" className="w-3 h-3 text-muted-foreground"/>
                                            </span>
                                            <span className="text-foreground text-right truncate min-w-0">
                                                {formatDisplayNumber(minimumReceived)}{" "}
                                                {toAsset?.symbol}
                                            </span>
                                        </div>

                                        {/* Show resolver name for Omniston */}
                                        {resolverName && (
                                            <div className="flex items-center justify-between text-sm gap-2">
                                                <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                                                    <Icon icon="lucide:zap" className="w-3 h-3"/>
                                                    Best rate via
                                                </span>
                                                <span className="text-primary font-medium text-right truncate min-w-0">
                                                    {resolverName}
                                                </span>
                                            </div>
                                        )}

                                        <div className="border-t border-border pt-3 mt-2 space-y-2">
                                            <div className="flex items-center justify-between text-sm gap-2">
                                                <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                                                    Network fee
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="icon" type="button" className="h-auto w-auto p-0 hover:bg-transparent inline-flex">
                                                                <Icon icon="lucide:info" className="w-3 h-3 text-muted-foreground cursor-help"/>
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent side="top" className="w-56 bg-popover border-border text-popover-foreground p-3">
                                                            <p className="font-medium text-foreground mb-1 text-xs">Includes 50% safety buffer</p>
                                                            <p className="text-[11px] leading-relaxed">This ensures your swap completes successfully. Any unused gas is automatically returned to your wallet.</p>
                                                        </PopoverContent>
                                                    </Popover>
                                                </span>
                                                <span className="text-foreground font-medium text-right truncate min-w-0">
                                                    ~{swapDetails.estimatedGas.toFixed(4)} TON
                                                </span>
                                            </div>
                                            {fromAsset?.kind === "Ton" && swapDetails.isMaxSwap && omnistonQuote && (
                                                <div className="flex items-center justify-between text-sm gap-2">
                                                    <span className="text-muted-foreground shrink-0">Actual swap amount</span>
                                                    <span className="text-primary font-medium text-right truncate min-w-0">
                                                        {formatDisplayNumber(swapDetails.actualSwapAmount)} TON
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between text-sm gap-2">
                                                <span className="text-muted-foreground shrink-0">Slippage tolerance</span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {["0.5", "1", "3"].map((s) => (
                                                        <Button
                                                            key={s}
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSlippage(s)}
                                                            className={`h-auto px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-tight transition-all active:scale-95 ${slippage === s
                                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary hover:text-primary-foreground"
                                                                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
                                                                }`}
                                                        >
                                                            {s}%
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            {/* Gasless swap toggle */}
                                            <div className="flex items-center justify-between text-sm gap-2 pt-2 border-t border-border/50">
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Icon icon="lucide:fuel" className="w-3 h-3 text-muted-foreground"/>
                                                    <Label htmlFor="gasless" className={`text-sm cursor-pointer ${isGasless ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                                                        Gasless swap
                                                    </Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="icon" type="button" className="h-auto w-auto p-0 hover:bg-transparent inline-flex">
                                                                <Icon icon="lucide:info" className="w-3 h-3 text-muted-foreground cursor-help"/>
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent side="top" className="w-56 bg-popover border-border text-popover-foreground p-3">
                                                            <p className="font-medium text-foreground mb-1 text-xs">Pay gas with swap token</p>
                                                            <p className="text-[11px] leading-relaxed">Gas fees are deducted from the token you&apos;re swapping. Not available for all pairs.</p>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!isGasless && (
                                                        <span className="text-xs text-muted-foreground/50 font-medium">Not available</span>
                                                    )}
                                                    {isGasless && preferGasless && (
                                                        <span className="text-xs text-green-500 font-medium">Active</span>
                                                    )}
                                                    <Switch
                                                        id="gasless"
                                                        checked={preferGasless}
                                                        onCheckedChange={setPreferGasless}
                                                        disabled={!isGasless}
                                                        className="scale-75"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Info: Fee deduction explanation for MAX swaps */}
                            {fromAsset?.kind === "Ton" && swapDetails.isMaxSwap && omnistonQuote && swapDetails.hasEnoughForGas && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-3">
                                    <Icon icon="lucide:info" className="w-4 h-4 text-primary mt-0.5 shrink-0"/>
                                    <p className="text-xs text-primary/90">
                                        <span className="font-semibold">~{swapDetails.estimatedGas.toFixed(4)} TON</span> network fee will be deducted from your swap amount.
                                    </p>
                                </div>
                            )}

                            {/* Quote error message */}
                            {quoteError && !isQuoting && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
                                    <Icon icon="lucide:alert-triangle" className="w-4 h-4 text-destructive shrink-0"/>
                                    <p className="text-xs text-destructive/90">
                                        {quoteError}
                                    </p>
                                </div>
                            )}

                            {/* Warning: Minimum balance not met */}
                            {fromAsset?.kind === "Ton" && amount && parseFloat(amount) > 0 && !swapDetails.hasMinBalance && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-3">
                                    <Icon icon="lucide:alert-triangle" className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0"/>
                                    <p className="text-xs text-yellow-500/90">
                                        You need at least {MIN_TON_BALANCE} TON in your wallet to swap.
                                    </p>
                                </div>
                            )}

                            {/* Warning for low TON balance when swapping jettons */}
                            {fromAsset?.kind === "Jetton" && parseFloat(tonBalance) < MIN_GAS_RESERVE_TON && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-3">
                                    <Icon icon="lucide:alert-triangle" className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0"/>
                                    <p className="text-xs text-yellow-500/90">
                                        You need at least {MIN_GAS_RESERVE_TON} TON to cover network fees for token swaps.
                                    </p>
                                </div>
                            )}

                            {/* Error when not enough balance for both swap and gas */}
                            {fromAsset?.kind === "Ton" && amount && parseFloat(amount) > 0 && !swapDetails.isMaxSwap && !swapDetails.hasEnoughForGas && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                                    <Icon icon="lucide:alert-triangle" className="w-4 h-4 text-destructive mt-0.5 shrink-0"/>
                                    <p className="text-xs text-destructive/90">
                                        Insufficient balance for network fees. Reduce swap amount or use MAX.
                                    </p>
                                </div>
                            )}

                            {/* Swap Button */}
                            <Button
                                onClick={handleContinue}
                                disabled={!canProceed || isQuoting || !!quoteError || !isConnected}
                                className="w-full bg-primary text-primary-foreground h-14 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:bg-primary/90"
                            >
                                {!isConnected ? (
                                    "Connecting..."
                                ) : isQuoting ? (
                                    <ButtonLoader />
                                ) : !fromAsset || !toAsset ? (
                                    "Select tokens"
                                ) : !amount || parseFloat(amount) <= 0 ? (
                                    "Enter amount"
                                ) : parseFloat(amount) > parseFloat(getAssetBalance(fromAsset)) ? (
                                    "Insufficient balance"
                                ) : fromAsset.kind === "Ton" && !swapDetails.hasMinBalance ? (
                                    `Need ${MIN_TON_BALANCE} TON minimum`
                                ) : fromAsset.kind === "Ton" && !swapDetails.hasEnoughForGas ? (
                                    "Insufficient balance for gas"
                                ) : fromAsset.kind === "Jetton" && parseFloat(tonBalance) < MIN_GAS_RESERVE_TON ? (
                                    "Insufficient TON for gas"
                                ) : quoteError ? (
                                    "Swap unavailable"
                                ) : !omnistonQuote ? (
                                    "Getting quote..."
                                ) : (
                                    "Continue"
                                )}
                            </Button>
                        </motion.div>
                    )}

                    {step === "confirm" && confirmedQuote && (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <Card className="bg-card border-border rounded-2xl">
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
                                            <p className="text-xl font-bold">{formatDisplayNumber(parseFloat(amount))}</p>
                                            <p className="text-gray-400">{fromAsset?.symbol}</p>
                                        </div>

                                        <Icon icon="lucide:arrow-right" className="w-6 h-6 text-muted-foreground"/>

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
                                                {formatDisplayNumber(parseFloat(expectedOutput))}
                                            </p>
                                            <p className="text-muted-foreground">{toAsset?.symbol}</p>
                                        </div>
                                    </div>

                                    <div className="border-t border-border pt-4 space-y-2 text-sm text-left">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Rate</span>
                                            <span>
                                                1 {fromAsset?.symbol} = {formatDisplayNumber(parseFloat(confirmedQuote.askUnits) / parseFloat(confirmedQuote.bidUnits) * Math.pow(10, (fromAsset?.decimals || 9) - (toAsset?.decimals || 9)), 6)} {toAsset?.symbol}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Minimum received</span>
                                            <span>
                                                {formatDisplayNumber(parseFloat(minimumReceived))}{" "}
                                                {toAsset?.symbol}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Slippage tolerance</span>
                                            <span>{slippage}%</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep("input")}
                                    className="flex-1 bg-secondary text-secondary-foreground border-border h-12 hover:bg-secondary/80"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleConfirmSwap}
                                    disabled={isSwapping}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-12"
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
                                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Processing Swap</h2>
                            <p className="text-muted-foreground text-center">
                                Please wait while your swap is being processed...
                            </p>
                        </motion.div>
                    )}

                    {step === "success" && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-8 space-y-6"
                        >
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                                <Icon icon="lucide:check" className="w-10 h-10 text-green-500"/>
                            </div>
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold">Swap Sent!</h2>
                                <p className="text-muted-foreground">
                                    Your swap transaction has been submitted to the network.
                                </p>
                            </div>

                            <Button
                                onClick={() => router.push("/wallet")}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl font-bold"
                            >
                                Back to Wallet
                            </Button>

                            {lastTxHash && (
                                <Button
                                    variant="ghost"
                                    asChild
                                    className="flex items-center justify-center gap-2 text-primary hover:text-primary/80 hover:bg-transparent text-sm h-auto p-0 mt-3"
                                >
                                    <a
                                        href={`${EXPLORER_BASE_URL}/${lastTxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        View on Explorer
                                        <Icon icon="lucide:external-link" className="w-4 h-4"/>
                                    </a>
                                </Button>
                            )}
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
