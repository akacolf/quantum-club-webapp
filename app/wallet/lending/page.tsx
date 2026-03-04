"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import Loader from "@/app/(components)/Loader";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { useWallet } from "../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { getSecureMnemonic } from "@/lib/secure-mnemonic";
import {
    fetchLendingMarkets,
    fetchUserPositions,
    buildSupplyParams,
    buildWithdrawParams,
    initEvaaMaster,
    type LendingAsset,
    type UserLendingData,
} from "@/lib/evaa-service";
import { lendingSchema } from "@/lib/validations";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { type Cell } from "@ton/core";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";

type ViewMode = "markets" | "supply" | "withdraw";

const TOKEN_ICONS: Record<string, { type: "svg" | "iconify"; value: string }> = {
    TON: { type: "svg", value: "/svg/ton-logo.svg" },
    USDT: { type: "iconify", value: "cryptocurrency-color:usdt" },
    jUSDT: { type: "iconify", value: "cryptocurrency-color:usdt" },
    jUSDC: { type: "iconify", value: "token-branded:usdc" },
    stTON: { type: "svg", value: "/svg/ton-logo.svg" },
    tsTON: { type: "svg", value: "/svg/ton-logo.svg" },
    USDe: { type: "iconify", value: "token-branded:usde" },
    tsUSDe: { type: "iconify", value: "token-branded:usde" },
};

function TokenIcon({ name, size = 32 }: { name: string; size?: number }) {
    const icon = TOKEN_ICONS[name];
    if (icon?.type === "svg") {
        return <Image src={icon.value} alt={name} width={size} height={size} className="rounded-full" />;
    }
    if (icon?.type === "iconify") {
        return <Icon icon={icon.value} width={size} height={size} />;
    }
    return (
        <div className="rounded-full bg-primary/10 flex items-center justify-center" style={{ width: size, height: size }}>
            <span className="text-xs font-bold text-primary">{name.slice(0, 3)}</span>
        </div>
    );
}

// Gas reserve for TON supply: keep enough for future transactions
const TON_GAS_RESERVE = 0.5;

export default function LendingPage() {
    const router = useRouter();
    const { telegramId } = useUserContext();

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
        isTestnet,
    } = useWallet();

    const TON_API_BASE_URL = isTestnet
        ? "https://testnet.tonapi.io"
        : "https://tonapi.io";

    useEffect(() => {
        router.prefetch("/wallet");
    }, [router]);

    const [isLoading, setIsLoading] = useState(true);
    const [markets, setMarkets] = useState<LendingAsset[]>([]);
    const [userPositions, setUserPositions] = useState<UserLendingData | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("markets");
    const [selectedAsset, setSelectedAsset] = useState<LendingAsset | null>(null);
    const [amount, setAmount] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // Telegram back button: go to markets if in supply/withdraw, else go to wallet
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        tg?.ready();
        tg?.BackButton.show();

        const handleBack = () => {
            if (viewMode !== "markets") {
                setViewMode("markets");
                setSelectedAsset(null);
                setAmount("");
            } else {
                router.push("/wallet");
            }
        };

        tg?.BackButton.onClick(handleBack);
        return () => {
            tg?.BackButton.offClick(handleBack);
            tg?.BackButton.hide();
        };
    }, [router, viewMode]);

    const loadMarketData = async () => {
        try {
            setIsLoading(true);
            const [marketsData, positions] = await Promise.all([
                fetchLendingMarkets(),
                walletAddress ? fetchUserPositions(walletAddress).catch(() => null) : null,
            ]);
            setMarkets(marketsData);
            setUserPositions(positions);
        } catch (error) {
            console.error("Failed to load lending markets:", error);
            toast.error("Failed to load lending markets");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const storedWallet = localStorage.getItem(`quantum_wallet_address_${telegramId}`);
        if (!storedWallet) {
            router.push("/wallet");
            return;
        }
        loadMarketData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, telegramId]);

    const getWalletBalance = (assetName: string): string => {
            if (assetName === "TON") return tonBalance;
            const jetton = jettons.find((j) =>
                j.symbol?.toLowerCase() === assetName.toLowerCase() ||
                j.name?.toLowerCase().includes(assetName.toLowerCase())
            );
            if (jetton) {
                return (parseFloat(jetton.balance) / Math.pow(10, jetton.decimals)).toFixed(4);
            }
            return "0";
        };

    const getUserSupplied = (assetName: string): string => {
            if (!userPositions) return "0";
            const pos = userPositions.positions.find(
                (p) => p.assetName.toLowerCase() === assetName.toLowerCase()
            );
            return pos?.supplied ?? "0";
        };

    const handleSupply = (asset: LendingAsset) => {
        setSelectedAsset(asset);
        setViewMode("supply");
        setAmount("");
    };

    const handleWithdraw = (asset: LendingAsset) => {
        setSelectedAsset(asset);
        setViewMode("withdraw");
        setAmount("");
    };

    const executeTransaction = async (mode: "supply" | "withdraw") => {
        // Zod schema validation at submit boundary
        const parsed = lendingSchema.safeParse({
            asset: selectedAsset?.name || "",
            amount: amount || "",
        });
        if (!parsed.success) {
            toast.error(parsed.error.errors[0].message);
            return;
        }
        if (!selectedAsset || !amount || parseFloat(amount) <= 0) return;

        const storedMnemonic = await getSecureMnemonic(telegramId);
        if (!storedMnemonic || !walletAddress) {
            toast.error("Wallet credentials not found");
            return;
        }

        setIsProcessing(true);
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

            let seqno = 0;
            try {
                const state = await ta.accounts.getAccount(wallet.address);
                if (state.status === "active") {
                    seqno = await contract.getSeqno();
                }
            } catch {
                seqno = 0;
            }

            const amountBigInt = BigInt(
                Math.floor(parseFloat(amount) * Math.pow(10, selectedAsset.decimals))
            );

            const master = await initEvaaMaster();

            let messageBody: Cell;
            let sendValue: bigint;

            if (mode === "supply") {
                const params = buildSupplyParams(selectedAsset.name, amountBigInt, walletAddress);
                messageBody = master.createSupplyMessage(params);
                // For TON supply: value = amount + gas; for jettons: just gas
                sendValue = selectedAsset.name === "TON"
                    ? amountBigInt + 300000000n // amount + 0.3 TON gas
                    : 300000000n;
            } else {
                const params = buildWithdrawParams(selectedAsset.name, amountBigInt, walletAddress);
                messageBody = master.createSupplyWithdrawMessage(params);
                sendValue = 500000000n; // 0.5 TON for gas
            }

            const masterAddress = master.address;

            const internalMsg = internal({
                to: masterAddress,
                value: sendValue,
                body: messageBody,
            });

            await contract.sendTransfer({
                seqno,
                secretKey: keyPair.secretKey,
                sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
                messages: [internalMsg],
            });

            toast.success(
                `${mode === "supply" ? "Supply" : "Withdrawal"} transaction sent!`
            );

            setViewMode("markets");
            setAmount("");
            setSelectedAsset(null);

            setTimeout(() => {
                loadMarketData();
                fetchWalletAssets();
            }, 5000);
        } catch (error) {
            console.error(`${mode} failed:`, error);
            toast.error(`${mode === "supply" ? "Supply" : "Withdrawal"} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmSupply = async () => {
        const authenticated = await requestAuth();
        if (authenticated) {
            await executeTransaction("supply");
        }
    };

    const handleConfirmWithdraw = async () => {
        const authenticated = await requestAuth();
        if (authenticated) {
            await executeTransaction("withdraw");
        }
    };

    const canProceed = (() => {
        if (!selectedAsset || !amount || parseFloat(amount) <= 0) return false;
        if (viewMode === "supply") {
            const balance = parseFloat(getWalletBalance(selectedAsset.name));
            if (parseFloat(amount) > balance) return false;
            if (selectedAsset.name === "TON" && balance - parseFloat(amount) < 0.3) return false;
        }
        if (viewMode === "withdraw") {
            const supplied = parseFloat(getUserSupplied(selectedAsset.name));
            if (parseFloat(amount) > supplied) return false;
        }
        return true;
    })();

    if (isLoading || (isContextLoading && !hasFetched)) {
        return <Loader />;
    }

    if (isTestnet) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 pt-6">
                <div className="max-w-md mx-auto text-center py-16 space-y-6">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Icon icon="lucide:alert-triangle" className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold">Not Available in Testnet</h2>
                    <p className="text-muted-foreground text-sm">
                        Lending & borrowing is only available on mainnet.
                    </p>
                    <Button onClick={() => router.push("/wallet")}>Back to Wallet</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pt-6">
            <div className="max-w-md mx-auto">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-foreground">Lending</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Supply & borrow on <span className="font-semibold text-foreground">EVAA Protocol</span>
                    </p>
                </div>

                {/* User Overview */}
                {userPositions && userPositions.positions.length > 0 && viewMode === "markets" && (
                    <Card className="mb-4 bg-card/80 backdrop-blur-xl border-border rounded-2xl">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <p className="text-xs text-muted-foreground">Supplied</p>
                                    <p className="text-sm font-bold text-green-500">
                                        ${parseFloat(userPositions.totalSuppliedUsd).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Borrowed</p>
                                    <p className="text-sm font-bold text-orange-500">
                                        ${parseFloat(userPositions.totalBorrowedUsd).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Health</p>
                                    <p className={`text-sm font-bold ${
                                        userPositions.healthFactor > 2 ? "text-green-500" :
                                        userPositions.healthFactor > 1.2 ? "text-yellow-500" : "text-red-500"
                                    }`}>
                                        {userPositions.healthFactor === Infinity ? "∞" : userPositions.healthFactor.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <AnimatePresence mode="wait">
                    {viewMode === "markets" && (
                        <motion.div
                            key="markets"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-3"
                        >
                            {/* User Positions */}
                            {userPositions && userPositions.positions.length > 0 && (
                                <>
                                    <h3 className="text-sm font-semibold text-muted-foreground px-1">Your Positions</h3>
                                    {userPositions.positions.map((pos) => {
                                        const market = markets.find(
                                            (m) => m.name.toLowerCase() === pos.assetName.toLowerCase()
                                        );
                                        return (
                                            <Card
                                                key={pos.assetName}
                                                className="bg-card/80 backdrop-blur-xl border-border rounded-2xl"
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <TokenIcon name={pos.assetName} size={32} />
                                                            <span className="font-bold">{pos.assetName}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-xs">
                                                            {market ? `${(market.supplyApy * 100).toFixed(2)}% APY` : "—"}
                                                        </Badge>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Supplied</p>
                                                            <p className="font-medium text-green-500">{parseFloat(pos.supplied).toFixed(4)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Borrowed</p>
                                                            <p className="font-medium text-orange-500">{parseFloat(pos.borrowed).toFixed(4)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 mt-3">
                                                        {market && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    className="flex-1 h-8 text-xs"
                                                                    onClick={() => handleSupply(market)}
                                                                >
                                                                    Supply More
                                                                </Button>
                                                                {parseFloat(pos.supplied) > 0 && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="flex-1 h-8 text-xs"
                                                                        onClick={() => handleWithdraw(market)}
                                                                    >
                                                                        Withdraw
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                    <div className="h-2" />
                                </>
                            )}

                            {/* Available Markets */}
                            <h3 className="text-sm font-semibold text-muted-foreground px-1">Markets</h3>
                            {markets.map((asset) => (
                                <Card
                                    key={asset.name}
                                    className="bg-card/80 backdrop-blur-xl border-border rounded-2xl"
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <TokenIcon name={asset.name} size={40} />
                                                <div>
                                                    <p className="font-bold">{asset.symbol}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Balance: {getWalletBalance(asset.name)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-green-500">
                                                    {(asset.supplyApy * 100).toFixed(2)}%
                                                </p>
                                                <p className="text-xs text-muted-foreground">Supply APY</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                                            <div>
                                                <span>Borrow APY: </span>
                                                <span className="text-orange-500 font-medium">
                                                    {(asset.borrowApy * 100).toFixed(2)}%
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span>Liquidity: </span>
                                                <span className="text-foreground font-medium">
                                                    {parseFloat(asset.availableLiquidity) > 1000
                                                        ? `${(parseFloat(asset.availableLiquidity) / 1000).toFixed(1)}K`
                                                        : parseFloat(asset.availableLiquidity).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-3">
                                            <Button
                                                size="sm"
                                                className="flex-1 h-9"
                                                onClick={() => handleSupply(asset)}
                                                disabled={parseFloat(getWalletBalance(asset.name)) <= 0}
                                            >
                                                <Icon icon="lucide:arrow-up-circle" className="w-4 h-4 mr-1" />
                                                Supply
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 h-9"
                                                onClick={() => handleWithdraw(asset)}
                                                disabled={parseFloat(getUserSupplied(asset.name)) <= 0}
                                            >
                                                <Icon icon="lucide:arrow-down-circle" className="w-4 h-4 mr-1" />
                                                Withdraw
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </motion.div>
                    )}

                    {(viewMode === "supply" || viewMode === "withdraw") && selectedAsset && (
                        <motion.div
                            key={viewMode}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <Card className="bg-card/80 backdrop-blur-xl border-border rounded-2xl">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <TokenIcon name={selectedAsset.name} size={40} />
                                            <div>
                                                <p className="font-bold text-lg">{selectedAsset.symbol}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {viewMode === "supply" ? "Supply" : "Withdraw"} {selectedAsset.symbol}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline">
                                            {(selectedAsset.supplyApy * 100).toFixed(2)}% APY
                                        </Badge>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <Label className="text-sm">Amount</Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-auto p-0 text-xs text-primary"
                                                    onClick={() => {
                                                        if (viewMode === "supply") {
                                                            const bal = parseFloat(getWalletBalance(selectedAsset.name));
                                                            if (selectedAsset.name === "TON") {
                                                                const max = Math.max(0, bal - TON_GAS_RESERVE);
                                                                setAmount(max > 0 ? max.toFixed(4) : "0");
                                                            } else {
                                                                setAmount(bal > 0 ? bal.toFixed(4) : "0");
                                                            }
                                                        } else {
                                                            const supplied = parseFloat(getUserSupplied(selectedAsset.name));
                                                            setAmount(supplied > 0 ? supplied.toFixed(4) : "0");
                                                        }
                                                    }}
                                                >
                                                    MAX: {viewMode === "supply"
                                                        ? (selectedAsset.name === "TON"
                                                            ? Math.max(0, parseFloat(getWalletBalance(selectedAsset.name)) - TON_GAS_RESERVE).toFixed(4)
                                                            : getWalletBalance(selectedAsset.name))
                                                        : getUserSupplied(selectedAsset.name)}
                                                </Button>
                                            </div>
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
                                                className="text-xl font-bold h-14"
                                            />
                                        </div>

                                        {viewMode === "supply" && selectedAsset.name === "TON" && (
                                            <p className="text-xs text-muted-foreground">
                                                {TON_GAS_RESERVE} TON will be reserved for gas fees.
                                            </p>
                                        )}

                                        <div className="bg-accent/30 rounded-xl p-3 space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Supply APY</span>
                                                <span className="text-green-500 font-medium">
                                                    {(selectedAsset.supplyApy * 100).toFixed(2)}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Borrow APY</span>
                                                <span className="text-orange-500 font-medium">
                                                    {(selectedAsset.borrowApy * 100).toFixed(2)}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Available Liquidity</span>
                                                <span className="font-medium">
                                                    {parseFloat(selectedAsset.availableLiquidity).toFixed(2)} {selectedAsset.symbol}
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full h-12 text-base font-semibold"
                                            disabled={!canProceed || isProcessing}
                                            onClick={viewMode === "supply" ? handleConfirmSupply : handleConfirmWithdraw}
                                        >
                                            {isProcessing ? (
                                                <ButtonLoader size="sm" />
                                            ) : (
                                                <>
                                                    <Icon
                                                        icon={viewMode === "supply" ? "lucide:arrow-up-circle" : "lucide:arrow-down-circle"}
                                                        className="w-5 h-5 mr-2"
                                                    />
                                                    {viewMode === "supply" ? "Supply" : "Withdraw"} {selectedAsset.symbol}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <BiometricAuth
                    isOpen={isAuthOpen}
                    onSuccess={handleAuthSuccess}
                    onCancel={handleAuthCancel}
                />
            </div>
        </div>
    );
}
