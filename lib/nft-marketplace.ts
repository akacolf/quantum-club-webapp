/**
 * NFT Marketplace Service
 * 
 * Provides API functions for the NFT marketplace:
 * - Fetching collections and NFTs
 * - Sale/listing information
 * - Marketplace statistics
 * 
 * Uses TONAPI for all TON NFT data
 */

import { tonApiGet } from "./tonapi-client";

// =====================================================
// Types
// =====================================================

export interface NftCollection {
    address: string;
    name: string;
    description?: string;
    image?: string;
    coverImage?: string;
    itemsCount: number;
    ownersCount?: number;
    floorPrice?: number; // in nanoTON
    totalVolume?: number;
    verified?: boolean;
}

export interface NftItem {
    address: string;
    name: string;
    description?: string;
    image?: string;
    collectionAddress?: string;
    collectionName?: string;
    ownerAddress?: string;
    sale?: NftSale | null;
    attributes?: Array<{ trait_type: string; value: string }>;
}

export interface NftSale {
    address: string; // Sale contract address
    market?: string; // Marketplace name (e.g., "Getgems")
    price: bigint; // Price in nanoTON
    priceFormatted: string; // Human-readable price
    owner?: string;
}

export interface MarketplaceStats {
    totalCollections: number;
    totalNfts: number;
    totalVolume24h?: number;
    topCollections: NftCollection[];
}

// =====================================================
// Configuration
// =====================================================

// Low platform fee: 0.5% (0.005)
export const MARKETPLACE_FEE_PERCENT = 0.5;
export const MARKETPLACE_FEE_RECIPIENT = "UQC..."; // TODO: Set actual fee recipient address

// Helper to format TON amounts
function formatTon(nanoTon: bigint | number): string {
    const value = typeof nanoTon === "bigint" ? Number(nanoTon) : nanoTon;
    return (value / 1e9).toFixed(2);
}

// =====================================================
// Collection API
// =====================================================

/**
 * Get popular/trending NFT collections
 */
export async function getPopularCollections(
    limit = 20,
    testnet = false
): Promise<NftCollection[]> {
    try {
        const data = await tonApiGet<{
            nft_collections: Array<{
                address: string;
                metadata?: { name?: string; description?: string; image?: string; cover_image?: string };
                next_item_index?: number;
                owner?: { address: string };
                previews?: Array<{ resolution: string; url: string }>;
            }>;
        }>(`/v2/nfts/collections?limit=${limit}`, { testnet });

        return (data.nft_collections || []).map((c) => ({
            address: c.address,
            name: c.metadata?.name || "Unknown Collection",
            description: c.metadata?.description,
            image: c.previews?.find(p => p.resolution === "100x100")?.url || c.metadata?.image,
            coverImage: c.metadata?.cover_image,
            itemsCount: c.next_item_index || 0,
            verified: false, // TONAPI doesn't provide this, would need Getgems API
        }));
    } catch (error) {
        console.error("[NFT Marketplace] Error fetching collections:", error);
        return [];
    }
}

/**
 * Get collection details by address
 */
export async function getCollectionDetails(
    collectionAddress: string,
    testnet = false
): Promise<NftCollection | null> {
    try {
        const data = await tonApiGet<{
            address: string;
            metadata?: { name?: string; description?: string; image?: string; cover_image?: string };
            next_item_index?: number;
            previews?: Array<{ resolution: string; url: string }>;
        }>(`/v2/nfts/collections/${encodeURIComponent(collectionAddress)}`, { testnet });

        return {
            address: data.address,
            name: data.metadata?.name || "Unknown Collection",
            description: data.metadata?.description,
            image: data.previews?.find(p => p.resolution === "500x500")?.url || data.metadata?.image,
            coverImage: data.metadata?.cover_image,
            itemsCount: data.next_item_index || 0,
        };
    } catch (error) {
        console.error("[NFT Marketplace] Error fetching collection:", error);
        return null;
    }
}

/**
 * Get NFTs in a collection
 */
export async function getCollectionItems(
    collectionAddress: string,
    limit = 50,
    offset = 0,
    testnet = false
): Promise<NftItem[]> {
    try {
        const data = await tonApiGet<{
            nft_items: Array<{
                address: string;
                metadata?: { name?: string; description?: string; image?: string; attributes?: Array<{ trait_type: string; value: string }> };
                collection?: { address?: string; name?: string };
                owner?: { address: string };
                sale?: { address: string; market?: { name?: string }; price: { value: string } };
                previews?: Array<{ resolution: string; url: string }>;
            }>;
        }>(`/v2/nfts/collections/${encodeURIComponent(collectionAddress)}/items?limit=${limit}&offset=${offset}`, { testnet });

        return (data.nft_items || []).map((item) => ({
            address: item.address,
            name: item.metadata?.name || "Unnamed NFT",
            description: item.metadata?.description,
            image: item.previews?.find(p => p.resolution === "500x500")?.url || item.metadata?.image,
            collectionAddress: item.collection?.address,
            collectionName: item.collection?.name,
            ownerAddress: item.owner?.address,
            attributes: item.metadata?.attributes,
            sale: item.sale ? {
                address: item.sale.address,
                market: item.sale.market?.name,
                price: BigInt(item.sale.price.value),
                priceFormatted: formatTon(BigInt(item.sale.price.value)),
            } : null,
        }));
    } catch (error) {
        console.error("[NFT Marketplace] Error fetching collection items:", error);
        return [];
    }
}

// =====================================================
// Single NFT API
// =====================================================

/**
 * Get NFT details with sale info
 */
export async function getNftDetails(
    nftAddress: string,
    testnet = false
): Promise<NftItem | null> {
    try {
        const data = await tonApiGet<{
            address: string;
            metadata?: { name?: string; description?: string; image?: string; attributes?: Array<{ trait_type: string; value: string }> };
            collection?: { address?: string; name?: string };
            owner?: { address: string };
            sale?: { address: string; market?: { name?: string }; price: { value: string } };
            previews?: Array<{ resolution: string; url: string }>;
        }>(`/v2/nfts/${encodeURIComponent(nftAddress)}`, { testnet });

        return {
            address: data.address,
            name: data.metadata?.name || "Unnamed NFT",
            description: data.metadata?.description,
            image: data.previews?.find(p => p.resolution === "500x500")?.url || data.metadata?.image,
            collectionAddress: data.collection?.address,
            collectionName: data.collection?.name,
            ownerAddress: data.owner?.address,
            attributes: data.metadata?.attributes,
            sale: data.sale ? {
                address: data.sale.address,
                market: data.sale.market?.name,
                price: BigInt(data.sale.price.value),
                priceFormatted: formatTon(BigInt(data.sale.price.value)),
            } : null,
        };
    } catch (error) {
        console.error("[NFT Marketplace] Error fetching NFT:", error);
        return null;
    }
}

// Search functionality - placeholder for future Getgems API integration
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function searchNfts(
    query: string,
    limit = 20,
    testnet = false
): Promise<{ collections: NftCollection[]; items: NftItem[] }> {
    // TONAPI doesn't have a direct search endpoint
    // For now, return empty - could integrate Getgems API for search
    console.log(`[NFT Marketplace] Search not yet implemented: ${query}, limit: ${limit}, testnet: ${testnet}`);
    return { collections: [], items: [] };
}

// =====================================================
// Transaction Helpers
// =====================================================

/**
 * Calculate total price with platform fee
 */
export function calculateTotalPrice(priceNanoTon: bigint): {
    basePrice: bigint;
    platformFee: bigint;
    totalPrice: bigint;
    basePriceFormatted: string;
    platformFeeFormatted: string;
    totalPriceFormatted: string;
} {
    const basePrice = priceNanoTon;
    const platformFee = (basePrice * BigInt(Math.floor(MARKETPLACE_FEE_PERCENT * 100))) / BigInt(10000);
    const totalPrice = basePrice + platformFee;

    return {
        basePrice,
        platformFee,
        totalPrice,
        basePriceFormatted: formatTon(basePrice),
        platformFeeFormatted: formatTon(platformFee),
        totalPriceFormatted: formatTon(totalPrice),
    };
}

/**
 * Get account's NFTs
 */
export async function getAccountNfts(
    accountAddress: string,
    limit = 100,
    testnet = false
): Promise<NftItem[]> {
    try {
        const data = await tonApiGet<{
            nft_items: Array<{
                address: string;
                metadata?: { name?: string; description?: string; image?: string };
                collection?: { address?: string; name?: string };
                owner?: { address: string };
                sale?: { address: string; market?: { name?: string }; price: { value: string } };
                previews?: Array<{ resolution: string; url: string }>;
            }>;
        }>(`/v2/accounts/${encodeURIComponent(accountAddress)}/nfts?limit=${limit}`, { testnet });

        return (data.nft_items || []).map((item) => ({
            address: item.address,
            name: item.metadata?.name || "Unnamed NFT",
            description: item.metadata?.description,
            image: item.previews?.find(p => p.resolution === "500x500")?.url || item.metadata?.image,
            collectionAddress: item.collection?.address,
            collectionName: item.collection?.name,
            ownerAddress: item.owner?.address,
            sale: item.sale ? {
                address: item.sale.address,
                market: item.sale.market?.name,
                price: BigInt(item.sale.price.value),
                priceFormatted: formatTon(BigInt(item.sale.price.value)),
            } : null,
        }));
    } catch (error) {
        console.error("[NFT Marketplace] Error fetching account NFTs:", error);
        return [];
    }
}
