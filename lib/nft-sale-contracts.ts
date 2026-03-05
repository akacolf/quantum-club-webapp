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

import { beginCell, Cell, Address, toNano, contractAddress, storeStateInit } from "@ton/core";
import { TonApiClient } from "@ton-api/client";
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
