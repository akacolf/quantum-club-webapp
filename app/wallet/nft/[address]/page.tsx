"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, Image as ImageIcon, Send, ShoppingCart, Tag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../../WalletContext";
import { Address } from "@ton/core";
import { toast } from "sonner";
import { getNftDetails, calculateTotalPrice, MARKETPLACE_FEE_PERCENT, type NftItem } from "@/lib/nft-marketplace";

export default function NftDetailPage() {
    useTelegramBackButton("/wallet");
    const params = useParams();
    const router = useRouter();
    const { isTestnet, walletAddress } = useWallet();
    const nftAddress = decodeURIComponent(params.address as string);

    const [nft, setNft] = useState<NftItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isBuying, setIsBuying] = useState(false);

    const EXPLORER_BASE_URL = isTestnet ? "https://testnet.tonviewer.com" : "https://tonviewer.com";

    // Check if current user owns this NFT
    const isOwner = walletAddress && nft?.ownerAddress && 
        Address.parse(walletAddress).equals(Address.parse(nft.ownerAddress));

    // Helper to format address
    const formatFriendlyAddress = useCallback((address: string): string => {
        try {
            const addr = Address.parse(address);
            return addr.toString({ bounceable: true, testOnly: isTestnet });
        } catch {
            return address;
        }
    }, [isTestnet]);

    const formatWalletAddress = useCallback((address: string): string => {
        try {
            const addr = Address.parse(address);
            return addr.toString({ bounceable: false, testOnly: isTestnet });
        } catch {
            return address;
        }
    }, [isTestnet]);

    // Prefetch send-nft page
    useEffect(() => {
        if (nftAddress) {
            router.prefetch(`/wallet/send-nft/${encodeURIComponent(nftAddress)}`);
        }
    }, [router, nftAddress]);

    // Fetch NFT details with sale info
    useEffect(() => {
        const fetchNft = async () => {
            if (!nftAddress) return;
            setIsLoading(true);
            setError(null);
            try {
                const data = await getNftDetails(nftAddress, isTestnet);
                if (data) {
                    setNft(data);
                } else {
                    setError("NFT not found");
                }
            } catch (err) {
                console.error("[NFT Detail] Failed to fetch:", err);
                setError("Failed to load NFT");
            } finally {
                setIsLoading(false);
            }
        };
        fetchNft();
    }, [nftAddress, isTestnet]);

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
                    <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto" />
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
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto space-y-6"
            >
                {/* NFT Image */}
                <Card className="bg-card border-border overflow-hidden rounded-2xl">
                    <div className="relative w-full aspect-square bg-muted">
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
                                <ImageIcon className="w-16 h-16 text-muted-foreground" />
                            </div>
                        )}
                        {nft.sale && (
                            <Badge className="absolute top-3 right-3 bg-green-600">
                                <Tag className="w-3 h-3 mr-1" />
                                For Sale
                            </Badge>
                        )}
                    </div>
                </Card>

                {/* Sale Info - If Listed */}
                {nft.sale && priceInfo && (
                    <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">Price</p>
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
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <ShoppingCart className="w-4 h-4 mr-2" />
                                                Buy Now
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                            <div className="mt-3 pt-3 border-t border-green-500/20 text-xs text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Platform fee ({MARKETPLACE_FEE_PERCENT}%)</span>
                                    <span>{priceInfo.platformFeeFormatted} TON</span>
                                </div>
                                <div className="flex justify-between font-semibold text-foreground mt-1">
                                    <span>Total</span>
                                    <span>{priceInfo.totalPriceFormatted} TON</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* NFT Info */}
                <div className="space-y-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{nft.name}</h1>
                        {nft.collectionName && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => nft.collectionAddress && router.push(`/wallet/marketplace/collection/${encodeURIComponent(nft.collectionAddress)}`)}
                                className="h-auto p-0 text-sm text-primary hover:text-primary/80 hover:bg-transparent transition-colors mt-1"
                            >
                                {nft.collectionName}
                            </Button>
                        )}
                    </div>

                    {nft.description && (
                        <Card className="bg-card border-border">
                            <CardContent className="p-4">
                                <h3 className="text-xs text-muted-foreground uppercase mb-2">Description</h3>
                                <p className="text-sm text-foreground/80 leading-relaxed">{nft.description}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Attributes */}
                    {nft.attributes && nft.attributes.length > 0 && (
                        <Card className="bg-card border-border">
                            <CardContent className="p-4">
                                <h3 className="text-xs text-muted-foreground uppercase mb-3">Attributes</h3>
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
                                <h3 className="text-xs text-muted-foreground uppercase mb-2">NFT Address</h3>
                                <div
                                    onClick={copyAddress}
                                    className="flex items-center justify-between gap-3 bg-muted border border-border rounded-xl p-3 cursor-pointer hover:bg-muted/80 transition-colors"
                                >
                                    <p className="text-xs text-muted-foreground font-mono break-all">{formatFriendlyAddress(nftAddress)}</p>
                                    {copied ? (
                                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
                                    )}
                                </div>
                            </div>

                            {nft.ownerAddress && (
                                <div>
                                    <h3 className="text-xs text-muted-foreground uppercase mb-2">
                                        Owner {isOwner && <Badge variant="secondary" className="ml-2 text-xs">You</Badge>}
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
                                        <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {isOwner && (
                        <Button
                            onClick={() => router.push(`/wallet/send-nft/${encodeURIComponent(nftAddress)}`)}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl font-bold"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            Send NFT
                        </Button>
                    )}
                    <Button
                        onClick={openExplorer}
                        variant="outline"
                        className="w-full bg-card border-border text-foreground hover:bg-muted h-12 rounded-xl font-bold"
                    >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on Explorer
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
