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
    BarChart3,
    Users,
    Wallet,
    DollarSign,
    ArrowUp,
    ArrowDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { getPopularCollections, type NftCollection } from "@/lib/nft-marketplace";
import { getMarketplaceStats } from "@/lib/nft-sale-contracts";
import { useWallet } from "../WalletContext";

// Time period options for filtering stats
type TimePeriod = "1d" | "7d" | "30d" | "all";

export default function MarketplacePage() {
    useTelegramBackButton("/wallet");
    const { isTestnet } = useWallet();

    const [collections, setCollections] = useState<NftCollection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
    const [timePeriod, setTimePeriod] = useState<TimePeriod>("1d");
    const [stats, setStats] = useState<{
        totalVolume24h: bigint;
        totalListings: number;
        avgFloorPrice: number;
        activeCollections: number;
    } | null>(null);

    // Fetch collections and stats
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [collectionsData, statsData] = await Promise.all([
                getPopularCollections(30, isTestnet),
                getMarketplaceStats(isTestnet),
            ]);
            setCollections(collectionsData);
            
            // Calculate stats from collections
            const avgFloor = collectionsData
                .filter(c => c.floorPrice && c.floorPrice > 0)
                .reduce((sum, c) => sum + (c.floorPrice || 0), 0) / 
                collectionsData.filter(c => c.floorPrice && c.floorPrice > 0).length;
            
            setStats({
                totalVolume24h: statsData.totalVolume24h,
                totalListings: statsData.totalListings,
                avgFloorPrice: avgFloor || 0,
                activeCollections: collectionsData.length,
            });
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [isTestnet]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    // Format volume change with color
    const formatVolumeChange = (change?: number) => {
        if (change === undefined || change === null) return null;
        const isPositive = change >= 0;
        const formattedChange = `${isPositive ? "+" : ""}${change.toFixed(0)}%`;
        return {
            text: formattedChange,
            isPositive,
            color: isPositive ? "text-green-500" : "text-red-500",
        };
    };

    // Format volume
    const formatVolume = (volumeNano?: number) => {
        if (!volumeNano || volumeNano <= 0) return null;
        const volumeTon = volumeNano / 1e9;
        if (volumeTon >= 1000) {
            return `${(volumeTon / 1000).toFixed(1)}K`;
        }
        return volumeTon.toFixed(1);
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

                {/* Stats Cards */}
                {!searchQuery && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.02 }}
                    >
                        <div className="-mx-4">
                            <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide pb-1">
                                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 flex-shrink-0 min-w-[120px]">
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-2 text-primary mb-1">
                                            <BarChart3 className="w-4 h-4" />
                                            <span className="text-xs">24h Volume</span>
                                        </div>
                                        {isLoading ? (
                                            <Skeleton className="h-5 w-16" />
                                        ) : (
                                            <p className="font-bold text-foreground">
                                                {stats?.totalVolume24h ? `${(Number(stats.totalVolume24h) / 1e9).toFixed(0)} TON` : "—"}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                                
                                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 flex-shrink-0 min-w-[120px]">
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-2 text-green-500 mb-1">
                                            <DollarSign className="w-4 h-4" />
                                            <span className="text-xs">Avg Floor</span>
                                        </div>
                                        {isLoading ? (
                                            <Skeleton className="h-5 w-16" />
                                        ) : (
                                            <p className="font-bold text-foreground">
                                                {stats?.avgFloorPrice ? `${(stats.avgFloorPrice / 1e9).toFixed(1)} TON` : "—"}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 flex-shrink-0 min-w-[120px]">
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-2 text-amber-500 mb-1">
                                            <Wallet className="w-4 h-4" />
                                            <span className="text-xs">Listings</span>
                                        </div>
                                        {isLoading ? (
                                            <Skeleton className="h-5 w-12" />
                                        ) : (
                                            <p className="font-bold text-foreground">
                                                {stats?.totalListings?.toLocaleString() || "—"}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 flex-shrink-0 min-w-[120px]">
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-2 text-blue-500 mb-1">
                                            <Users className="w-4 h-4" />
                                            <span className="text-xs">Collections</span>
                                        </div>
                                        {isLoading ? (
                                            <Skeleton className="h-5 w-12" />
                                        ) : (
                                            <p className="font-bold text-foreground">
                                                {stats?.activeCollections || "—"}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                                <div className="min-w-[1px] flex-shrink-0" />
                            </div>
                        </div>
                    </motion.div>
                )}

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

                {/* Time Period Filter */}
                {!searchQuery && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.07 }}
                    >
                        <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                            <TabsList className="bg-card border border-border w-full grid grid-cols-4">
                                <TabsTrigger value="1d" className="text-xs">1 Day</TabsTrigger>
                                <TabsTrigger value="7d" className="text-xs">7 Days</TabsTrigger>
                                <TabsTrigger value="30d" className="text-xs">30 Days</TabsTrigger>
                                <TabsTrigger value="all" className="text-xs">All Time</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </motion.div>
                )}

                {/* Featured Collections Carousel - GetGems Inspired */}
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
                                            className="w-[220px] h-[160px] rounded-2xl flex-shrink-0"
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
                                                <Card className="w-[220px] bg-card border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover:shadow-xl rounded-2xl group">
                                                    {/* Banner with rounded corners */}
                                                    <div className="relative h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent overflow-hidden">
                                                        {collection.coverImage && !imageErrors.has(collection.address + '-cover') ? (
                                                            <Image
                                                                src={collection.coverImage}
                                                                alt={collection.name}
                                                                fill
                                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                                unoptimized
                                                                onError={() => handleImageError(collection.address + '-cover')}
                                                            />
                                                        ) : collection.image && !imageErrors.has(collection.address) ? (
                                                            <>
                                                                {/* Blurred background from collection image */}
                                                                <Image
                                                                    src={collection.image}
                                                                    alt=""
                                                                    fill
                                                                    className="object-cover blur-xl scale-110 opacity-60"
                                                                    unoptimized
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/15 to-transparent" />
                                                        )}
                                                        
                                                        {/* Verified badge on banner */}
                                                        {collection.verified && (
                                                            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1">
                                                                <BadgeCheck className="w-4 h-4 text-blue-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Collection info with avatar overlay */}
                                                    <CardContent className="p-3 relative">
                                                        {/* Avatar overlapping banner */}
                                                        <div className="absolute -top-6 left-3">
                                                            <div className="w-12 h-12 rounded-xl border-2 border-card bg-card overflow-hidden shadow-lg">
                                                                {collection.image && !imageErrors.has(collection.address) ? (
                                                                    <Image
                                                                        src={collection.image}
                                                                        alt={collection.name}
                                                                        width={48}
                                                                        height={48}
                                                                        className="w-full h-full object-cover"
                                                                        unoptimized
                                                                        onError={() => handleImageError(collection.address)}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gradient-to-br from-primary/50 to-primary/20 flex items-center justify-center">
                                                                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="pt-5">
                                                            <p className="font-semibold text-sm truncate">
                                                                {collection.name}
                                                            </p>
                                                            <div className="flex items-center justify-between mt-1">
                                                                <p className="text-xs text-muted-foreground">
                                                                    {formatItemsCount(collection.itemsCount)} items
                                                                </p>
                                                                {formatVolumeChange(collection.volumeChange24h) && (
                                                                    <span className={`text-xs flex items-center gap-0.5 ${formatVolumeChange(collection.volumeChange24h)?.color}`}>
                                                                        {formatVolumeChange(collection.volumeChange24h)?.isPositive 
                                                                            ? <ArrowUp className="w-3 h-3" /> 
                                                                            : <ArrowDown className="w-3 h-3" />}
                                                                        {formatVolumeChange(collection.volumeChange24h)?.text}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Floor price */}
                                                            <div className="mt-2 pt-2 border-t border-border">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs text-muted-foreground">Floor</span>
                                                                    <span className="text-sm font-semibold text-primary">
                                                                        {collection.floorPrice 
                                                                            ? `${(collection.floorPrice / 1e9).toFixed(2)} TON`
                                                                            : "—"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
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

                {/* All Collections Grid - GetGems Style */}
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
                                <Skeleton key={i} className="h-[200px] rounded-2xl" />
                            ))}
                        </div>
                    ) : filteredCollections.length === 0 ? (
                        <Card className="bg-card border-border p-8 text-center rounded-2xl">
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
                                        <Card className="bg-card border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover:shadow-xl rounded-2xl group">
                                            {/* Rounded thumbnail container */}
                                            <div className="relative aspect-square bg-muted overflow-hidden rounded-t-2xl">
                                                {collection.image && !imageErrors.has(collection.address) ? (
                                                    <Image
                                                        src={collection.image}
                                                        alt={collection.name}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                        unoptimized
                                                        onError={() => handleImageError(collection.address)}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-muted">
                                                        <ImageIcon className="w-10 h-10 text-muted-foreground" />
                                                    </div>
                                                )}
                                                
                                                {/* Verified badge overlay */}
                                                {collection.verified && (
                                                    <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-lg">
                                                        <BadgeCheck className="w-4 h-4 text-blue-500" />
                                                    </div>
                                                )}
                                                
                                                {/* Gradient overlay at bottom */}
                                                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
                                            </div>
                                            
                                            <CardContent className="p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-sm truncate">
                                                            {collection.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatItemsCount(collection.itemsCount)} items
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                                                </div>
                                                <div className="mt-2 pt-2 border-t border-border grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Floor</p>
                                                        <p className="text-sm font-semibold text-primary">
                                                            {collection.floorPrice 
                                                                ? `${(collection.floorPrice / 1e9).toFixed(2)} TON`
                                                                : "—"}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Vol 24h</p>
                                                        <div className="flex items-center gap-1">
                                                            <p className="text-sm font-semibold">
                                                                {formatVolume(collection.volume24h) 
                                                                    ? `${formatVolume(collection.volume24h)} TON`
                                                                    : "—"}
                                                            </p>
                                                            {formatVolumeChange(collection.volumeChange24h) && (
                                                                <span className={`text-xs flex items-center ${formatVolumeChange(collection.volumeChange24h)?.color}`}>
                                                                    {formatVolumeChange(collection.volumeChange24h)?.isPositive 
                                                                        ? <ArrowUp className="w-3 h-3" /> 
                                                                        : <ArrowDown className="w-3 h-3" />}
                                                                    {formatVolumeChange(collection.volumeChange24h)?.text}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
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
