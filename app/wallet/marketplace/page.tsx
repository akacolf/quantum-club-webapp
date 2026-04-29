"use client";

import { useRef } from "react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
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

export default function MarketplacePage() {
    useTelegramBackButton("/wallet");
    const { isTestnet } = useWallet();

    const [{ tab: activeTab, q: searchQuery }, setParams] = useQueryStates({
        tab: parseAsStringLiteral(["trending", "qc-listed"] as const).withDefault("trending"),
        q: parseAsString.withDefault(""),
    }, { history: "replace" });
    const setActiveTab = (value: string) => setParams({ tab: value as typeof activeTab });
    const setSearchQuery = (value: string) => setParams({ q: value });

    const collectionsQuery = usePopularCollectionsQuery(isTestnet);
    const listingsQuery = useQCListingsQuery();

    // Sort collections: cover-image ones first (side by side), then no-cover ones
    const filteredCollections = (() => {
        const filtered = filterCollectionsByName(collectionsQuery.data ?? [], searchQuery);
        const withCover = filtered.filter((c) => c.coverImage);
        const withoutCover = filtered.filter((c) => !c.coverImage);
        return [...withCover, ...withoutCover];
    })();

    const filteredListings = (() => {
        const listings = listingsQuery.data?.pages.flatMap(p => p.listings) ?? [];
        if (!searchQuery.trim()) return listings;
        const lower = searchQuery.toLowerCase();
        return listings.filter(
            (l) =>
                l.nftName?.toLowerCase().includes(lower) ||
                l.collectionName?.toLowerCase().includes(lower)
        );
    })();

    const collectionsListRef = useRef<HTMLDivElement>(null);
    const listingsListRef = useRef<HTMLDivElement>(null);

    const collectionsVirtualizer = useWindowVirtualizer({
        count: Math.ceil(filteredCollections.length / 2),
        estimateSize: () => 280,
        overscan: 3,
        scrollMargin: collectionsListRef.current?.offsetTop ?? 0,
    });

    const listingsVirtualizer = useWindowVirtualizer({
        count: Math.ceil(filteredListings.length / 2),
        estimateSize: () => 280,
        overscan: 3,
        scrollMargin: listingsListRef.current?.offsetTop ?? 0,
    });

    return (
        <div className="min-h-screen bg-background text-foreground pb-28">
            <div className="px-4 pt-4 space-y-4">
                {/* Header */}
                <div
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
                </div>

                {/* Search Bar */}
                <div
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
                </div>

                {/* Tabs */}
                <div
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
                                <div ref={collectionsListRef}>
                                    <div className="relative" style={{ height: `${collectionsVirtualizer.getTotalSize()}px` }}>
                                        {collectionsVirtualizer.getVirtualItems().map((virtualRow) => {
                                            const leftIndex = virtualRow.index * 2;
                                            const rightIndex = leftIndex + 1;
                                            const leftCol = filteredCollections[leftIndex];
                                            const rightCol = rightIndex < filteredCollections.length ? filteredCollections[rightIndex] : null;
                                            return (
                                                <div
                                                    key={virtualRow.index}
                                                    className="absolute top-0 left-0 w-full"
                                                    style={{ transform: `translateY(${virtualRow.start - collectionsVirtualizer.options.scrollMargin}px)` }}
                                                    ref={collectionsVirtualizer.measureElement}
                                                    data-index={virtualRow.index}
                                                >
                                                    <div className="grid grid-cols-2 gap-3 pb-3">
                                                        {[leftCol, rightCol].map((col) => col && (
                                                            <Link key={col.address} href={`/wallet/marketplace/collection/${encodeURIComponent(col.address)}`}>
                                                                <Card className="bg-card border-border rounded-2xl overflow-hidden hover:bg-accent/50 transition-colors cursor-pointer">
                                                                    {col.coverImage ? (
                                                                        <>
                                                                            {/* Cover banner + profile avatar overlay */}
                                                                            <div className="relative">
                                                                                <div className="w-full aspect-[16/10] bg-muted relative overflow-hidden">
                                                                                    <Image
                                                                                        src={col.coverImage}
                                                                                        alt=""
                                                                                        fill
                                                                                        className="object-cover"
                                                                                        unoptimized
                                                                                    />
                                                                                </div>
                                                                                {col.image && (
                                                                                    <div className="absolute -bottom-5 left-3 w-10 h-10 rounded-lg border-2 border-card overflow-hidden bg-card shadow-sm">
                                                                                        <Image
                                                                                            src={col.image}
                                                                                            alt={col.name}
                                                                                            width={40}
                                                                                            height={40}
                                                                                            className="object-cover w-full h-full"
                                                                                            unoptimized
                                                                                        />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <CardContent className="p-3 pt-7">
                                                                                <div className="flex items-center gap-1">
                                                                                    <h4 className="font-bold text-sm truncate">{col.name}</h4>
                                                                                    {col.verified && (
                                                                                        <Icon icon="solar:verified-check-bold" className="w-3.5 h-3.5 text-primary shrink-0" />
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                                    <span className="text-xs text-muted-foreground">
                                                                                        {col.itemsCount > 0 ? `${col.itemsCount.toLocaleString()} items` : "Unlimited items"}
                                                                                    </span>
                                                                                    {col.floorPrice && (
                                                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                                                            Floor: {(col.floorPrice / 1e9).toFixed(2)} TON
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                            </CardContent>
                                                                        </>
                                                                    ) : (
                                                                        /* No cover — compact row with profile image */
                                                                        <CardContent className="p-3 flex items-center gap-3">
                                                                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0">
                                                                                {col.image ? (
                                                                                    <Image
                                                                                        src={col.image}
                                                                                        alt={col.name}
                                                                                        width={48}
                                                                                        height={48}
                                                                                        className="object-cover w-full h-full"
                                                                                        unoptimized
                                                                                    />
                                                                                ) : (
                                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                                        <Icon icon="solar:gallery-minimalistic-linear" className="w-5 h-5 text-muted-foreground" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="flex items-center gap-1">
                                                                                    <h4 className="font-bold text-sm truncate">{col.name}</h4>
                                                                                    {col.verified && (
                                                                                        <Icon icon="solar:verified-check-bold" className="w-3.5 h-3.5 text-primary shrink-0" />
                                                                                    )}
                                                                                </div>
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    {col.itemsCount > 0 ? `${col.itemsCount.toLocaleString()} items` : "Unlimited items"}
                                                                                </span>
                                                                            </div>
                                                                        </CardContent>
                                                                    )}
                                                                </Card>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
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
                                <div ref={listingsListRef}>
                                    <div className="relative" style={{ height: `${listingsVirtualizer.getTotalSize()}px` }}>
                                        {listingsVirtualizer.getVirtualItems().map((virtualRow) => {
                                            const leftIndex = virtualRow.index * 2;
                                            const rightIndex = leftIndex + 1;
                                            const leftListing = filteredListings[leftIndex];
                                            const rightListing = rightIndex < filteredListings.length ? filteredListings[rightIndex] : null;
                                            return (
                                                <div
                                                    key={virtualRow.index}
                                                    className="absolute top-0 left-0 w-full"
                                                    style={{ transform: `translateY(${virtualRow.start - listingsVirtualizer.options.scrollMargin}px)` }}
                                                    ref={listingsVirtualizer.measureElement}
                                                    data-index={virtualRow.index}
                                                >
                                                    <div className="grid grid-cols-2 gap-3 pb-3">
                                                        {[leftListing, rightListing].map((listing) => listing && (
                                                            <Link key={listing.id} href={`/wallet/marketplace/buy/${encodeURIComponent(listing.nftAddress)}`}>
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
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
