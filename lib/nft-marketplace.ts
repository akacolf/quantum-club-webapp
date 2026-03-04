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

import { Address } from "@ton/core";
import { tonApiGet } from "./tonapi-client";

// Helper to normalize addresses to raw format for comparison
function normalizeToRaw(address: string): string | null {
    try {
        return Address.parse(address).toRawString();
    } catch {
        return null;
    }
}

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
    volume24h?: number; // 24h volume in nanoTON
    volumeChange24h?: number; // % change (-100 to +infinity)
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

// =====================================================
// Configuration
// =====================================================

// Low platform fee: 0.5% (0.005)
export const MARKETPLACE_FEE_PERCENT = 0.5;

// Curated list of verified TON collections (from Getgems verified collections)
// These are popular, authentic collections with blue verification badges
// Stored in bounceable base64 format for reference, converted to raw for comparison
const VERIFIED_COLLECTION_ADDRESSES_BASE64 = [
    // TON Diamonds
    "EQAo92DYMokxghKcq-CkCGSk_MgXY5Fo1SPW20gkvZl75iCN",
    // TON DNS Domains
    "EQC3dNlesgVD8YbAazcauIrXBPfiVhMMr5YYk2in0Mtsz0Bz",
    // Telegram Anonymous Numbers
    "EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi",
    // Punks on TON
    "EQDvRFMYLdxmvY3Tk-cfWMLqDnXF_EclO2Fp4wwj33WhlNFT",
    // TON Whales Club
    "EQDDe_Sw5idWVbkxkCsM63W-Bw-95cfrkbQQdxp16XnL5YK_",
    // Smeshariki
    "EQDM0TNZRhYj58EJBjQqqnKPgOLMXv0DF-Y0h26kzRwL2RGT",
    // Lifeblood
    "EQB_nDZqUb7v0eTm23pP0nQN3G5yHaELZKzDDPM8TQCmPKhG",
    // Animals Red List
    "EQBe54_UD8P3Og6LMjPB5z_mJTbxbJKdDH5T-_n_T_3e5wnT",
    // Rich Cats
    "EQBzyL6Yz6_e_tzsBqPMOypEW3fCM7jN3cS3G9IPGV5qHkkZ",
    // Market Makers
    "EQAS8Xf3FT0M-CPFMQ8y8DgRr9D8kYK8TP2dCY97hnxg1RRv",
    // The Guys
    "EQCJ8g2UQFHVLH-OUPgRWJLmBlGJ9g2k8PHhMT2KW0xVPR1i",
    // Eggs by Notcoin
    "EQDmkj65vis-HxV11lSaZVlEwBLpGMnmIwB-FkGBSL66hxEw",
    // SBT Telegram Usernames
    "EQAvwEBh52NmFjnOzQWJlg4mlh1yqvGiT5LdQojQIc6mTqjp",
    // NOT Vouchers
    "EQCyL1SkQXPawiZsLdCSVy_0NJvWzPiWpTdFf4jbFc7ePQxU",
    // Fanton Fantasy Football
    "EQCmSKWgd5pL69gNo63_FnKZXOXTpWJFnCbRJRppAGq6Wr2o",
];

// Build a Set of normalized raw addresses for efficient lookup
const VERIFIED_COLLECTION_ADDRESSES_RAW = new Set(
    VERIFIED_COLLECTION_ADDRESSES_BASE64
        .map(addr => normalizeToRaw(addr))
        .filter((addr): addr is string => addr !== null)
);

// Helper function to check if an address is in the verified set
function isVerifiedCollection(address: string): boolean {
    const normalized = normalizeToRaw(address);
    return normalized !== null && VERIFIED_COLLECTION_ADDRESSES_RAW.has(normalized);
}

// Helper to format TON amounts
function formatTon(nanoTon: bigint | number): string {
    const value = typeof nanoTon === "bigint" ? Number(nanoTon) : nanoTon;
    return (value / 1e9).toFixed(2);
}

// Helper to sanitize items count (-1 or undefined means unlimited/unknown)
function sanitizeItemsCount(count?: number): number {
    if (count === undefined || count === null || count < 0) return 0;
    return count;
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
        // Fetch more collections to ensure we find verified ones after filtering
        const data = await tonApiGet<{
            nft_collections: Array<{
                address: string;
                metadata?: { name?: string; description?: string; image?: string; cover_image?: string };
                next_item_index?: number;
                owner?: { address: string };
                previews?: Array<{ resolution: string; url: string }>;
            }>;
        }>(`/v2/nfts/collections?limit=${Math.max(limit * 5, 100)}`, { testnet });

        // Filter to only verified collections using normalized address comparison
        const verifiedCollections = (data.nft_collections || [])
            .filter((c) => isVerifiedCollection(c.address))
            .slice(0, limit)
            .map((c) => ({
                address: c.address,
                name: c.metadata?.name || "Unknown Collection",
                description: c.metadata?.description,
                // Use 500x500 for high-quality images, fallback to 1500x1500 or original
                image: c.previews?.find(p => p.resolution === "500x500")?.url 
                    || c.previews?.find(p => p.resolution === "1500x1500")?.url 
                    || c.metadata?.image,
                coverImage: c.metadata?.cover_image,
                itemsCount: sanitizeItemsCount(c.next_item_index),
                verified: true, // Only showing verified collections
            }));

        // If filtering returned few results, fetch verified collections directly
        if (verifiedCollections.length < 3 && !testnet) {
            console.log("[NFT Marketplace] Falling back to direct collection fetch");
            const directCollections = await fetchVerifiedCollectionsDirectly(limit, testnet);
            if (directCollections.length > verifiedCollections.length) {
                return directCollections;
            }
        }

        return verifiedCollections;
    } catch (error) {
        console.error("[NFT Marketplace] Error fetching collections:", error);
        // Try fallback to direct fetch
        try {
            return await fetchVerifiedCollectionsDirectly(limit, testnet);
        } catch (fallbackError) {
            console.error("[NFT Marketplace] Fallback also failed:", fallbackError);
            return [];
        }
    }
}

/**
 * Fetch verified collections directly by their addresses
 * This is a fallback when filtering doesn't work
 */
async function fetchVerifiedCollectionsDirectly(
    limit = 20,
    testnet = false
): Promise<NftCollection[]> {
    const addressesToFetch = VERIFIED_COLLECTION_ADDRESSES_BASE64.slice(0, limit);
    
    const results = await Promise.all(
        addressesToFetch.map(async (address): Promise<NftCollection | null> => {
            try {
                const data = await tonApiGet<{
                    address: string;
                    metadata?: { name?: string; description?: string; image?: string; cover_image?: string };
                    next_item_index?: number;
                    previews?: Array<{ resolution: string; url: string }>;
                }>(`/v2/nfts/collections/${encodeURIComponent(address)}`, { testnet });

                return {
                    address: data.address,
                    name: data.metadata?.name || "Unknown Collection",
                    description: data.metadata?.description,
                    image: data.previews?.find(p => p.resolution === "500x500")?.url 
                        || data.previews?.find(p => p.resolution === "1500x1500")?.url 
                        || data.metadata?.image,
                    coverImage: data.metadata?.cover_image,
                    itemsCount: sanitizeItemsCount(data.next_item_index),
                    verified: true,
                };
            } catch (error) {
                console.error(`[NFT Marketplace] Failed to fetch collection ${address}:`, error);
                return null;
            }
        })
    );

    return results.filter((c): c is NftCollection => c !== null);
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
            itemsCount: sanitizeItemsCount(data.next_item_index),
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

/**
 * Client-side filter collections by name
 */
export function filterCollectionsByName(
    collections: NftCollection[],
    query: string
): NftCollection[] {
    if (!query.trim()) return collections;
    const lower = query.toLowerCase();
    return collections.filter(
        (c) =>
            c.name.toLowerCase().includes(lower) ||
            c.description?.toLowerCase().includes(lower)
    );
}

// =====================================================
// Telegram Gift / Sticker Helpers
// =====================================================

// Known Telegram gift collection addresses (bounceable base64)
const TELEGRAM_GIFT_COLLECTIONS = new Set([
    "EQAvwEBh52NmFjnOzQWJlg4mlh1yqvGiT5LdQojQIc6mTqjp", // SBT Telegram Usernames
    "EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi", // Telegram Anonymous Numbers
]);

const TELEGRAM_GIFT_COLLECTIONS_RAW = new Set(
    [...TELEGRAM_GIFT_COLLECTIONS]
        .map(addr => normalizeToRaw(addr))
        .filter((addr): addr is string => addr !== null)
);

function isTelegramGift(collectionAddress?: string): boolean {
    if (!collectionAddress) return false;
    const normalized = normalizeToRaw(collectionAddress);
    return normalized !== null && TELEGRAM_GIFT_COLLECTIONS_RAW.has(normalized);
}

/**
 * Categorize an NFT as gift, sticker, or regular
 */
export function categorizeNft(nft: NftItem): "gift" | "sticker" | "regular" {
    if (isTelegramGift(nft.collectionAddress)) return "gift";
    // Sticker detection: collection names containing "sticker" or NFT names with sticker patterns
    const name = (nft.collectionName || nft.name || "").toLowerCase();
    if (name.includes("sticker")) return "sticker";
    return "regular";
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
