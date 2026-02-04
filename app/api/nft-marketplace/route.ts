import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/app/(firebase)/server";
import { getSession } from "@/utils/session";
import { 
  buildListingMessages, 
  buildBuyTransaction,
  buildCancelTransaction,
  calculateFees,
  MIN_LISTING_PRICE,
  QC_MARKETPLACE_FEE_PERCENT,
} from "@/lib/nft-sale-contracts";
import { toNano, fromNano } from "@ton/core";

// Rate limiting: max requests per minute per user
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Maximum listing price (prevent overflow attacks)
const MAX_LISTING_PRICE = toNano("1000000000"); // 1 billion TON

/**
 * NFT Marketplace API
 * 
 * POST /api/nft-marketplace
 * 
 * Actions:
 * - create-listing: Build messages to list an NFT for sale
 * - build-buy: Build message to buy an NFT
 * - cancel-listing: Build message to cancel a listing
 * - get-listings: Get active QC Marketplace listings
 * - confirm-listing: Confirm a listing after transaction is confirmed
 * - confirm-sale: Confirm a sale after transaction is confirmed
 */

export async function POST(request: NextRequest) {
  try {
    // Authentication check - CRITICAL FIX
    const session = await getSession();
    if (!session || !session.user?.telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const authenticatedTelegramId = String(session.user.telegramId);
    
    const body = await request.json();
    const { action, telegramId } = body;

    // Verify telegramId matches authenticated user
    if (telegramId && String(telegramId) !== authenticatedTelegramId) {
      return NextResponse.json(
        { error: "telegramId mismatch with authenticated user" }, 
        { status: 403 }
      );
    }
    
    // Rate limiting
    const now = Date.now();
    const userRateLimit = rateLimitMap.get(authenticatedTelegramId);
    
    if (userRateLimit) {
      if (now < userRateLimit.resetTime) {
        if (userRateLimit.count >= MAX_REQUESTS_PER_WINDOW) {
          return NextResponse.json(
            { error: "Rate limit exceeded. Please try again later." },
            { status: 429 }
          );
        }
        userRateLimit.count++;
      } else {
        // Reset window
        rateLimitMap.set(authenticatedTelegramId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      }
    } else {
      rateLimitMap.set(authenticatedTelegramId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    }

    // Use authenticated telegramId for all operations
    const verifiedTelegramId = authenticatedTelegramId;

    switch (action) {
      case "create-listing":
        return handleCreateListing({ ...body, telegramId: verifiedTelegramId });
      
      case "build-buy":
        return handleBuildBuy({ ...body, telegramId: verifiedTelegramId });
      
      case "cancel-listing":
        return handleCancelListing({ ...body, telegramId: verifiedTelegramId });
      
      case "get-listings":
        return handleGetListings({ ...body, telegramId: verifiedTelegramId });
      
      case "confirm-listing":
        return handleConfirmListing({ ...body, telegramId: verifiedTelegramId });
      
      case "confirm-sale":
        return handleConfirmSale({ ...body, telegramId: verifiedTelegramId });
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[NFT Marketplace] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Create listing - returns messages to deploy sale contract and transfer NFT
 */
async function handleCreateListing(body: {
  telegramId: string;
  nftAddress: string;
  sellerAddress: string;
  price: string; // in TON
  royaltyAddress?: string;
  royaltyPercent?: number;
}) {
  const { nftAddress, sellerAddress, price, royaltyAddress, royaltyPercent } = body;

  if (!nftAddress || !sellerAddress || !price) {
    return NextResponse.json(
      { error: "nftAddress, sellerAddress, and price required" },
      { status: 400 }
    );
  }

  const priceNano = toNano(price);
  
  if (priceNano < MIN_LISTING_PRICE) {
    return NextResponse.json(
      { error: `Minimum listing price is ${fromNano(MIN_LISTING_PRICE)} TON` },
      { status: 400 }
    );
  }
  
  if (priceNano > MAX_LISTING_PRICE) {
    return NextResponse.json(
      { error: `Maximum listing price is ${fromNano(MAX_LISTING_PRICE)} TON` },
      { status: 400 }
    );
  }

  // Build the listing messages
  const result = buildListingMessages({
    nftAddress,
    sellerAddress,
    price: priceNano,
    royaltyAddress,
    royaltyPercent,
  });

  return NextResponse.json({
    success: true,
    saleContractAddress: result.saleContractAddress,
    messages: result.messages,
    fees: {
      marketplaceFeePercent: QC_MARKETPLACE_FEE_PERCENT,
      marketplaceFee: fromNano(result.fees.marketplaceFee),
      royaltyAmount: fromNano(result.fees.royaltyAmount),
      sellerReceives: fromNano(result.fees.sellerReceives),
    },
  });
}

/**
 * Build buy transaction
 */
async function handleBuildBuy(body: {
  telegramId: string;
  saleContractAddress: string;
  price: string; // in TON
}) {
  const { saleContractAddress, price } = body;

  if (!saleContractAddress || !price) {
    return NextResponse.json(
      { error: "saleContractAddress and price required" },
      { status: 400 }
    );
  }

  const priceNano = toNano(price);
  const transaction = buildBuyTransaction(saleContractAddress, priceNano);
  const fees = calculateFees(priceNano);

  return NextResponse.json({
    success: true,
    transaction,
    totalPrice: fromNano(priceNano),
    fees: {
      marketplaceFee: fromNano(fees.marketplaceFee),
      sellerReceives: fromNano(fees.sellerReceives),
    },
  });
}

/**
 * Cancel listing
 */
async function handleCancelListing(body: {
  telegramId: string;
  saleContractAddress: string;
}) {
  const { saleContractAddress } = body;

  if (!saleContractAddress) {
    return NextResponse.json(
      { error: "saleContractAddress required" },
      { status: 400 }
    );
  }

  const transaction = buildCancelTransaction(saleContractAddress);

  return NextResponse.json({
    success: true,
    transaction,
  });
}

/**
 * Get active listings from Firebase
 */
async function handleGetListings(body: {
  telegramId: string;
  collectionAddress?: string;
  sellerAddress?: string;
  limit?: number;
}) {
  const { collectionAddress, sellerAddress, limit = 50 } = body;

  let query = firestore
    .collection("nft_listings")
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .limit(limit);

  if (collectionAddress) {
    query = query.where("collectionAddress", "==", collectionAddress);
  }

  if (sellerAddress) {
    query = query.where("sellerAddress", "==", sellerAddress);
  }

  const snapshot = await query.get();
  const listings = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return NextResponse.json({
    success: true,
    listings,
    count: listings.length,
  });
}

/**
 * Confirm a listing after the transaction is confirmed on-chain
 */
async function handleConfirmListing(body: {
  telegramId: string;
  nftAddress: string;
  saleContractAddress: string;
  sellerAddress: string;
  price: string;
  nftName?: string;
  nftImage?: string;
  collectionAddress?: string;
  collectionName?: string;
  transactionHash?: string;
}) {
  const {
    telegramId,
    nftAddress,
    saleContractAddress,
    sellerAddress,
    price,
    nftName,
    nftImage,
    collectionAddress,
    collectionName,
    transactionHash,
  } = body;

  if (!nftAddress || !saleContractAddress || !sellerAddress || !price) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Store listing in Firebase
  const listingRef = firestore.collection("nft_listings").doc(saleContractAddress);
  await listingRef.set({
    nftAddress,
    saleContractAddress,
    sellerAddress,
    sellerTelegramId: telegramId,
    price: toNano(price).toString(),
    priceFormatted: `${price} TON`,
    nftName,
    nftImage,
    collectionAddress,
    collectionName,
    status: "active",
    createdAt: Date.now(),
    transactionHash,
    marketplace: "QC",
  });

  // Update marketplace stats
  await updateMarketplaceStats("listing");

  return NextResponse.json({
    success: true,
    listingId: saleContractAddress,
  });
}

/**
 * Confirm a sale after the buy transaction is confirmed
 */
async function handleConfirmSale(body: {
  telegramId: string;
  saleContractAddress: string;
  buyerAddress: string;
  transactionHash?: string;
}) {
  const { saleContractAddress, buyerAddress, transactionHash } = body;

  if (!saleContractAddress || !buyerAddress) {
    return NextResponse.json(
      { error: "saleContractAddress and buyerAddress required" },
      { status: 400 }
    );
  }

  // Update listing status
  const listingRef = firestore.collection("nft_listings").doc(saleContractAddress);
  const listing = await listingRef.get();

  if (!listing.exists) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const listingData = listing.data();
  
  await listingRef.update({
    status: "sold",
    buyerAddress,
    soldAt: Date.now(),
    soldTransactionHash: transactionHash,
  });

  // Record the sale for stats
  await firestore.collection("nft_sales").add({
    ...listingData,
    buyerAddress,
    soldAt: Date.now(),
    transactionHash,
  });

  // Update marketplace stats
  await updateMarketplaceStats("sale", BigInt(listingData?.price || "0"));

  return NextResponse.json({
    success: true,
  });
}

/**
 * Update marketplace aggregate stats
 */
async function updateMarketplaceStats(
  event: "listing" | "sale",
  salePrice?: bigint
) {
  const statsRef = firestore.collection("marketplace_stats").doc("global");
  
  await firestore.runTransaction(async (transaction) => {
    const statsDoc = await transaction.get(statsRef);
    const currentStats = statsDoc.exists ? statsDoc.data() : {
      totalListings: 0,
      activeListings: 0,
      totalSales: 0,
      totalVolume: "0",
      volume24h: "0",
      lastUpdated: 0,
    };

    if (event === "listing") {
      transaction.set(statsRef, {
        ...currentStats,
        totalListings: (currentStats?.totalListings || 0) + 1,
        activeListings: (currentStats?.activeListings || 0) + 1,
        lastUpdated: Date.now(),
      }, { merge: true });
    } else if (event === "sale" && salePrice) {
      const currentVolume = BigInt(currentStats?.totalVolume || "0");
      const current24hVolume = BigInt(currentStats?.volume24h || "0");
      
      transaction.set(statsRef, {
        ...currentStats,
        activeListings: Math.max(0, (currentStats?.activeListings || 0) - 1),
        totalSales: (currentStats?.totalSales || 0) + 1,
        totalVolume: (currentVolume + salePrice).toString(),
        volume24h: (current24hVolume + salePrice).toString(),
        lastUpdated: Date.now(),
      }, { merge: true });
    }
  });
}

export async function GET() {
  return NextResponse.json({ 
    service: "QC NFT Marketplace",
    version: "1.0.0",
    feePercent: QC_MARKETPLACE_FEE_PERCENT,
    minListingPrice: fromNano(MIN_LISTING_PRICE),
  });
}
