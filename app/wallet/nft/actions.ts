"use server";

import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";
import {
  buildListingMessages,
  buildBuyTransaction,
  buildCancelTransaction,
  calculateFees,
  MIN_LISTING_PRICE,
  QC_MARKETPLACE_FEE_PERCENT,
} from "@/lib/nft-sale-contracts";
import { toNano, fromNano } from "@ton/core";

// ---------------------------------------------------------------------------
// nftCreateListing — build messages to list an NFT for sale
// ---------------------------------------------------------------------------

const MAX_LISTING_PRICE = toNano("1000000000");

const createListingSchema = z.object({
  nftAddress: z.string().min(1, "nftAddress required"),
  sellerAddress: z.string().min(1, "sellerAddress required"),
  price: z.string().min(1, "price required"),
  royaltyAddress: z.string().optional(),
  royaltyPercent: z.number().optional(),
});

export const nftCreateListing = authActionClient
  .schema(createListingSchema)
  .action(
    async ({
      parsedInput: {
        nftAddress,
        sellerAddress,
        price,
        royaltyAddress,
        royaltyPercent,
      },
    }) => {
      const priceNano = toNano(price);

      if (priceNano < MIN_LISTING_PRICE) {
        throw new Error(
          `Minimum listing price is ${fromNano(MIN_LISTING_PRICE)} TON`,
        );
      }
      if (priceNano > MAX_LISTING_PRICE) {
        throw new Error(
          `Maximum listing price is ${fromNano(MAX_LISTING_PRICE)} TON`,
        );
      }

      const result = buildListingMessages({
        nftAddress,
        sellerAddress,
        price: priceNano,
        royaltyAddress,
        royaltyPercent,
      });

      return {
        success: true,
        saleContractAddress: result.saleContractAddress,
        messages: result.messages,
        fees: {
          marketplaceFeePercent: QC_MARKETPLACE_FEE_PERCENT,
          marketplaceFee: fromNano(result.fees.marketplaceFee),
          royaltyAmount: fromNano(result.fees.royaltyAmount),
          sellerReceives: fromNano(result.fees.sellerReceives),
        },
      };
    },
  );

// ---------------------------------------------------------------------------
// nftConfirmListing — confirm a listing after on-chain transaction
// ---------------------------------------------------------------------------

const confirmListingSchema = z.object({
  nftAddress: z.string().min(1),
  saleContractAddress: z.string().min(1),
  sellerAddress: z.string().min(1),
  price: z.string().min(1),
  nftName: z.string().optional(),
  nftImage: z.string().optional(),
  collectionAddress: z.string().optional(),
  collectionName: z.string().optional(),
  transactionHash: z.string().optional(),
});

export const nftConfirmListing = authActionClient
  .schema(confirmListingSchema)
  .action(
    async ({
      ctx: { session },
      parsedInput: {
        nftAddress,
        saleContractAddress,
        sellerAddress,
        price,
        nftName,
        nftImage,
        collectionAddress,
        collectionName,
        transactionHash,
      },
    }) => {
      const telegramId = String(session.user.telegramId);

      const listingRef = firestore
        .collection("nft_listings")
        .doc(saleContractAddress);
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

      await updateMarketplaceStats("listing");

      return { success: true, listingId: saleContractAddress };
    },
  );

// ---------------------------------------------------------------------------
// nftBuildBuy — build a buy transaction for an NFT
// ---------------------------------------------------------------------------

const buildBuySchema = z.object({
  saleContractAddress: z.string().min(1),
  price: z.string().min(1),
});

export const nftBuildBuy = authActionClient
  .schema(buildBuySchema)
  .action(async ({ parsedInput: { saleContractAddress, price } }) => {
    const priceNano = toNano(price);
    const transaction = buildBuyTransaction(saleContractAddress, priceNano);
    const fees = calculateFees(priceNano);

    return {
      success: true,
      transaction,
      totalPrice: fromNano(priceNano),
      fees: {
        marketplaceFee: fromNano(fees.marketplaceFee),
        sellerReceives: fromNano(fees.sellerReceives),
      },
    };
  });

// ---------------------------------------------------------------------------
// nftConfirmSale — confirm a sale after the buy transaction
// ---------------------------------------------------------------------------

const confirmSaleSchema = z.object({
  listingId: z.string().min(1),
  buyerAddress: z.string().min(1),
  transactionHash: z.string().min(1, "Transaction hash is required"),
});

export const nftConfirmSale = authActionClient
  .schema(confirmSaleSchema)
  .action(
    async ({ ctx: { session }, parsedInput: { listingId, buyerAddress, transactionHash } }) => {
      const buyerTelegramId = String(session.user.telegramId);
      const listingRef = firestore
        .collection("nft_listings")
        .doc(listingId);

      const listingData = await firestore.runTransaction(
        async (transaction) => {
          const listing = await transaction.get(listingRef);

          if (!listing.exists) {
            throw new Error("Listing not found");
          }

          const data = listing.data();
          if (data?.status !== "active") {
            throw new Error("This NFT has already been sold");
          }

          if (data?.sellerTelegramId === buyerTelegramId) {
            throw new Error("Cannot buy your own listing");
          }

          transaction.update(listingRef, {
            status: "sold",
            buyerAddress,
            buyerTelegramId,
            soldAt: Date.now(),
            soldTransactionHash: transactionHash,
          });

          return data;
        },
      );

      // Check for duplicate sales record
      if (transactionHash) {
        const existingSale = await firestore
          .collection("nft_sales")
          .where("transactionHash", "==", transactionHash)
          .limit(1)
          .get();
        if (!existingSale.empty) {
          return { success: true };
        }
      }

      await firestore.collection("nft_sales").add({
        ...listingData,
        buyerAddress,
        soldAt: Date.now(),
        transactionHash,
      });

      await updateMarketplaceStats(
        "sale",
        BigInt(listingData?.price || "0"),
      );

      return { success: true };
    },
  );

// ---------------------------------------------------------------------------
// Shared helper: update marketplace aggregate stats
// ---------------------------------------------------------------------------

async function updateMarketplaceStats(
  event: "listing" | "sale",
  salePrice?: bigint,
) {
  const statsRef = firestore.collection("marketplace_stats").doc("global");

  await firestore.runTransaction(async (transaction) => {
    const statsDoc = await transaction.get(statsRef);
    const currentStats = statsDoc.exists
      ? statsDoc.data()
      : {
          totalListings: 0,
          activeListings: 0,
          totalSales: 0,
          totalVolume: "0",
          volume24h: "0",
          lastUpdated: 0,
        };

    const now = Date.now();

    if (event === "listing") {
      transaction.set(
        statsRef,
        {
          ...currentStats,
          totalListings: (currentStats?.totalListings || 0) + 1,
          activeListings: (currentStats?.activeListings || 0) + 1,
          lastUpdated: now,
        },
        { merge: true },
      );
    } else if (event === "sale" && salePrice) {
      const currentVolume = BigInt(currentStats?.totalVolume || "0");

      // Reset 24h volume if the window has expired (older than 24 hours)
      const lastVolumeReset = currentStats?.volume24hResetAt || 0;
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const isVolumeExpired = now - lastVolumeReset > TWENTY_FOUR_HOURS;
      const current24hVolume = isVolumeExpired
        ? BigInt(0)
        : BigInt(currentStats?.volume24h || "0");

      transaction.set(
        statsRef,
        {
          ...currentStats,
          activeListings: Math.max(
            0,
            (currentStats?.activeListings || 0) - 1,
          ),
          totalSales: (currentStats?.totalSales || 0) + 1,
          totalVolume: (currentVolume + salePrice).toString(),
          volume24h: (current24hVolume + salePrice).toString(),
          volume24hResetAt: isVolumeExpired ? now : (currentStats?.volume24hResetAt || now),
          lastUpdated: now,
        },
        { merge: true },
      );
    }
  });
}

// ---------------------------------------------------------------------------
// getNftListings — get active QC Marketplace listings
// ---------------------------------------------------------------------------

const getListingsSchema = z.object({
  collectionAddress: z.string().optional(),
  sellerAddress: z.string().optional(),
  limit: z.number().max(100).optional(),
});

export const getNftListings = authActionClient
  .schema(getListingsSchema)
  .action(async ({ parsedInput: { collectionAddress, sellerAddress, limit: queryLimit = 50 } }) => {
    let query = firestore
      .collection("nft_listings")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(queryLimit);

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

    return { success: true, listings, count: listings.length };
  });

// ---------------------------------------------------------------------------
// cancelNftListing — build cancel transaction for an NFT listing
// ---------------------------------------------------------------------------

const cancelListingSchema = z.object({
  saleContractAddress: z.string().min(1, "saleContractAddress required"),
});

export const cancelNftListing = authActionClient
  .schema(cancelListingSchema)
  .action(async ({ parsedInput: { saleContractAddress } }) => {
    const transaction = buildCancelTransaction(saleContractAddress);

    return { success: true, transaction };
  });
