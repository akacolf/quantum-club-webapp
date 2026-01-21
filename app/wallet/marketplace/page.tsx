"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
    Search,
    TrendingUp,
    Grid3X3,
    Image as ImageIcon,
    ChevronRight,
    Loader2,
    Sparkles,
    BadgeCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { getPopularCollections, type NftCollection } from "@/lib/nft-marketplace";
import { useWallet } from "../WalletContext";

export default function MarketplacePage() {
    useTelegramBackButton("/wallet");
    const { isTestnet } = useWallet();

    const [collections, setCollections] = useState<NftCollection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

    // Fetch collections
    const fetchCollections = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getPopularCollections(30, isTestnet);
            setCollections(data);
        } catch (error) {
            console.error("Failed to fetch collections:", error);
        } finally {
            setIsLoading(false);
        }
    }, [isTestnet]);

    useEffect(() => {
        fetchCollections();
    }, [fetchCollections]);

    // Handle image error
    const handleImageError = (address: string) => {
        setImageErrors(prev => new Set(prev).add(address));
    };

    // Filter collections by search
    const filteredCollections = searchQuery
        ? collections.filter((c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : collections;

    // Featured collections (first 5)
    const featuredCollections = filteredCollections.slice(0, 5);
    // All collections
    const allCollections = filteredCollections;

    // Format items count - handle -1 or negative values
    const formatItemsCount = (count: number) => {
        if (count < 0) return "∞";
        return count.toLocaleString();
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-28">
            <div className="px-4 pt-4 space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                >
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">NFT Marketplace</h1>
                        <Badge variant="secondary" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Beta
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Discover and collect unique NFTs on TON
                    </p>
                </motion.div>

                {/* Search */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                >
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search collections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12 bg-card border-border rounded-xl"
                        />
                    </div>
                </motion.div>

                {/* Featured Collections Carousel */}
                {!searchQuery && featuredCollections.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Trending
                            </h2>
                        </div>

                        <div className="-mx-4">
                            <div className="flex gap-3 px-4 pb-2 overflow-x-auto scrollbar-hide">
                                {isLoading
                                    ? Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton
                                            key={i}
                                            className="w-[200px] h-[140px] rounded-xl flex-shrink-0"
                                        />
                                    ))
                                    : featuredCollections.map((collection, index) => (
                                        <motion.div
                                            key={collection.address}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex-shrink-0"
                                        >
                                            <Link
                                                href={`/wallet/marketplace/collection/${encodeURIComponent(collection.address)}`}
                                                prefetch={true}
                                            >
                                                <Card className="w-[200px] bg-card border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors">
                                                    <div className="relative h-24 bg-muted overflow-hidden">
                                                        {collection.image && !imageErrors.has(collection.address) ? (
                                                            <Image
                                                                src={collection.image}
                                                                alt={collection.name}
                                                                fill
                                                                className="object-cover"
                                                                unoptimized
                                                                onError={() => handleImageError(collection.address)}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <CardContent className="p-3">
                                                        <div className="flex items-center gap-1">
                                                            <p className="font-semibold text-sm truncate">
                                                                {collection.name}
                                                            </p>
                                                            {collection.verified && (
                                                                <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatItemsCount(collection.itemsCount)} items
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        </motion.div>
                                    ))}
                                <div className="min-w-[1px] flex-shrink-0" />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* All Collections Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="space-y-3"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Grid3X3 className="w-5 h-5 text-primary" />
                            {searchQuery ? "Search Results" : "All Collections"}
                        </h2>
                        {!isLoading && (
                            <Badge variant="outline" className="text-xs">
                                {filteredCollections.length} collections
                            </Badge>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-2 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-[180px] rounded-xl" />
                            ))}
                        </div>
                    ) : filteredCollections.length === 0 ? (
                        <Card className="bg-card border-border p-8 text-center">
                            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">
                                {searchQuery
                                    ? "No collections found"
                                    : "No collections available"}
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {allCollections.map((collection, index) => (
                                <motion.div
                                    key={collection.address}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.02 }}
                                >
                                    <Link
                                        href={`/wallet/marketplace/collection/${encodeURIComponent(collection.address)}`}
                                        prefetch={true}
                                    >
                                        <Card className="bg-card border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg">
                                            <div className="relative aspect-square bg-muted overflow-hidden">
                                                {collection.image && !imageErrors.has(collection.address) ? (
                                                    <Image
                                                        src={collection.image}
                                                        alt={collection.name}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                        onError={() => handleImageError(collection.address)}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                                        <ImageIcon className="w-10 h-10 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                            <CardContent className="p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1">
                                                            <p className="font-semibold text-sm truncate">
                                                                {collection.name}
                                                            </p>
                                                            {collection.verified && (
                                                                <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatItemsCount(collection.itemsCount)} items
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                                </div>
                                                {collection.floorPrice && (
                                                    <div className="mt-2 pt-2 border-t border-border">
                                                        <p className="text-xs text-muted-foreground">Floor</p>
                                                        <p className="text-sm font-semibold text-primary">
                                                            {(collection.floorPrice / 1e9).toFixed(2)} TON
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Loading indicator for more */}
                {isLoading && (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>
        </div>
    );
}
