"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useForm, useStore } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { Address, Cell, toNano } from "@ton/core";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { nftListingPriceSchema } from "@/lib/validations";
import { calculateTotalPrice, categorizeNft } from "@/lib/nft-marketplace";
import { calculateFees, QC_MARKETPLACE_FEE_PERCENT } from "@/lib/nft-sale-contracts";
import { useNftDetailsQuery } from "@/app/(hooks)/queries/use-nft-details";
import { nftCreateListing, nftConfirmListing } from "../actions";
import { useQueryClient } from "@tanstack/react-query";
import ChatPickerModal from "@/app/(components)/ChatPickerModal";
import { dbfs } from "@/app/(firebase)/client";
import { collection, addDoc, doc, updateDoc, getDoc, increment, serverTimestamp } from "firebase/firestore";

export default function NftDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isTestnet, walletAddress } = useWallet();
    const { telegramId, qcUsername } = useUserContext();
    const nftAddress = decodeURIComponent(params.address as string);
    const sourceCollectionAddress = searchParams.get("collection");

    const { sendTransaction } = useWallet();
    const {
        isOpen: isAuthOpen,
        requestAuth,
        handleSuccess: handleAuthSuccess,
        handleCancel: handleAuthCancel,
    } = useBiometricAuth();
    const queryClient = useQueryClient();
    // Prefetch common NFT action routes
    useEffect(() => {
        router.prefetch(`/wallet/marketplace/buy/${encodeURIComponent(nftAddress)}`);
        router.prefetch(`/wallet/send-nft/${encodeURIComponent(nftAddress)}`);
        router.prefetch("/wallet");
    }, [router, nftAddress]);

    const { data: nft, isLoading, error: nftFetchError } = useNftDetailsQuery(nftAddress, isTestnet);

    useEffect(() => {
        if (nft?.collectionAddress) router.prefetch(`/wallet/marketplace/collection/${encodeURIComponent(nft.collectionAddress)}`);
    }, [router, nft?.collectionAddress]);
    const [copied, setCopied] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isBuying, setIsBuying] = useState(false);

    // Listing state
    const [showListingModal, setShowListingModal] = useState(false);
    const [isListing, setIsListing] = useState(false);

    const form = useForm({
        defaultValues: { price: "" },
        validators: { onSubmit: nftListingPriceSchema },
        onSubmit: async ({ value }) => {
            if (!walletAddress || !nftAddress || !telegramId) return;
            await executeListForSale(value.price);
        },
    });

    const listingPrice = useStore(form.store, (s) => s.values.price);

    // Share to chat state
    const [showShareModal, setShowShareModal] = useState(false);

    // Back button returns to the collection only when explicitly navigated from one.
    useTelegramBackButton(sourceCollectionAddress ? `/wallet/marketplace/collection/${encodeURIComponent(sourceCollectionAddress)}` : "/wallet");

    const EXPLORER_BASE_URL = isTestnet ? "https://testnet.tonviewer.com" : "https://tonviewer.com";

    // Check if current user owns this NFT
    const isOwner = (() => {
        try {
            return walletAddress && nft?.ownerAddress &&
                Address.parse(walletAddress).equals(Address.parse(nft.ownerAddress));
        } catch {
            return false;
        }
    })();

    // Helper to format address
    const formatFriendlyAddress = (address: string): string => {
        try {
            const addr = Address.parse(address);
            return addr.toString({ bounceable: true, testOnly: isTestnet });
        } catch {
            return address;
        }
    };

    const formatWalletAddress = (address: string): string => {
        try {
            const addr = Address.parse(address);
            return addr.toString({ bounceable: false, testOnly: isTestnet });
        } catch {
            return address;
        }
    };

    const error = nftFetchError ? "Failed to load NFT" : (!isLoading && !nft) ? "NFT not found" : null;

    const copyAddress = () => {
        if (nftAddress) {
            const friendlyAddress = formatFriendlyAddress(nftAddress);
            navigator.clipboard.writeText(friendlyAddress);
            setCopied(true);
            toast.success("Address copied!");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const openExplorer = () => {
        window.open(`${EXPLORER_BASE_URL}/${nftAddress}`, "_blank");
    };

    // Handle Buy NFT
    const handleBuy = async () => {
        if (!nft?.sale) return;
        
        setIsBuying(true);
        try {
            // Navigate to buy confirmation page
            router.push(`/wallet/marketplace/buy/${encodeURIComponent(nftAddress)}`);
        } catch (error) {
            console.error("Buy error:", error);
            toast.error("Failed to initiate purchase");
        } finally {
            setIsBuying(false);
        }
    };

    // Execute listing (called from form.onSubmit after Zod validation passes)
    const executeListForSale = async (listingPriceVal: string) => {
        if (isListing) return; // Prevent double-submit

        // Authenticate before sending on-chain transaction
        setIsListing(true);
        try {
            const authenticated = await requestAuth();
            if (!authenticated) {
                toast.error("Authentication required");
                setIsListing(false);
                return;
            }
        } catch {
            setIsListing(false);
            return;
        }
        try {
            // 1. Build listing messages (deploy sale contract + NFT transfer)
            const createResult = await nftCreateListing({
                nftAddress,
                sellerAddress: walletAddress!,
                price: listingPriceVal,
                // Pass royalty to collection owner for verified collections
                royaltyAddress: nft?.collectionAddress || undefined,
                royaltyPercent: nft?.collectionAddress ? 5 : undefined,
            });

            if (!createResult?.data?.success) {
                throw new Error(createResult?.serverError || "Failed to create listing");
            }

            const { saleContractAddress, messages } = createResult.data;

            // 2. Send on-chain transactions (deploy + NFT transfer)
            let lastTxHash = "";
            for (const msg of messages) {
                const bodyCell = msg.payload
                    ? Cell.fromBoc(Buffer.from(msg.payload, "base64"))[0]
                    : undefined;
                const stateInitCell = msg.stateInit
                    ? Cell.fromBoc(Buffer.from(msg.stateInit, "base64"))[0]
                    : undefined;

                const txResult = await sendTransaction({
                    to: msg.address,
                    value: msg.amount,
                    body: bodyCell,
                    stateInit: stateInitCell,
                });

                if (!txResult.success) {
                    throw new Error(txResult.error || "On-chain transaction failed");
                }
                if (txResult.txHash) {
                    lastTxHash = txResult.txHash;
                }
            }

            // 3. Confirm the listing in Firebase after on-chain success
            const confirmResult = await nftConfirmListing({
                nftAddress,
                saleContractAddress,
                sellerAddress: walletAddress!,
                price: listingPriceVal,
                nftName: nft?.name,
                nftImage: nft?.image,
                collectionAddress: nft?.collectionAddress,
                collectionName: nft?.collectionName,
                transactionHash: lastTxHash || undefined,
            });

            if (!confirmResult?.data?.success) {
                console.error("Confirm listing failed:", confirmResult?.serverError);
                toast.warning("NFT listed on-chain but failed to save to marketplace. Please contact support.");
            }

            haptics.success();
            toast.success("NFT listed for sale!", {
                description: `Listed for ${listingPriceVal} TON on QC Marketplace`,
            });

            setShowListingModal(false);
            form.reset();

            queryClient.invalidateQueries({ queryKey: ["nft-details", nftAddress, isTestnet] });

        } catch (error) {
            console.error("Listing error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to list NFT");
        } finally {
            setIsListing(false);
        }
    };

    const handleListForSale = () => form.handleSubmit();

    // Handle Share to Chat
    const handleShareToChat = async (chatId: string, chatName: string) => {
        if (!nft || !telegramId) return;
        try {
            const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");
            await addDoc(messagesRef, {
                senderId: telegramId,
                senderName: qcUsername || "Unknown",
                text: `Shared NFT: ${nft.name}`,
                createdAt: serverTimestamp(),
                type: "nft_share",
                nftShare: {
                    nftAddress: nft.address,
                    nftName: nft.name,
                    nftImage: nft.image || null,
                    nftPrice: nft.sale ? nft.sale.priceFormatted : null,
                    collectionName: nft.collectionName || null,
                },
            });

            // Update chat metadata so this chat bubbles to the top of the list
            const chatRef = doc(dbfs, "qc-chats", chatId);
            const chatSnap = await getDoc(chatRef);
            const participants: string[] = chatSnap.data()?.participants ?? [];
            const updates: Record<string, unknown> = {
                lastMessage: `Shared NFT: ${nft.name}`,
                lastMessageBy: telegramId,
                lastMessageAt: serverTimestamp(),
                [`readPositions.${telegramId}`]: serverTimestamp(),
                [`unreadCounts.${telegramId}`]: 0,
            };
            for (const pid of participants) {
                if (pid !== telegramId) {
                    updates[`unreadCounts.${pid}`] = increment(1);
                }
            }
            updateDoc(chatRef, updates).catch(() => {});

            setShowShareModal(false);
            toast.success(`Shared to ${chatName}`);
        } catch (error) {
            console.error("Share error:", error);
            toast.error("Failed to share NFT");
        }
    };

    // Calculate listing fee preview (include royalty for collection NFTs)
    const listingRoyaltyPercent = nft?.collectionAddress ? 5 : 0;
    const listingFeePreview = listingPrice && parseFloat(listingPrice) > 0
        ? calculateFees(toNano(listingPrice), listingRoyaltyPercent)
        : null;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4">
                <div className="max-w-md mx-auto space-y-6">
                    <Skeleton className="w-full aspect-square rounded-2xl bg-muted" />
                    <div className="space-y-3">
                        <Skeleton className="h-8 w-48 bg-muted" />
                        <Skeleton className="h-4 w-32 bg-muted" />
                        <Skeleton className="h-20 w-full bg-muted" />
                    </div>
                </div>
            </div>
        );
    }

    if (!nft) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-sm">
                    <Icon icon="lucide:image" className="w-16 h-16 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">NFT not found</p>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <p className="text-xs text-muted-foreground break-all font-mono px-4">Address: {nftAddress}</p>
                </div>
            </div>
        );
    }

    // Calculate price with fee if for sale
    const priceInfo = nft.sale ? calculateTotalPrice(nft.sale.price) : null;

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pb-24">
            <div
                className="max-w-md mx-auto space-y-6"
            >
                {/* NFT Image */}
                <Card className="bg-card border-border overflow-hidden rounded-2xl">
                    <div className="relative w-full aspect-square bg-muted" style={{ viewTransitionName: `nft-img-${nftAddress.slice(-8)}` }}>
                        {!imageLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Skeleton className="w-full h-full bg-muted" />
                            </div>
                        )}
                        {nft.image ? (
                            <Image
                                src={nft.image}
                                alt={nft.name}
                                fill
                                className={`object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setImageLoaded(true)}
                                unoptimized
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Icon icon="lucide:image" className="w-16 h-16 text-muted-foreground" />
                            </div>
                        )}
                        {categorizeNft(nft) === "gift" && (
                            <span className="absolute top-3 left-3 inline-flex items-center text-xs font-medium text-purple-400">
                                <Icon icon="solar:gift-bold" className="w-3 h-3 mr-1" />
                                Gift
                            </span>
                        )}
                        {categorizeNft(nft) === "sticker" && (
                            <span className="absolute top-3 left-3 text-xs font-medium text-neutral-300">
                                Sticker
                            </span>
                        )}
                    </div>
                </Card>

                {/* Sale Info - If Listed */}
                {nft.sale && priceInfo && (
                    <div className="w-full">
                        <div className="py-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Price</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        {priceInfo.basePriceFormatted} TON
                                    </p>
                                    {nft.sale.market && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Listed on {nft.sale.market}
                                        </p>
                                    )}
                                </div>
                                {!isOwner && (
                                    <Button
                                        onClick={handleBuy}
                                        disabled={isBuying}
                                        className="h-12 px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold"
                                    >
                                        {isBuying ? (
                                            <ButtonLoader size="sm" />
                                        ) : (
                                            <>
                                                <Icon icon="lucide:shopping-cart" className="w-4 h-4 mr-2" />
                                                Buy now
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                            <div className="mt-3 pt-3 text-xs text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Platform fee ({QC_MARKETPLACE_FEE_PERCENT}%)</span>
                                    <span>{priceInfo.platformFeeFormatted} TON</span>
                                </div>
                                <div className="flex justify-between font-semibold text-foreground mt-1">
                                    <span>Total</span>
                                    <span>{priceInfo.totalPriceFormatted} TON</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* NFT Info */}
                <div className="space-y-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground break-words">{nft.name}</h1>
                        {nft.collectionName && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => nft.collectionAddress && router.push(`/wallet/marketplace/collection/${encodeURIComponent(nft.collectionAddress)}`)}
                                className="h-auto p-0 text-sm text-primary hover:text-primary/80 hover:bg-transparent transition-colors mt-1 whitespace-normal break-words text-left"
                            >
                                {nft.collectionName}
                            </Button>
                        )}
                    </div>

                    {nft.description && (
                        <Card className="bg-card border-border">
                            <CardContent className="p-4">
                                <h3 className="text-xs text-muted-foreground mb-2">Description</h3>
                                <p className="text-sm text-foreground/80 leading-relaxed break-words">{nft.description}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Attributes */}
                    {nft.attributes && nft.attributes.length > 0 && (
                        <Card className="bg-card border-border">
                            <CardContent className="p-4">
                                <h3 className="text-xs text-muted-foreground mb-3">Attributes</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {nft.attributes.map((attr, i) => (
                                        <div key={i} className="bg-muted rounded-lg p-2 text-center">
                                            <p className="text-xs text-muted-foreground">{attr.trait_type}</p>
                                            <p className="text-sm font-semibold truncate">{attr.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Details Card */}
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 space-y-5">
                            <div>
                                <h3 className="text-xs text-muted-foreground mb-2">NFT address</h3>
                                <div
                                    onClick={copyAddress}
                                    className="flex items-center justify-between gap-3 bg-muted border border-border rounded-xl p-3 cursor-pointer hover:bg-muted/80 transition-colors"
                                >
                                    <p className="text-xs text-muted-foreground font-mono break-all">{formatFriendlyAddress(nftAddress)}</p>
                                    {copied ? (
                                        <Icon icon="lucide:check" className="w-4 h-4 text-green-500 shrink-0" />
                                    ) : (
                                        <Icon icon="lucide:copy" className="w-4 h-4 text-muted-foreground shrink-0" />
                                    )}
                                </div>
                            </div>

                            {nft.ownerAddress && (
                                <div>
                                    <h3 className="text-xs text-muted-foreground mb-2">
                                        Owner {isOwner && <span className="ml-2 text-xs text-green-500">You</span>}
                                    </h3>
                                    <Button
                                        variant="ghost"
                                        onClick={() => window.open(`${EXPLORER_BASE_URL}/${nft.ownerAddress}`, "_blank")}
                                        className="flex items-center justify-between w-full h-auto gap-3 bg-muted border border-border rounded-xl p-3 hover:bg-muted/80 transition-colors overflow-hidden"
                                    >
                                        <p className="text-xs text-primary font-mono truncate min-w-0">
                                            {(() => {
                                                const addr = formatWalletAddress(nft.ownerAddress!);
                                                return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
                                            })()}
                                        </p>
                                        <Icon icon="lucide:external-link" className="w-4 h-4 text-muted-foreground shrink-0" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {isOwner && !nft.sale && (
                        <Button
                            onClick={() => setShowListingModal(true)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white h-12 rounded-xl font-bold"
                        >
                            <Icon icon="lucide:dollar-sign" className="w-4 h-4 mr-2" />
                            List for sale
                        </Button>
                    )}
                    {isOwner && nft.sale && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                                This NFT is currently listed for sale
                            </p>
                        </div>
                    )}
                    {isOwner && (
                        <Button
                            onClick={() => router.push(`/wallet/send-nft/${encodeURIComponent(nftAddress)}`)}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl font-bold"
                        >
                            <Icon icon="lucide:send" className="w-4 h-4 mr-2" />
                            Send NFT
                        </Button>
                    )}
                    <Button
                        onClick={() => setShowShareModal(true)}
                        variant="outline"
                        className="w-full bg-card border-border text-foreground hover:bg-muted h-12 rounded-xl font-bold"
                    >
                        <Icon icon="solar:share-linear" className="w-4 h-4 mr-2" />
                        Share to chat
                    </Button>
                    <Button
                        onClick={openExplorer}
                        variant="outline"
                        className="w-full bg-card border-border text-foreground hover:bg-muted h-12 rounded-xl font-bold"
                    >
                        <Icon icon="lucide:external-link" className="w-4 h-4 mr-2" />
                        View on Explorer
                    </Button>
                </div>
            </div>

            {/* Share to Chat Modal */}
            <ChatPickerModal
                open={showShareModal}
                onClose={() => setShowShareModal(false)}
                onSelect={handleShareToChat}
            />

            {/* Listing Modal */}
            
                {showListingModal && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
                        onClick={() => !isListing && setShowListingModal(false)}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <h2 className="text-lg font-bold">List for sale</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => !isListing && setShowListingModal(false)}
                                    disabled={isListing}
                                    className="h-8 w-8"
                                >
                                    <Icon icon="lucide:x" className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-4">
                                {/* NFT Preview */}
                                <div className="flex items-center gap-3 bg-muted rounded-xl p-3">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                                        {nft.image ? (
                                            <Image
                                                src={nft.image}
                                                alt={nft.name}
                                                width={48}
                                                height={48}
                                                className="w-full h-full object-cover"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Icon icon="lucide:image" className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold truncate">{nft.name}</p>
                                        {nft.collectionName && (
                                            <p className="text-xs text-muted-foreground truncate">{nft.collectionName}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Price Input */}
                                <form.Field name="price">
                                    {(field) => (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Price (TON)</label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min={0.1}
                                                    placeholder="Min 0.1 TON"
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                    className="h-12 text-lg pr-16"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                                                    TON
                                                </span>
                                            </div>
                                            {field.state.meta.errors.length > 0 && (
                                                <FieldError errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />
                                            )}
                                        </div>
                                    )}
                                </form.Field>

                                {/* Fee Breakdown */}
                                {listingPrice && parseFloat(listingPrice) >= 0.1 && listingFeePreview && (
                                    <div className="bg-muted rounded-xl p-3 space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                            <Icon icon="lucide:info" className="w-4 h-4" />
                                            <span>Fee Breakdown</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Listing Price</span>
                                            <span>{listingPrice} TON</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Platform Fee ({QC_MARKETPLACE_FEE_PERCENT}%)</span>
                                            <span className="text-muted-foreground">-{(parseFloat(listingPrice) * QC_MARKETPLACE_FEE_PERCENT / 100).toFixed(4)} TON</span>
                                        </div>
                                        {listingRoyaltyPercent > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Creator Royalty ({listingRoyaltyPercent}%)</span>
                                                <span className="text-muted-foreground">-{(parseFloat(listingPrice) * listingRoyaltyPercent / 100).toFixed(4)} TON</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-semibold pt-2 border-t border-border">
                                            <span>You Receive</span>
                                            <span className="text-green-500">
                                                {listingFeePreview ? (Number(listingFeePreview.sellerReceives) / 1e9).toFixed(4) : "0"} TON
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* QC Marketplace Badge */}
                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                    <span className="bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                                        QC Marketplace
                                    </span>
                                    <span>•</span>
                                    <span>Only {QC_MARKETPLACE_FEE_PERCENT}% fee (coming soon)</span>
                                </div>

                                {/* List Button */}
                                <Button
                                    onClick={handleListForSale}
                                    disabled={isListing || !listingPrice || parseFloat(listingPrice) < 0.1}
                                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold"
                                >
                                    {isListing ? (
                                        <ButtonLoader size="sm" />
                                    ) : (
                                        <>
                                            <Icon icon="lucide:tag" className="w-4 h-4 mr-2" />
                                            List for {listingPrice || "0"} TON
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            

            {/* Biometric Auth Modal */}
            <BiometricAuth
                isOpen={isAuthOpen}
                onSuccess={handleAuthSuccess}
                onCancel={handleAuthCancel}
            />
        </div>
    );
}
