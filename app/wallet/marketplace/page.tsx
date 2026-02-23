"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../WalletContext";
import { filterCollectionsByName } from "@/lib/nft-marketplace";
import { usePopularCollectionsQuery, useQCListingsQuery } from "@/app/(hooks)/queries/use-nft-marketplace";
import { useQuery } from "@tanstack/react-query";
import type { MysteryBox } from "@/types/mystery-box";

function useMysteryBoxesQuery() {
    return useQuery<MysteryBox[]>({
        queryKey: ["mystery-boxes"],
        queryFn: async () => {
            const res = await fetch("/api/mystery-box", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "get-boxes" }),
            });
            if (!res.ok) return [];
            const data = await res.json();
            return data.boxes ?? [];
        },
        staleTime: 60_000,
    });
}

export default function MarketplacePage() {
    useTelegramBackButton("/wallet");
    const { isTestnet } = useWallet();

    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("trending");

    const collectionsQuery = usePopularCollectionsQuery(isTestnet);
    const listingsQuery = useQCListingsQuery();
    const mysteryBoxesQuery = useMysteryBoxesQuery();
    const mysteryBoxes = mysteryBoxesQuery.data ?? [];

    const filteredCollections = useMemo(
        () => filterCollectionsByName(collectionsQuery.data ?? [], searchQuery),
        [collectionsQuery.data, searchQuery]
    );

    const filteredListings = useMemo(() => {
        const listings = listingsQuery.data ?? [];
        if (!searchQuery.trim()) return listings;
        const lower = searchQuery.toLowerCase();
        return listings.filter(
            (l) =>
                l.nftName?.toLowerCase().includes(lower) ||
                l.collectionName?.toLowerCase().includes(lower)
        );
    }, [listingsQuery.data, searchQuery]);

    return (
        <div className="min-h-screen bg-background text-foreground pb-28">
            <div className="px-4 pt-4 space-y-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                >
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold">NFT Marketplace</h1>
                        <Link
                            href="/wallet/marketplace/launch"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Icon icon="solar:rocket-bold" className="w-3.5 h-3.5" />
                            Mint
                        </Link>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Discover and collect unique NFTs on TON
                    </p>
                </motion.div>

                {/* Search Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="relative"
                >
                    <Icon
                        icon="solar:magnifer-linear"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                    />
                    <Input
                        placeholder="Search collections & NFTs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-card border-border"
                    />
                </motion.div>

                {/* Mystery Boxes */}
                {mysteryBoxes.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 }}
                        className="space-y-2"
                    >
                        <h2 className="text-base font-bold">Mystery Boxes</h2>
                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                            {mysteryBoxes.map((box) => (
                                <Link
                                    key={box.id}
                                    href={`/wallet/marketplace/mystery-box/${box.id}`}
                                    className="shrink-0"
                                >
                                    <Card className="w-[160px] bg-gradient-to-br from-primary/10 to-purple-600/10 border-primary/20 rounded-2xl overflow-hidden hover:border-primary/40 transition-colors">
                                        <div className="w-full aspect-square relative bg-muted overflow-hidden">
                                            {box.image ? (
                                                <Image
                                                    src={box.image}
                                                    alt={box.name}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-600/20">
                                                    <Icon icon="solar:box-bold" className="w-10 h-10 text-primary" />
                                                </div>
                                            )}
                                            <Badge className="absolute top-2 right-2 bg-primary text-[10px]">
                                                {box.remaining} left
                                            </Badge>
                                        </div>
                                        <CardContent className="p-3">
                                            <h4 className="font-bold text-sm truncate">{box.name}</h4>
                                            <p className="text-xs text-primary font-medium">{box.price.ton} TON</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="w-full">
                            <TabsTrigger value="trending" className="flex-1">Trending</TabsTrigger>
                            <TabsTrigger value="qc-listed" className="flex-1">QC Listed</TabsTrigger>
                        </TabsList>

                        {/* Trending Collections Tab */}
                        <TabsContent value="trending" className="mt-4">
                            {collectionsQuery.isLoading && (
                                <div className="grid grid-cols-2 gap-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <Card key={i} className="bg-card border-border rounded-2xl overflow-hidden">
                                            <Skeleton className="w-full aspect-square" />
                                            <CardContent className="p-3 space-y-1.5">
                                                <Skeleton className="h-4 w-20" />
                                                <Skeleton className="h-3 w-16" />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {!collectionsQuery.isLoading && filteredCollections.length === 0 && (
                                <div className="py-8 text-center bg-card rounded-2xl border border-border border-dashed">
                                    <Icon icon="solar:gallery-minimalistic-linear" className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        {searchQuery ? "No collections match your search" : "No collections found"}
                                    </p>
                                </div>
                            )}

                            {filteredCollections.length > 0 && (
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredCollections.map((col, index) => (
                                        <motion.div
                                            key={col.address}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.04 }}
                                        >
                                            <Link href={`/wallet/marketplace/collection/${encodeURIComponent(col.address)}`}>
                                                <Card className="bg-card border-border rounded-2xl overflow-hidden hover:bg-accent/50 transition-colors cursor-pointer">
                                                    <div className="w-full aspect-square bg-muted relative overflow-hidden">
                                                        {col.image ? (
                                                            <Image
                                                                src={col.image}
                                                                alt={col.name}
                                                                fill
                                                                className="object-cover"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Icon icon="solar:gallery-minimalistic-linear" className="w-8 h-8 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <CardContent className="p-3">
                                                        <div className="flex items-center gap-1">
                                                            <h4 className="font-bold text-sm truncate">{col.name}</h4>
                                                            {col.verified && (
                                                                <Icon icon="solar:verified-check-bold" className="w-3.5 h-3.5 text-primary shrink-0" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {col.itemsCount > 0 && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    {col.itemsCount.toLocaleString()} items
                                                                </span>
                                                            )}
                                                            {col.floorPrice && (
                                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                                    Floor: {(col.floorPrice / 1e9).toFixed(2)} TON
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* QC Listed Tab */}
                        <TabsContent value="qc-listed" className="mt-4">
                            {listingsQuery.isLoading && (
                                <div className="grid grid-cols-2 gap-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <Card key={i} className="bg-card border-border rounded-2xl overflow-hidden">
                                            <Skeleton className="w-full aspect-square" />
                                            <CardContent className="p-3 space-y-1.5">
                                                <Skeleton className="h-4 w-20" />
                                                <Skeleton className="h-3 w-16" />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {!listingsQuery.isLoading && filteredListings.length === 0 && (
                                <div className="py-8 text-center bg-card rounded-2xl border border-border border-dashed">
                                    <Icon icon="solar:tag-price-linear" className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        {searchQuery ? "No listings match your search" : "No active listings yet"}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        List your NFTs from the NFT detail page
                                    </p>
                                </div>
                            )}

                            {filteredListings.length > 0 && (
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredListings.map((listing, index) => (
                                        <motion.div
                                            key={listing.id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.04 }}
                                        >
                                            <Link href={`/wallet/marketplace/buy/${encodeURIComponent(listing.nftAddress)}`}>
                                                <Card className="bg-card border-border rounded-2xl overflow-hidden hover:bg-accent/50 transition-colors cursor-pointer">
                                                    <div className="w-full aspect-square bg-muted relative overflow-hidden">
                                                        {listing.nftImage ? (
                                                            <Image
                                                                src={listing.nftImage}
                                                                alt={listing.nftName}
                                                                fill
                                                                className="object-cover"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Icon icon="solar:gallery-minimalistic-linear" className="w-8 h-8 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        <Badge className="absolute top-2 right-2 bg-green-600 text-[10px]">
                                                            {listing.price} TON
                                                        </Badge>
                                                    </div>
                                                    <CardContent className="p-3">
                                                        <h4 className="font-bold text-sm truncate">{listing.nftName}</h4>
                                                        {listing.collectionName && (
                                                            <p className="text-xs text-muted-foreground truncate">{listing.collectionName}</p>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </div>
        </div>
    );
}
