"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Image as ImageIcon,
    ExternalLink,
    Grid3X3,
    Loader2,
    Tag,
    Users,
    ChevronRight,
    BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import {
    getCollectionDetails,
    getCollectionItems,
    type NftCollection,
    type NftItem,
} from "@/lib/nft-marketplace";
import { useWallet } from "@/app/wallet/WalletContext";

export default function CollectionDetailPage() {
    useTelegramBackButton("/wallet/marketplace");
    const params = useParams();
    const { isTestnet } = useWallet();

    const collectionAddress = decodeURIComponent(params.address as string);

    const [collection, setCollection] = useState<NftCollection | null>(null);
    const [items, setItems] = useState<NftItem[]>([]);
    const [isLoadingCollection, setIsLoadingCollection] = useState(true);
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

    const EXPLORER_BASE_URL = isTestnet ? "https://testnet.tonviewer.com" : "https://tonviewer.com";

    // Handle image error
    const handleImageError = (address: string) => {
        setImageErrors(prev => new Set(prev).add(address));
    };

    // Format items count
    const formatItemsCount = (count: number) => {
        if (count <= 0) return "∞";
        return count.toLocaleString();
    };

    // Fetch collection details
    const fetchCollection = useCallback(async () => {
        setIsLoadingCollection(true);
        try {
            const data = await getCollectionDetails(collectionAddress, isTestnet);
            setCollection(data);
        } catch (error) {
            console.error("Failed to fetch collection:", error);
        } finally {
            setIsLoadingCollection(false);
        }
    }, [collectionAddress, isTestnet]);

    // Fetch collection items
    const fetchItems = useCallback(async () => {
        setIsLoadingItems(true);
        try {
            const data = await getCollectionItems(collectionAddress, 100, 0, isTestnet);
            // Only show items that are for sale
            const forSaleItems = data.filter(item => item.sale !== null);
            setItems(forSaleItems);
        } catch (error) {
            console.error("Failed to fetch items:", error);
        } finally {
            setIsLoadingItems(false);
        }
    }, [collectionAddress, isTestnet]);

    useEffect(() => {
        fetchCollection();
        fetchItems();
    }, [fetchCollection, fetchItems]);

    if (isLoadingCollection) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4">
                <div className="space-y-4">
                    <Skeleton className="w-full h-48 rounded-2xl" />
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                    <div className="grid grid-cols-2 gap-3 mt-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="aspect-square rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!collection) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 flex items-center justify-center">
                <Card className="bg-card border-border p-8 text-center">
                    <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold">Collection not found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        This collection may not exist or is unavailable
                    </p>
                    <Link href="/wallet/marketplace">
                        <Button className="mt-4" variant="outline">
                            Back to Marketplace
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-28">
            {/* Cover Image */}
            <div className="relative h-48 bg-muted">
                {collection.coverImage || collection.image ? (
                    <Image
                        src={collection.coverImage || collection.image || ""}
                        alt={collection.name}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            </div>

            <div className="px-4 -mt-16 relative z-10 space-y-6">
                {/* Collection Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    {/* Collection Avatar */}
                    <div className="w-24 h-24 rounded-2xl border-4 border-background overflow-hidden bg-card">
                        {collection.image ? (
                            <Image
                                src={collection.image}
                                alt={collection.name}
                                width={96}
                                height={96}
                                className="object-cover w-full h-full"
                                unoptimized
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                                <ImageIcon className="w-10 h-10 text-muted-foreground" />
                            </div>
                        )}
                    </div>

                    {/* Collection Info */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">{collection.name}</h1>
                            {collection.verified && (
                                <BadgeCheck className="w-6 h-6 text-blue-500 shrink-0" />
                            )}
                        </div>
                        {collection.description && (
                            <p className="text-sm text-muted-foreground line-clamp-3">
                                {collection.description}
                            </p>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <Card className="bg-card border-border">
                            <CardContent className="p-3 text-center">
                                <Grid3X3 className="w-4 h-4 text-primary mx-auto mb-1" />
                                <p className="text-lg font-bold">{formatItemsCount(collection.itemsCount)}</p>
                                <p className="text-xs text-muted-foreground">Items</p>
                            </CardContent>
                        </Card>
                        {collection.ownersCount && (
                            <Card className="bg-card border-border">
                                <CardContent className="p-3 text-center">
                                    <Users className="w-4 h-4 text-primary mx-auto mb-1" />
                                    <p className="text-lg font-bold">{collection.ownersCount.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">Owners</p>
                                </CardContent>
                            </Card>
                        )}
                        {collection.floorPrice && (
                            <Card className="bg-card border-border">
                                <CardContent className="p-3 text-center">
                                    <Tag className="w-4 h-4 text-primary mx-auto mb-1" />
                                    <p className="text-lg font-bold">{(collection.floorPrice / 1e9).toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">Floor (TON)</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* View on Explorer */}
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(`${EXPLORER_BASE_URL}/${collectionAddress}`, "_blank")}
                    >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on Explorer
                    </Button>
                </motion.div>

                {/* NFT Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-3"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">For Sale</h2>
                        {!isLoadingItems && (
                            <Badge variant="outline">{items.length} available</Badge>
                        )}
                    </div>

                    {isLoadingItems ? (
                        <div className="grid grid-cols-2 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="aspect-square rounded-xl" />
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <Card className="bg-card border-border p-8 text-center">
                            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">No items currently for sale</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {items.map((item, index) => (
                                <motion.div
                                    key={item.address}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.02 }}
                                >
                                    <Link
                                        href={`/wallet/nft/${encodeURIComponent(item.address)}`}
                                        prefetch={true}
                                    >
                                        <Card className="bg-card border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-all">
                                            <div className="relative aspect-square bg-muted overflow-hidden">
                                                {item.image && !imageErrors.has(item.address) ? (
                                                    <Image
                                                        src={item.image}
                                                        alt={item.name}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                        onError={() => handleImageError(item.address)}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                                        <ImageIcon className="w-10 h-10 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                            <CardContent className="p-3">
                                                <p className="font-semibold text-sm truncate">{item.name}</p>
                                                <div className="flex items-center justify-between mt-1">
                                                    <p className="text-sm font-bold text-primary">
                                                        {item.sale?.priceFormatted} TON
                                                    </p>
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {isLoadingItems && (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
