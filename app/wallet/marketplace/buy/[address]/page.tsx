"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
    Image as ImageIcon,
    Loader2,
    CheckCircle2,
    XCircle,
    ShoppingCart,
    ArrowRight,
    Info,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "@/app/wallet/WalletContext";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { toast } from "sonner";
import {
    getNftDetails,
    calculateTotalPrice,
    MARKETPLACE_FEE_PERCENT,
    type NftItem,
} from "@/lib/nft-marketplace";
import {
    getSaleInfo,
    QC_MARKETPLACE_FEE_PERCENT,
} from "@/lib/nft-sale-contracts";

type ViewMode = "preview" | "processing" | "success" | "error";

export default function BuyNftPage() {
    useTelegramBackButton();
    const params = useParams();
    const router = useRouter();
    const { isTestnet, walletAddress, tonBalance } = useWallet();
    const { telegramId } = useGameContext();
    const {
        isOpen: isAuthOpen,
        requestAuth,
        handleSuccess: handleAuthSuccess,
        handleCancel: handleAuthCancel,
    } = useBiometricAuth();

    const nftAddress = decodeURIComponent(params.address as string);

    const [nft, setNft] = useState<NftItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>("preview");
    const [error, setError] = useState<string | null>(null);

    // Fetch NFT details
    const fetchNft = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getNftDetails(nftAddress, isTestnet);
            if (data) {
                setNft(data);
            } else {
                setError("NFT not found or not for sale");
            }
        } catch (err) {
            console.error("Failed to fetch NFT:", err);
            setError("Failed to load NFT");
        } finally {
            setIsLoading(false);
        }
    }, [nftAddress, isTestnet]);

    useEffect(() => {
        fetchNft();
    }, [fetchNft]);

    // Calculate price with fee
    const priceInfo = nft?.sale ? calculateTotalPrice(nft.sale.price) : null;

    // Check balance - tonBalance is a string in WalletContext
    const balanceNum = typeof tonBalance === 'string' ? parseFloat(tonBalance) : tonBalance;
    const hasInsufficientBalance = priceInfo ? balanceNum < Number(priceInfo.totalPrice) / 1e9 : false;

    // Handle purchase
    const handlePurchase = async () => {
        if (!nft?.sale || !priceInfo || !walletAddress || !telegramId) {
            toast.error("Missing purchase information");
            return;
        }

        // Authenticate
        const authenticated = await requestAuth();
        if (!authenticated) {
            toast.error("Authentication required");
            return;
        }

        setViewMode("processing");

        try {
            // Check if listed on QC Marketplace (has sale contract)
            const saleInfo = await getSaleInfo(nft.sale.address || nftAddress, isTestnet);
            
            if (saleInfo && saleInfo.isActive) {
                // Direct purchase through our in-house sale contract
                // Build buy transaction via API
                const buildResponse = await fetch("/api/nft-marketplace", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "build-buy",
                        telegramId,
                        saleContractAddress: nft.sale.address,
                        price: (Number(saleInfo.fullPrice) / 1e9).toString(),
                    }),
                });
                
                const buildResult = await buildResponse.json();
                if (!buildResult.success) {
                    throw new Error(buildResult.error || "Failed to build transaction");
                }
                
                // Send the transaction via wallet API
                const response = await fetch("/api/wallet/send-transaction", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        telegramId,
                        messages: [buildResult.transaction],
                        isTestnet,
                    }),
                });

                const result = await response.json();
                
                if (result.success) {
                    // Confirm the sale in Firebase
                    await fetch("/api/nft-marketplace", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "confirm-sale",
                            telegramId,
                            saleContractAddress: nft.sale.address,
                            buyerAddress: walletAddress,
                            transactionHash: result.hash,
                        }),
                    });
                    
                    toast.success("NFT purchased successfully!");
                    setViewMode("success");
                } else {
                    throw new Error(result.error || "Transaction failed");
                }
            } else {
                // Fallback: Open marketplace to complete purchase
                const marketUrl = `https://getgems.io/nft/${nftAddress}`;
                window.open(marketUrl, "_blank");
                
                toast.info("Complete purchase on external marketplace", {
                    description: "You will be redirected to complete the transaction",
                });
                
                setTimeout(() => {
                    setViewMode("success");
                }, 2000);
            }

        } catch (err) {
            console.error("Purchase error:", err);
            setError(err instanceof Error ? err.message : "Purchase failed");
            setViewMode("error");
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4">
                <div className="max-w-md mx-auto space-y-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="w-full aspect-square rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (!nft || !nft.sale || !priceInfo) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 flex items-center justify-center">
                <Card className="bg-card border-border p-8 text-center max-w-sm">
                    <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                    <p className="text-lg font-semibold">Not Available</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        {error || "This NFT is not for sale"}
                    </p>
                    <Button
                        onClick={() => router.back()}
                        className="mt-4"
                        variant="outline"
                    >
                        Go Back
                    </Button>
                </Card>
            </div>
        );
    }

    // Processing View
    if (viewMode === "processing") {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-6"
                >
                    <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Processing Purchase</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            Please complete the transaction in the opened window
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Success View
    if (viewMode === "success") {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-6 max-w-sm"
                >
                    <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Purchase Complete!</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            The NFT is now yours. Check your wallet to view it.
                        </p>
                    </div>
                    {nft.image && (
                        <div className="w-32 h-32 mx-auto rounded-xl overflow-hidden">
                            <Image
                                src={nft.image}
                                alt={nft.name}
                                width={128}
                                height={128}
                                className="object-cover w-full h-full"
                                unoptimized
                            />
                        </div>
                    )}
                    <div className="space-y-3">
                        <Button
                            onClick={() => router.push("/wallet")}
                            className="w-full h-12 rounded-xl"
                        >
                            View in Wallet
                        </Button>
                        <Button
                            onClick={() => router.push("/wallet/marketplace")}
                            variant="outline"
                            className="w-full h-12 rounded-xl"
                        >
                            Back to Marketplace
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Error View
    if (viewMode === "error") {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-6 max-w-sm"
                >
                    <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                        <XCircle className="w-10 h-10 text-destructive" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Purchase Failed</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            {error || "Something went wrong"}
                        </p>
                    </div>
                    <Button
                        onClick={() => setViewMode("preview")}
                        className="w-full h-12 rounded-xl"
                    >
                        Try Again
                    </Button>
                </motion.div>
            </div>
        );
    }

    // Preview View
    return (
        <div className="min-h-screen bg-background text-foreground p-4 pb-28">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto space-y-6"
            >
                {/* Header */}
                <div className="text-center space-y-1">
                    <h1 className="text-2xl font-bold">Confirm Purchase</h1>
                    <p className="text-sm text-muted-foreground">Review and confirm your NFT purchase</p>
                </div>

                {/* NFT Preview */}
                <Card className="bg-card border-border overflow-hidden">
                    <div className="relative aspect-square bg-muted">
                        {nft.image ? (
                            <Image
                                src={nft.image}
                                alt={nft.name}
                                fill
                                className="object-contain"
                                unoptimized
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-16 h-16 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <CardContent className="p-4">
                        <h2 className="text-lg font-bold">{nft.name}</h2>
                        {nft.collectionName && (
                            <p className="text-sm text-primary">{nft.collectionName}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Price Breakdown */}
                <Card className="bg-card border-border">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">NFT Price</span>
                            <span className="font-semibold">{priceInfo.basePriceFormatted} TON</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-1">
                                Platform Fee ({MARKETPLACE_FEE_PERCENT}%)
                                <Info className="w-3 h-3" />
                            </span>
                            <span className="text-muted-foreground">{priceInfo.platformFeeFormatted} TON</span>
                        </div>
                        <div className="border-t border-border pt-3">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold">Total</span>
                                <span className="text-xl font-bold text-primary">{priceInfo.totalPriceFormatted} TON</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Balance Warning */}
                {hasInsufficientBalance && (
                    <Card className="bg-destructive/10 border-destructive/30">
                        <CardContent className="p-4 flex items-center gap-3">
                            <XCircle className="w-5 h-5 text-destructive shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-destructive">Insufficient Balance</p>
                                <p className="text-xs text-muted-foreground">
                                    You need {priceInfo.totalPriceFormatted} TON but only have {balanceNum.toFixed(2)} TON
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Marketplace Info */}
                {nft.sale.market === "QC Marketplace" ? (
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-3 flex items-center gap-2 text-xs">
                            <Sparkles className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-primary font-medium">
                                QC Marketplace • Only {QC_MARKETPLACE_FEE_PERCENT}% fee
                            </span>
                        </CardContent>
                    </Card>
                ) : nft.sale.market ? (
                    <Card className="bg-muted/50 border-border">
                        <CardContent className="p-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Info className="w-4 h-4 shrink-0" />
                            <span>Listed on {nft.sale.market}. You may be redirected to complete the purchase.</span>
                        </CardContent>
                    </Card>
                ) : null}

                {/* Purchase Button */}
                <Button
                    onClick={handlePurchase}
                    disabled={hasInsufficientBalance}
                    className="w-full h-14 rounded-xl font-bold text-lg bg-green-600 hover:bg-green-700"
                >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Buy for {priceInfo.totalPriceFormatted} TON
                    <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
            </motion.div>

            {/* Biometric Auth Modal */}
            <BiometricAuth
                isOpen={isAuthOpen}
                onSuccess={handleAuthSuccess}
                onCancel={handleAuthCancel}
            />
        </div>
    );
}

