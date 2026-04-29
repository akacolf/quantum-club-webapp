"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "@/app/wallet/WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { Cell } from "@ton/core";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { calculateTotalPrice } from "@/lib/nft-marketplace";
import { useNftDetailsQuery } from "@/app/(hooks)/queries/use-nft-details";
import {
    getSaleInfo,
    SaleContractError,
    QC_MARKETPLACE_FEE_PERCENT,
} from "@/lib/nft-sale-contracts";
import { convertTonToStars } from "@/lib/telegram-payments";
import { nftBuildBuy, nftConfirmSale } from "@/app/wallet/nft/actions";
import { createStarsInvoice } from "../actions";

type ViewMode = "preview" | "processing" | "success" | "error";

export default function BuyNftPage() {
    const params = useParams();
    const nftAddress = decodeURIComponent(params.address as string);
    useTelegramBackButton(`/wallet/nft/${encodeURIComponent(nftAddress)}`);
    const router = useRouter();
    const { isTestnet, walletAddress, tonBalance, sendTransaction, tonPrice } = useWallet();
    const { telegramId } = useUserContext();
    const {
        isOpen: isAuthOpen,
        requestAuth,
        handleSuccess: handleAuthSuccess,
        handleCancel: handleAuthCancel,
    } = useBiometricAuth();

    // Prefetch post-purchase destinations
    useEffect(() => {
        router.prefetch("/wallet");
        router.prefetch("/wallet/marketplace");
    }, [router]);

    const { data: nft, isLoading, error: nftFetchError } = useNftDetailsQuery(nftAddress, isTestnet);
    const [viewMode, setViewMode] = useState<ViewMode>("preview");
    const [error, setError] = useState<string | null>(null);

    // Sync fetch error into local error state
    useEffect(() => {
        if (nftFetchError) setError("Failed to load NFT");
    }, [nftFetchError]);
    const [paymentMethod, setPaymentMethod] = useState<"TON" | "STARS">("TON");
    const [starsAmount, setStarsAmount] = useState<number | null>(null);

    // Calculate price with fee
    const priceInfo = nft?.sale ? calculateTotalPrice(nft.sale.price) : null;

    // Calculate Stars equivalent when price or TON price changes
    useEffect(() => {
        if (priceInfo) {
            const tonPriceUsd = tonPrice > 0 ? tonPrice : 5.5; // Live price from wallet, fallback $5.50
            const tonAmount = Number(priceInfo.totalPrice) / 1e9;
            const stars = convertTonToStars(tonAmount, tonPriceUsd);
            setStarsAmount(stars);
        }
    }, [priceInfo, tonPrice]);

    // Check balance - tonBalance is a string in WalletContext
    const balanceNum = typeof tonBalance === 'string' ? parseFloat(tonBalance) : tonBalance;
    const hasInsufficientBalance = paymentMethod === "TON" && priceInfo ? balanceNum < Number(priceInfo.totalPrice) / 1e9 : false;

    // Handle purchase
    const handlePurchase = async () => {
        if (!nft?.sale || !priceInfo || !walletAddress || !telegramId) {
            toast.error("Missing purchase information");
            return;
        }

        // For Stars payment, use Telegram Stars flow
        if (paymentMethod === "STARS") {
            await handleStarsPurchase();
            return;
        }

        // Authenticate for TON payment
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
                const buildResult = await nftBuildBuy({
                    saleContractAddress: nft.sale.address,
                    price: (Number(saleInfo.fullPrice) / 1e9).toString(),
                });

                if (!buildResult?.data?.success) {
                    throw new Error(buildResult?.serverError || "Failed to build transaction");
                }

                // Send the transaction via wallet
                const tx = buildResult.data.transaction;
                const bodyCell = tx.payload ? Cell.fromBoc(Buffer.from(tx.payload, "base64"))[0] : undefined;

                const txResult = await sendTransaction({
                    to: tx.address,
                    value: tx.amount,
                    body: bodyCell,
                });

                if (txResult.success) {
                    // Confirm the sale in Firebase
                    await nftConfirmSale({
                        listingId: nft.sale.address,
                        buyerAddress: walletAddress!,
                        transactionHash: txResult.txHash || "",
                    });

                    haptics.success();
                    toast.success("NFT purchased successfully!");
                    setViewMode("success");
                } else {
                    throw new Error(txResult.error || "Transaction failed");
                }
            } else {
                // NFT is not listed on QC Marketplace - show error instead of external redirect
                toast.error("NFT not available", {
                    description: "This NFT is not listed for sale on our marketplace.",
                });
                setError("This NFT is not listed for sale on our marketplace. Please wait for the owner to list it.");
                setViewMode("error");
            }

        } catch (err) {
            haptics.error();
            console.error("Purchase error:", err);
            if (err instanceof SaleContractError && err.code === "NETWORK_ERROR") {
                setError("Connection issue while verifying sale. Please check your network and try again.");
            } else {
                setError(err instanceof Error ? err.message : "Purchase failed");
            }
            setViewMode("error");
        }
    };

    // Handle Telegram Stars purchase
    const handleStarsPurchase = async () => {
        if (!nft?.sale || !starsAmount || !telegramId) {
            toast.error("Missing purchase information");
            return;
        }

        setViewMode("processing");

        try {
            // Create Stars invoice via server action
            const tonAmount = Number(priceInfo!.totalPrice) / 1e9;
            const tonPriceUsd = tonPrice > 0 ? tonPrice : 5.5;
            const invoiceResult = await createStarsInvoice({
                title: `NFT: ${nft.name || "NFT Purchase"}`,
                description: `Purchase NFT from ${nft.collectionName || "collection"}`,
                payload: JSON.stringify({
                    type: "nft_purchase",
                    nftAddress: nftAddress,
                    buyerId: telegramId,
                    sellerAddress: nft.sale.owner,
                    saleContractAddress: nft.sale.address,
                }),
                tonAmount,
                tonPriceUsd,
            });

            if (invoiceResult?.serverError) {
                throw new Error(invoiceResult.serverError);
            }
            const result = invoiceResult?.data;

            if (result?.success && result.invoiceLink) {
                // Open Telegram Stars payment in Telegram WebApp
                if (typeof window !== "undefined" && window.Telegram?.WebApp) {
                    // Use type assertion - openInvoice is available in Telegram WebApp but not in all type definitions
                    const webApp = window.Telegram.WebApp as unknown as {
                        openInvoice: (url: string, callback: (status: string) => void) => void;
                    };
                    webApp.openInvoice(result.invoiceLink, (status) => {
                        if (status === "paid") {
                            toast.success("Payment successful! NFT will be transferred shortly.");
                            setViewMode("success");
                        } else if (status === "cancelled") {
                            toast.info("Payment cancelled");
                            setViewMode("preview");
                        } else {
                            toast.error("Payment failed");
                            setViewMode("error");
                        }
                    });
                } else {
                    // Fallback: open in browser (won't work as well)
                    window.open(result.invoiceLink, "_blank");
                    toast.info("Complete payment in Telegram");
                }
            } else {
                throw new Error("Failed to create invoice");
            }
        } catch (err) {
            console.error("Stars purchase error:", err);
            setError(err instanceof Error ? err.message : "Stars payment failed");
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
                    <Icon icon="lucide:x-circle" className="w-16 h-16 text-destructive mx-auto mb-4" />
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
                <div
                    className="text-center space-y-6"
                >
                    <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <ButtonLoader size="lg" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Processing Purchase</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            Please complete the transaction in the opened window
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Success View
    if (viewMode === "success") {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 flex items-center justify-center">
                <div
                    className="text-center space-y-6 max-w-sm"
                >
                    <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                        <Icon icon="lucide:check-circle-2" className="w-10 h-10 text-green-500" />
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
                        <Button asChild className="w-full h-12 rounded-xl">
                            <Link href="/wallet">View in Wallet</Link>
                        </Button>
                        <Button variant="outline" asChild className="w-full h-12 rounded-xl">
                            <Link href="/wallet/marketplace">Back to Marketplace</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Error View
    if (viewMode === "error") {
        return (
            <div className="fixed inset-0 bg-background text-foreground p-4 flex items-center justify-center">
                <div
                    className="text-center space-y-6 max-w-sm"
                >
                    <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                        <Icon icon="lucide:x-circle" className="w-10 h-10 text-destructive" />
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
                </div>
            </div>
        );
    }

    // Preview View
    return (
        <div className="min-h-screen bg-background text-foreground p-4 pb-28">
            <div
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
                                <Icon icon="lucide:image" className="w-16 h-16 text-muted-foreground" />
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
                                Platform Fee ({QC_MARKETPLACE_FEE_PERCENT}%)
                                <Icon icon="lucide:info" className="w-3 h-3" />
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
                            <Icon icon="lucide:x-circle" className="w-5 h-5 text-destructive shrink-0" />
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
                            <Icon icon="lucide:sparkles" className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-primary font-medium">
                                QC Marketplace • Only {QC_MARKETPLACE_FEE_PERCENT}% fee
                            </span>
                        </CardContent>
                    </Card>
                ) : nft.sale.market ? (
                    <Card className="bg-muted/50 border-border">
                        <CardContent className="p-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Icon icon="lucide:info" className="w-4 h-4 shrink-0" />
                            <span>Listed on {nft.sale.market}. You may be redirected to complete the purchase.</span>
                        </CardContent>
                    </Card>
                ) : null}

                {/* Payment Method Selector */}
                <Card className="bg-card border-border">
                    <CardContent className="p-4">
                        <p className="text-sm font-semibold mb-3">Payment Method</p>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant={paymentMethod === "TON" ? "default" : "outline"}
                                onClick={() => setPaymentMethod("TON")}
                                className={`flex-1 h-12 ${paymentMethod === "TON" ? "bg-primary" : ""}`}
                            >
                                <span className="mr-2">💎</span>
                                <div className="text-left">
                                    <div className="font-semibold">TON</div>
                                    <div className="text-xs opacity-75">{priceInfo.totalPriceFormatted} TON</div>
                                </div>
                            </Button>
                            <Button
                                variant={paymentMethod === "STARS" ? "default" : "outline"}
                                onClick={() => setPaymentMethod("STARS")}
                                className={`flex-1 h-12 ${paymentMethod === "STARS" ? "bg-yellow-500 hover:bg-yellow-600" : ""}`}
                            >
                                <span className="mr-2">⭐</span>
                                <div className="text-left">
                                    <div className="font-semibold">Stars</div>
                                    <div className="text-xs opacity-75">{starsAmount || "..."} Stars</div>
                                </div>
                            </Button>
                        </div>
                        {paymentMethod === "STARS" && (
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                Pay with Telegram Stars • No wallet needed
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Purchase Button */}
                <Button
                    onClick={handlePurchase}
                    disabled={hasInsufficientBalance}
                    className="w-full h-14 rounded-xl font-bold text-lg bg-green-600 hover:bg-green-700"
                >
                    <Icon icon="lucide:shopping-cart" className="w-5 h-5 mr-2" />
                    {paymentMethod === "TON" 
                        ? `Buy for ${priceInfo.totalPriceFormatted} TON`
                        : `Buy for ${starsAmount || "..."} Stars`}
                    <Icon icon="lucide:arrow-right" className="w-5 h-5 ml-2" />
                </Button>
            </div>

            {/* Biometric Auth Modal */}
            <BiometricAuth
                isOpen={isAuthOpen}
                onSuccess={handleAuthSuccess}
                onCancel={handleAuthCancel}
            />
        </div>
    );
}

