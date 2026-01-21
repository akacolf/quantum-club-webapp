/**
 * Quantum Club NFT Sale Smart Contract Utilities
 * 
 * This module provides the infrastructure for in-house NFT trading:
 * - Create sale listings (fixed price)
 * - Buy NFTs directly
 * - Cancel listings
 * - Make and accept offers
 * 
 * Based on TON TEP-62/TEP-64 standards and inspired by Getgems contracts.
 * 
 * Sale Flow:
 * 1. Seller deploys a sale contract with NFT address and price
 * 2. Seller transfers NFT to the sale contract
 * 3. Buyer sends TON to the sale contract
 * 4. Sale contract transfers NFT to buyer and TON to seller
 * 
 * Key Innovation: Lower fees (0.5% vs 5%), instant settlement, Telegram integration
 */

import { beginCell, Cell, Address, toNano, fromNano, contractAddress, storeStateInit } from "@ton/core";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { NFT_SALE_CODE_HEX } from "@/contracts/build/contract-code";

// =====================================================
// Constants & Configuration
// =====================================================

// Quantum Club marketplace fee: 0.5% (much lower than Getgems' 5%)
export const QC_MARKETPLACE_FEE_PERCENT = 0.5;
export const QC_MARKETPLACE_FEE_NUMERATOR = BigInt(5); // 5/1000 = 0.5%
export const QC_MARKETPLACE_FEE_DENOMINATOR = BigInt(1000);

// Fee recipient address (TODO: Replace with actual QC treasury)
export const QC_FEE_RECIPIENT = "UQBqSpvo4S87mX9tjHaG4zhYZeORhVhMapBJpnMZ64jhrP-A"; // Placeholder

// Minimum listing price (0.1 TON)
export const MIN_LISTING_PRICE = toNano("0.1");

// Gas fees for operations
export const GAS_LISTING = toNano("0.15");    // Deploy sale contract + NFT transfer
export const GAS_DEPLOY = toNano("0.05");     // Deploy sale contract only
export const GAS_BUY = toNano("0.15");        // Buy NFT (price + forward fees)
export const GAS_CANCEL = toNano("0.05");     // Cancel listing

// NFT Sale Contract Code (compiled from contracts/nft_sale.fc)
let NFT_SALE_CODE: Cell | null = null;

function getNftSaleCode(): Cell {
  if (!NFT_SALE_CODE) {
    NFT_SALE_CODE = Cell.fromHex(NFT_SALE_CODE_HEX);
  }
  return NFT_SALE_CODE;
}

// Op-codes for NFT operations (TEP-62)
export const OP_TRANSFER_NFT = 0x5fcc3d14;
export const OP_OWNERSHIP_ASSIGNED = 0x05138d91;
export const OP_GET_STATIC_DATA = 0x2fcb26a2;
export const OP_REPORT_STATIC_DATA = 0x8b771735;

// Op-codes for sale contract
export const OP_CANCEL_SALE = 0;
export const OP_BUY = 1;

// =====================================================
// Types
// =====================================================

export interface CreateListingParams {
  nftAddress: string;
  price: bigint; // in nanoTON
  royaltyAddress?: string;
  royaltyPercent?: number; // 0-100
}

export interface ListingResult {
  saleContractAddress: string;
  transactionHash?: string;
  price: bigint;
  priceFormatted: string;
  marketplaceFee: bigint;
  sellerReceives: bigint;
}

export interface BuyNftParams {
  saleContractAddress: string;
  price: bigint;
}

export interface BuyResult {
  transactionHash?: string;
  nftAddress: string;
  pricePaid: bigint;
}

export interface SaleInfo {
  isActive: boolean;
  nftAddress: string;
  nftOwnerAddress?: string;
  fullPrice: bigint;
  marketplaceFee: bigint;
  royaltyAmount: bigint;
  royaltyAddress?: string;
  sellerAddress: string;
  createdAt?: number;
}

export interface MarketplaceListing {
  id: string;
  nftAddress: string;
  saleContractAddress: string;
  sellerAddress: string;
  price: bigint;
  priceFormatted: string;
  createdAt: number;
  status: "active" | "sold" | "cancelled";
  nftName?: string;
  nftImage?: string;
  collectionAddress?: string;
  collectionName?: string;
}

// =====================================================
// Sale Contract Builder
// =====================================================

/**
 * Build the initial data cell for a QC NFT sale contract
 * 
 * Data layout (similar to Getgems nft-fixprice-sale-v3):
 * - is_complete: 1 bit (false initially)
 * - created_at: 32 bits
 * - marketplace_address: 267 bits (MsgAddress)
 * - nft_address: 267 bits (MsgAddress)
 * - nft_owner_address: 267 bits (MsgAddress) - seller
 * - full_price: 128 bits (Coins)
 * - marketplace_fee_address: 267 bits (MsgAddress)
 * - marketplace_fee: 128 bits (Coins)
 * - royalty_address: 267 bits (MsgAddress)
 * - royalty_amount: 128 bits (Coins)
 */
export function buildSaleContractData(params: {
  marketplaceAddress: Address;
  nftAddress: Address;
  nftOwnerAddress: Address;
  fullPrice: bigint;
  marketplaceFeeAddress: Address;
  marketplaceFee: bigint;
  royaltyAddress: Address;
  royaltyAmount: bigint;
}): Cell {
  const createdAt = Math.floor(Date.now() / 1000);
  
  // First cell: basic info
  const cell1 = beginCell()
    .storeBit(false) // is_complete = false
    .storeUint(createdAt, 32)
    .storeAddress(params.marketplaceAddress)
    .storeAddress(params.nftAddress)
    .storeAddress(params.nftOwnerAddress)
    .storeCoins(params.fullPrice);
  
  // Second cell (ref): fee info
  const cell2 = beginCell()
    .storeAddress(params.marketplaceFeeAddress)
    .storeCoins(params.marketplaceFee)
    .storeAddress(params.royaltyAddress)
    .storeCoins(params.royaltyAmount)
    .endCell();
  
  return cell1.storeRef(cell2).endCell();
}

/**
 * Calculate marketplace fee and seller proceeds
 */
export function calculateFees(price: bigint, royaltyPercent = 0): {
  marketplaceFee: bigint;
  royaltyAmount: bigint;
  sellerReceives: bigint;
} {
  // Marketplace fee: 0.5%
  const marketplaceFee = (price * QC_MARKETPLACE_FEE_NUMERATOR) / QC_MARKETPLACE_FEE_DENOMINATOR;
  
  // Royalty (creator fee)
  const royaltyAmount = BigInt(Math.floor(Number(price) * (royaltyPercent / 100)));
  
  // Seller receives: price - marketplace fee - royalty
  const sellerReceives = price - marketplaceFee - royaltyAmount;
  
  return { marketplaceFee, royaltyAmount, sellerReceives };
}

// =====================================================
// NFT Transfer Operations
// =====================================================

/**
 * Build the message body to transfer an NFT to the sale contract
 * This is the standard TEP-62 transfer message
 */
export function buildNftTransferMessage(
  newOwnerAddress: Address,
  responseDestination: Address,
  forwardAmount: bigint = toNano("0.02"),
  forwardPayload?: Cell
): Cell {
  const body = beginCell()
    .storeUint(OP_TRANSFER_NFT, 32) // op: transfer
    .storeUint(0, 64) // query_id
    .storeAddress(newOwnerAddress) // new_owner
    .storeAddress(responseDestination) // response_destination
    .storeBit(false) // custom_payload = null
    .storeCoins(forwardAmount); // forward_amount
  
  if (forwardPayload) {
    body.storeBit(true).storeRef(forwardPayload);
  } else {
    body.storeBit(false);
  }
  
  return body.endCell();
}

/**
 * Build the message to buy an NFT from a sale contract
 */
export function buildBuyMessage(): Cell {
  return beginCell()
    .storeUint(OP_BUY, 32) // op: buy
    .storeUint(0, 64) // query_id
    .endCell();
}

/**
 * Build the message to cancel a sale listing
 */
export function buildCancelMessage(): Cell {
  return beginCell()
    .storeUint(OP_CANCEL_SALE, 32) // op: cancel
    .storeUint(0, 64) // query_id
    .endCell();
}

// =====================================================
// High-Level Operations
// =====================================================

/**
 * Compute the sale contract address deterministically
 * This allows us to know the address before deployment
 */
export function computeSaleContractAddress(
  nftAddress: Address,
  sellerAddress: Address,
  price: bigint,
  marketplaceAddress: Address = Address.parse(QC_FEE_RECIPIENT)
): { address: Address; stateInit: { code: Cell; data: Cell } } {
  const { marketplaceFee, royaltyAmount } = calculateFees(price, 0);
  
  const data = buildSaleContractData({
    marketplaceAddress,
    nftAddress,
    nftOwnerAddress: sellerAddress,
    fullPrice: price,
    marketplaceFeeAddress: marketplaceAddress,
    marketplaceFee,
    royaltyAddress: sellerAddress, // No royalty for now
    royaltyAmount,
  });
  
  const code = getNftSaleCode();
  const init = { code, data };
  const address = contractAddress(0, init);
  
  return { address, stateInit: init };
}

/**
 * Build messages to create a new NFT listing
 * 
 * This returns the messages needed to:
 * 1. Deploy the sale contract (with stateInit)
 * 2. Transfer the NFT to the sale contract
 * 
 * The caller should send these messages via their wallet
 */
export function buildListingMessages(params: {
  nftAddress: string;
  sellerAddress: string;
  price: bigint;
  royaltyAddress?: string;
  royaltyPercent?: number;
}): {
  saleContractAddress: string;
  messages: Array<{
    address: string;
    amount: string;
    payload: string;
    stateInit?: string;
  }>;
  fees: {
    marketplaceFee: bigint;
    royaltyAmount: bigint;
    sellerReceives: bigint;
  };
} {
  const nftAddress = Address.parse(params.nftAddress);
  const sellerAddress = Address.parse(params.sellerAddress);
  const marketplaceAddress = Address.parse(QC_FEE_RECIPIENT);
  const royaltyAddress = params.royaltyAddress 
    ? Address.parse(params.royaltyAddress) 
    : sellerAddress;
  
  // Calculate fees
  const { marketplaceFee, royaltyAmount, sellerReceives } = calculateFees(
    params.price,
    params.royaltyPercent || 0
  );
  
  // Build sale contract data
  const saleData = buildSaleContractData({
    marketplaceAddress,
    nftAddress,
    nftOwnerAddress: sellerAddress,
    fullPrice: params.price,
    marketplaceFeeAddress: marketplaceAddress,
    marketplaceFee,
    royaltyAddress,
    royaltyAmount,
  });
  
  // Get contract code and compute address
  const code = getNftSaleCode();
  const init = { code, data: saleData };
  const saleContractAddr = contractAddress(0, init);
  
  // Build stateInit for deployment
  const stateInitCell = beginCell().store(storeStateInit(init)).endCell();
  
  // Message 1: Deploy sale contract (send small amount to initialize)
  const deployBody = beginCell().storeUint(0, 32).storeStringTail("Deploy QC Sale").endCell();
  
  // Message 2: Transfer NFT to sale contract
  const transferBody = buildNftTransferMessage(
    saleContractAddr, // New owner (sale contract)
    sellerAddress,    // Response destination
    toNano("0.02"),   // Forward amount
    undefined         // No forward payload
  );
  
  return {
    saleContractAddress: saleContractAddr.toString(),
    messages: [
      {
        address: saleContractAddr.toString(),
        amount: GAS_DEPLOY.toString(),
        payload: deployBody.toBoc().toString("base64"),
        stateInit: stateInitCell.toBoc().toString("base64"),
      },
      {
        address: params.nftAddress,
        amount: GAS_LISTING.toString(),
        payload: transferBody.toBoc().toString("base64"),
      },
    ],
    fees: { marketplaceFee, royaltyAmount, sellerReceives },
  };
}

/**
 * Build a message to buy an NFT from a sale contract
 */
export function buildBuyTransaction(
  saleContractAddress: string,
  price: bigint
): {
  address: string;
  amount: string;
  payload: string;
} {
  const buyBody = buildBuyMessage();
  const totalAmount = price + GAS_BUY;
  
  return {
    address: saleContractAddress,
    amount: totalAmount.toString(),
    payload: buyBody.toBoc().toString("base64"),
  };
}

/**
 * Build a message to cancel a sale listing
 */
export function buildCancelTransaction(
  saleContractAddress: string
): {
  address: string;
  amount: string;
  payload: string;
} {
  const cancelBody = buildCancelMessage();
  
  return {
    address: saleContractAddress,
    amount: GAS_CANCEL.toString(),
    payload: cancelBody.toBoc().toString("base64"),
  };
}

/**
 * Create a new NFT listing
 * 
 * This creates a sale contract and transfers the NFT to it
 */
export async function createListing(
  params: CreateListingParams,
  mnemonic: string,
  isTestnet = false
): Promise<ListingResult> {
  const mnemonicArray = mnemonic.split(" ");
  const keyPair = await mnemonicToPrivateKey(mnemonicArray);
  
  const wallet = WalletContractV5R1.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });
  
  const baseUrl = isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io";
  const ta = new TonApiClient({ baseUrl });
  const adapter = new ContractAdapter(ta);
  const contract = adapter.open(wallet);
  
  const seqno = await contract.getSeqno();
  
  // Build listing messages with proper contract deployment
  const { saleContractAddress, messages, fees } = buildListingMessages({
    nftAddress: params.nftAddress,
    sellerAddress: wallet.address.toString(),
    price: params.price,
    royaltyAddress: params.royaltyAddress,
    royaltyPercent: params.royaltyPercent,
  });
  
  // Send both messages: deploy + NFT transfer
  const internalMessages = messages.map(msg => {
    const baseMsg: {
      to: Address;
      value: bigint;
      body: Cell;
      init?: { code: Cell; data: Cell };
    } = {
      to: Address.parse(msg.address),
      value: BigInt(msg.amount),
      body: Cell.fromBase64(msg.payload),
    };
    
    // Add stateInit for the deploy message
    if (msg.stateInit) {
      const stateInitCell = Cell.fromBase64(msg.stateInit);
      const slice = stateInitCell.beginParse();
      const code = slice.loadRef();
      const data = slice.loadRef();
      baseMsg.init = { code, data };
    }
    
    return internal(baseMsg);
  });
  
  await contract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    messages: internalMessages,
  });
  
  return {
    saleContractAddress,
    price: params.price,
    priceFormatted: `${fromNano(params.price)} TON`,
    marketplaceFee: fees.marketplaceFee,
    sellerReceives: fees.sellerReceives,
  };
}

/**
 * Buy an NFT from a sale contract
 */
export async function buyNft(
  params: BuyNftParams,
  mnemonic: string,
  isTestnet = false
): Promise<BuyResult> {
  const mnemonicArray = mnemonic.split(" ");
  const keyPair = await mnemonicToPrivateKey(mnemonicArray);
  
  const wallet = WalletContractV5R1.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });
  
  const baseUrl = isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io";
  const ta = new TonApiClient({ baseUrl });
  const adapter = new ContractAdapter(ta);
  const contract = adapter.open(wallet);
  
  const seqno = await contract.getSeqno();
  const saleAddress = Address.parse(params.saleContractAddress);
  
  // Build buy message
  const buyBody = buildBuyMessage();
  
  // Send price + gas
  const totalAmount = params.price + GAS_BUY;
  
  await contract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    messages: [
      internal({
        to: saleAddress,
        value: totalAmount,
        body: buyBody,
        bounce: true,
      }),
    ],
  });
  
  return {
    nftAddress: "", // Would be determined from sale contract
    pricePaid: params.price,
  };
}

/**
 * Cancel an NFT listing (seller only)
 */
export async function cancelListing(
  saleContractAddress: string,
  mnemonic: string,
  isTestnet = false
): Promise<boolean> {
  const mnemonicArray = mnemonic.split(" ");
  const keyPair = await mnemonicToPrivateKey(mnemonicArray);
  
  const wallet = WalletContractV5R1.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });
  
  const baseUrl = isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io";
  const ta = new TonApiClient({ baseUrl });
  const adapter = new ContractAdapter(ta);
  const contract = adapter.open(wallet);
  
  const seqno = await contract.getSeqno();
  const saleAddress = Address.parse(saleContractAddress);
  
  // Build cancel message
  const cancelBody = buildCancelMessage();
  
  await contract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    messages: [
      internal({
        to: saleAddress,
        value: GAS_CANCEL,
        body: cancelBody,
        bounce: true,
      }),
    ],
  });
  
  return true;
}

// =====================================================
// Query Operations
// =====================================================

/**
 * Get sale contract info
 */
export async function getSaleInfo(
  saleContractAddress: string,
  isTestnet = false
): Promise<SaleInfo | null> {
  try {
    const baseUrl = isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io";
    const ta = new TonApiClient({ baseUrl });
    
    // Get account info
    const account = await ta.accounts.getAccount(
      Address.parse(saleContractAddress)
    );
    
    if (account.status !== "active") {
      return null;
    }
    
    // Run get_sale_data method
    const result = await ta.blockchain.execGetMethodForBlockchainAccount(
      Address.parse(saleContractAddress),
      "get_sale_data"
    );
    
    if (!result.decoded || !result.success) {
      return null;
    }
    
    // Parse the result based on Getgems sale contract format
    const stack = result.decoded as unknown[];
    
    if (stack.length < 8) {
      return null;
    }
    
    return {
      isActive: true,
      nftAddress: (stack[2] as { address: string })?.address || "",
      sellerAddress: (stack[3] as { address: string })?.address || "",
      fullPrice: BigInt(stack[4] as string || "0"),
      marketplaceFee: BigInt(stack[5] as string || "0"),
      royaltyAddress: (stack[6] as { address: string })?.address,
      royaltyAmount: BigInt(stack[7] as string || "0"),
    };
  } catch (error) {
    console.error("[Sale] Error getting sale info:", error);
    return null;
  }
}

/**
 * Check if an NFT is listed for sale
 */
export async function isNftListed(
  nftAddress: string,
  isTestnet = false
): Promise<{ listed: boolean; saleAddress?: string; price?: bigint }> {
  try {
    const baseUrl = isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io";
    
    // Use TONAPI to check if NFT has a sale
    const response = await fetch(
      `${baseUrl}/v2/nfts/${encodeURIComponent(nftAddress)}`,
      { headers: { "Content-Type": "application/json" } }
    );
    
    if (!response.ok) {
      return { listed: false };
    }
    
    const data = await response.json();
    
    if (data.sale) {
      return {
        listed: true,
        saleAddress: data.sale.address,
        price: BigInt(data.sale.price?.value || "0"),
      };
    }
    
    return { listed: false };
  } catch (error) {
    console.error("[Sale] Error checking listing status:", error);
    return { listed: false };
  }
}

// =====================================================
// Marketplace Stats (Unique Features)
// =====================================================

export interface QCMarketplaceStats {
  totalListings: number;
  totalVolume24h: bigint;
  totalVolumeAllTime: bigint;
  averagePrice: bigint;
  lowestListing: bigint;
  highestSale: bigint;
  uniqueSellers: number;
  uniqueBuyers: number;
  salesCount24h: number;
  topCollections: Array<{
    address: string;
    name: string;
    volume24h: bigint;
    salesCount: number;
    floorPrice: bigint;
  }>;
}

/**
 * Get marketplace-wide statistics
 * This aggregates data from TONAPI and calculates useful metrics
 */
export async function getMarketplaceStats(
  isTestnet = false
): Promise<QCMarketplaceStats> {
  try {
    const baseUrl = isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io";
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;
    
    // Fetch multiple data sources in parallel
    const [collectionsRes, eventsRes] = await Promise.all([
      // Get top collections
      fetch(`${baseUrl}/v2/nfts/collections?limit=50`, {
        headers: { "Content-Type": "application/json" },
      }),
      // Get recent NFT purchase events (last 24h)
      fetch(`${baseUrl}/v2/events?limit=100&start_date=${oneDayAgo}&initiator=true&account=&event_type=NftPurchase`, {
        headers: { "Content-Type": "application/json" },
      }).catch(() => null), // Events endpoint might not be available
    ]);
    
    if (!collectionsRes.ok) {
      throw new Error("Failed to fetch collections");
    }
    
    const collectionsData = await collectionsRes.json();
    const collections = collectionsData.nft_collections || [];
    
    // Parse events for 24h volume
    let totalVolume24h = BigInt(0);
    let salesCount24h = 0;
    const uniqueSellers = new Set<string>();
    const uniqueBuyers = new Set<string>();
    
    if (eventsRes && eventsRes.ok) {
      try {
        const eventsData = await eventsRes.json();
        const events = eventsData.events || [];
        
        for (const event of events) {
          if (event.actions) {
            for (const action of event.actions) {
              if (action.type === "NftPurchase" && action.NftPurchase) {
                const purchase = action.NftPurchase;
                const amount = BigInt(purchase.amount?.value || "0");
                totalVolume24h += amount;
                salesCount24h++;
                
                if (purchase.seller?.address) uniqueSellers.add(purchase.seller.address);
                if (purchase.buyer?.address) uniqueBuyers.add(purchase.buyer.address);
              }
            }
          }
        }
      } catch {
        // Events parsing failed, continue with 0 values
      }
    }
    
    // Calculate aggregate stats from collections
    let totalListings = 0;
    
    interface CollectionWithStats {
      address: string;
      name: string;
      volume24h: bigint;
      salesCount: number;
      floorPrice: bigint;
    }
    
    const topCollections: CollectionWithStats[] = [];
    
    for (const collection of collections) {
      totalListings += collection.nft_items_count || 0;
      
      // Note: TONAPI doesn't provide floor_price directly in collections list
      // Would need separate calls per collection for floor prices
      topCollections.push({
        address: collection.address,
        name: collection.metadata?.name || "Unknown",
        volume24h: BigInt(0), // Would need historical data
        salesCount: 0,
        floorPrice: BigInt(0),
      });
    }
    
    // Calculate average price
    const averagePrice = salesCount24h > 0 
      ? totalVolume24h / BigInt(salesCount24h) 
      : BigInt(0);
    
    return {
      totalListings,
      totalVolume24h,
      totalVolumeAllTime: BigInt(0), // Would need historical aggregation
      averagePrice,
      lowestListing: BigInt(0), // Would need to query floor prices
      highestSale: BigInt(0), // Would need to track from events
      uniqueSellers: uniqueSellers.size,
      uniqueBuyers: uniqueBuyers.size,
      salesCount24h,
      topCollections: topCollections.slice(0, 10),
    };
  } catch (error) {
    console.error("[Marketplace] Error fetching stats:", error);
    return {
      totalListings: 0,
      totalVolume24h: BigInt(0),
      totalVolumeAllTime: BigInt(0),
      averagePrice: BigInt(0),
      lowestListing: BigInt(0),
      highestSale: BigInt(0),
      uniqueSellers: 0,
      uniqueBuyers: 0,
      salesCount24h: 0,
      topCollections: [],
    };
  }
}

// =====================================================
// Price History & Analytics
// =====================================================

export interface PricePoint {
  timestamp: number;
  price: bigint;
  type: "listing" | "sale";
}

export interface NftPriceHistory {
  nftAddress: string;
  history: PricePoint[];
  averagePrice: bigint;
  highestPrice: bigint;
  lowestPrice: bigint;
  lastSalePrice?: bigint;
  lastSaleDate?: number;
}

/**
 * Get price history for an NFT
 */
export async function getNftPriceHistory(
  nftAddress: string,
  isTestnet = false
): Promise<NftPriceHistory> {
  try {
    const baseUrl = isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io";
    
    // Get NFT history from TONAPI
    const response = await fetch(
      `${baseUrl}/v2/nfts/${encodeURIComponent(nftAddress)}/history?limit=50`,
      { headers: { "Content-Type": "application/json" } }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch history");
    }
    
    const data = await response.json();
    const events = data.events || [];
    
    // Extract sale events
    const priceHistory: PricePoint[] = events
      .filter((e: { type: string }) => e.type === "NftPurchase")
      .map((e: { timestamp: number; actions: Array<{ NftPurchase?: { amount?: { value: string } } }> }) => ({
        timestamp: e.timestamp,
        price: BigInt(e.actions?.[0]?.NftPurchase?.amount?.value || "0"),
        type: "sale" as const,
      }));
    
    // Calculate stats
    const prices = priceHistory.map(p => p.price).filter(p => p > BigInt(0));
    const avgPrice = prices.length > 0 
      ? prices.reduce((a, b) => a + b, BigInt(0)) / BigInt(prices.length)
      : BigInt(0);
    const highestPrice = prices.length > 0 ? prices.reduce((a, b) => a > b ? a : b, BigInt(0)) : BigInt(0);
    const lowestPrice = prices.length > 0 ? prices.reduce((a, b) => a < b ? a : b, prices[0]) : BigInt(0);
    
    return {
      nftAddress,
      history: priceHistory,
      averagePrice: avgPrice,
      highestPrice,
      lowestPrice,
      lastSalePrice: priceHistory[0]?.price,
      lastSaleDate: priceHistory[0]?.timestamp,
    };
  } catch (error) {
    console.error("[NFT] Error fetching price history:", error);
    return {
      nftAddress,
      history: [],
      averagePrice: BigInt(0),
      highestPrice: BigInt(0),
      lowestPrice: BigInt(0),
    };
  }
}

// =====================================================
// Rarity Score Calculation
// =====================================================

export interface RarityData {
  rank?: number;
  score: number;
  totalInCollection: number;
  percentile: number; // 0-100, lower is rarer
  attributes: Array<{
    trait: string;
    value: string;
    rarity: number; // percentage of collection with this trait
  }>;
}

/**
 * Calculate rarity score for an NFT based on its attributes
 * Lower score = rarer
 */
export function calculateRarityScore(
  attributes: Array<{ trait_type: string; value: string }>,
  collectionAttributes: Map<string, Map<string, number>>, // trait -> value -> count
  totalItems: number
): RarityData {
  if (!attributes || attributes.length === 0 || totalItems === 0) {
    return {
      score: 0,
      totalInCollection: totalItems,
      percentile: 50,
      attributes: [],
    };
  }
  
  let totalRarityScore = 0;
  const attributeRarities: RarityData["attributes"] = [];
  
  for (const attr of attributes) {
    const traitCounts = collectionAttributes.get(attr.trait_type);
    if (!traitCounts) continue;
    
    const valueCount = traitCounts.get(attr.value) || 1;
    const rarityPercent = (valueCount / totalItems) * 100;
    
    // Use 1/rarity as score component (rarer = higher contribution to score)
    totalRarityScore += 1 / (rarityPercent / 100);
    
    attributeRarities.push({
      trait: attr.trait_type,
      value: attr.value,
      rarity: rarityPercent,
    });
  }
  
  // Normalize score
  const normalizedScore = totalRarityScore / attributes.length;
  
  return {
    score: normalizedScore,
    totalInCollection: totalItems,
    percentile: Math.min(100, Math.max(0, 100 - normalizedScore * 10)),
    attributes: attributeRarities.sort((a, b) => a.rarity - b.rarity), // Rarest first
  };
}
