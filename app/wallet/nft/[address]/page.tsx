"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, Image as ImageIcon, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../../WalletContext";
import { Address } from "@ton/core";
import { toast } from "sonner";

interface NftDetails {
    address: string;
    name: string;
    description?: string;
    image?: string;
    collectionName?: string;
    collectionAddress?: string;
    ownerAddress?: string;
}

export default function NftDetailPage() {
    useTelegramBackButton("/wallet");
    const params = useParams();
    const router = useRouter();
    const { isTestnet } = useWallet();
    // Decode the URL-encoded address parameter
    const nftAddress = decodeURIComponent(params.address as string);

    const [nft, setNft] = useState<NftDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const EXPLORER_BASE_URL = isTestnet ? "https://testnet.tonviewer.com" : "https://tonviewer.com";
    const API_BASE_URL = isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io";

    // Helper to format address to EQ format (bounceable - for contracts/NFTs)
    const formatFriendlyAddress = useCallback((address: string): string => {
        try {
            const addr = Address.parse(address);
            return addr.toString({ bounceable: true, testOnly: isTestnet });
        } catch {
            return address;
        }
    }, [isTestnet]);

    // Helper to format address to UQ format (non-bounceable - for wallets)
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

    useEffect(() => {
        const fetchNftDetails = async () => {
            if (!nftAddress) return;

            setIsLoading(true);
            setError(null);
            try {
                // TonAPI expects the raw address format
                const apiUrl = `${API_BASE_URL}/v2/nfts/${encodeURIComponent(nftAddress)}`;

                const response = await fetch(apiUrl);

                if (response.ok) {
                    const data = await response.json();

                    // Get best preview image
                    const preview = data.previews?.find((p: { resolution: string }) => p.resolution === '500x500')
                        || data.previews?.find((p: { resolution: string }) => p.resolution === '100x100')
                        || data.previews?.[0];

                    setNft({
                        address: data.address,
                        name: data.metadata?.name || 'Unnamed NFT',
                        description: data.metadata?.description,
                        image: preview?.url || data.metadata?.image,
                        collectionName: data.collection?.name,
                        collectionAddress: data.collection?.address,
                        ownerAddress: data.owner?.address,
                    });
                } else {
                    const errorText = await response.text();
                    console.error("[NFT Detail] API Error:", response.status, errorText);
                    setError(`API returned ${response.status}`);
                }
            } catch (err) {
                console.error("[NFT Detail] Failed to fetch NFT details:", err);
                setError("Failed to load NFT");
            } finally {
                setIsLoading(false);
            }
        };

        fetchNftDetails();
    }, [nftAddress, API_BASE_URL]);

    const copyAddress = () => {
        if (nftAddress) {
            // Copy the friendly format address
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
                    </div>
                </Card>

                {/* NFT Info */}
                <div className="space-y-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{nft.name}</h1>
                        {nft.collectionName && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => nft.collectionAddress && window.open(`${EXPLORER_BASE_URL}/${nft.collectionAddress}`, "_blank")}
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



                    {/* Details Card - NFT Address & Owner */}
                    <Card className="bg-card border-border">
                        <CardContent className="p-4 space-y-5">
                            {/* NFT Address */}
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

                            {/* Owner */}
                            {nft.ownerAddress && (
                                <div>
                                    <h3 className="text-xs text-muted-foreground uppercase mb-2">Owner</h3>
                                    <Button
                                        variant="ghost"
                                        onClick={() => window.open(`${EXPLORER_BASE_URL}/${nft.ownerAddress}`, "_blank")}
                                        className="flex items-center justify-between w-full h-auto gap-3 bg-muted border border-border rounded-xl p-3 hover:bg-muted/80 transition-colors"
                                    >
                                        <p className="text-xs text-primary font-mono break-all">{formatWalletAddress(nft.ownerAddress)}</p>
                                        <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <Button
                        onClick={() => router.push(`/wallet/send-nft/${encodeURIComponent(nftAddress)}`)}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl font-bold"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        Send NFT
                    </Button>
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
