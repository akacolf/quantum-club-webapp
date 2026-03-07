// =============================================================================
// Quantum Club NFT Fixed Price Sale Contract
// =============================================================================
//
// This contract enables in-house NFT trading with only 0.5% marketplace fee
// (compared to Getgems' 5%)
//
// Sale Flow:
// 1. Seller deploys this contract with NFT address, price, and fee settings
// 2. Seller transfers NFT to this contract (NFT ownership changes to sale contract)
// 3. Buyer sends TON >= full_price to this contract
// 4. Contract transfers NFT to buyer, distributes TON to seller/marketplace/royalty
// 5. Contract self-destructs after successful sale
//
// Based on TEP-62 (NFT Standard) and Getgems nft-fixprice-sale-v3 patterns
// =============================================================================

import "imports/nft_opcodes"
import "imports/nft_errors"

// =============================================================================
// Storage Layout
// =============================================================================
//
// Data cell structure:
// - is_complete: 1 bit (0 = active, 1 = sold/cancelled)
// - created_at: 32 bits (unix timestamp)
// - marketplace_address: MsgAddress (QC fee recipient)
// - nft_address: MsgAddress
// - nft_owner_address: MsgAddress (seller, receives payment)
// - full_price: Coins (price buyer pays)
// - ref -> fees_cell:
//   - marketplace_fee_address: MsgAddress
//   - marketplace_fee: Coins (0.5% of price)
//   - royalty_address: MsgAddress (creator)
//   - royalty_amount: Coins (creator royalty)
// =============================================================================

// Gas constants
const min_gas_amount = 50000000    // 0.05 TON
const gas_for_nft_transfer = 50000000  // 0.05 TON for NFT transfer

// Load contract data
@inline
fun loadData(): (int, int, address, address, address, coins, address, coins, address, coins) {
    var ds: slice = contract.getData().beginParse();
    
    var isComplete: int = ds.loadUint(1);
    var createdAt: int = ds.loadUint(32);
    var marketplaceAddress: address = ds.loadAddress();
    var nftAddress: address = ds.loadAddress();
    var nftOwnerAddress: address = ds.loadAddress();
    var fullPrice: coins = ds.loadCoins();
    
    // Load fees from ref
    var fees: slice = ds.loadRef().beginParse();
    var marketplaceFeeAddress: address = fees.loadAddress();
    var marketplaceFee: coins = fees.loadCoins();
    var royaltyAddress: address = fees.loadAddress();
    var royaltyAmount: coins = fees.loadCoins();
    
    return (
        isComplete,
        createdAt,
        marketplaceAddress,
        nftAddress,
        nftOwnerAddress,
        fullPrice,
        marketplaceFeeAddress,
        marketplaceFee,
        royaltyAddress,
        royaltyAmount
    );
}

// Save contract data
@inline
fun saveData(
    isComplete: int,
    createdAt: int,
    marketplaceAddress: address,
    nftAddress: address,
    nftOwnerAddress: address,
    fullPrice: coins,
    marketplaceFeeAddress: address,
    marketplaceFee: coins,
    royaltyAddress: address,
    royaltyAmount: coins
) {
    var feesCell: cell = beginCell()
        .storeAddress(marketplaceFeeAddress)
        .storeCoins(marketplaceFee)
        .storeAddress(royaltyAddress)
        .storeCoins(royaltyAmount)
        .endCell();
    
    contract.setData(
        beginCell()
            .storeUint(isComplete, 1)
            .storeUint(createdAt, 32)
            .storeAddress(marketplaceAddress)
            .storeAddress(nftAddress)
            .storeAddress(nftOwnerAddress)
            .storeCoins(fullPrice)
            .storeRef(feesCell)
            .endCell()
    );
}

// =============================================================================
// Send Functions
// =============================================================================

// Send TON to an address
@inline
fun sendTon(toAddress: address, amount: int, mode: int) {
    if (amount > 0) {
        var msg: cell = beginCell()
            .storeUint(0x10, 6)  // nobounce
            .storeAddress(toAddress)
            .storeCoins(amount)
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .endCell();
        sendRawMessage(msg, mode);
    }
}

// Send TON with comment
@inline
fun sendTonWithComment(toAddress: address, amount: int, comment: slice, mode: int) {
    if (amount > 0) {
        var msg: cell = beginCell()
            .storeUint(0x10, 6)  // nobounce
            .storeAddress(toAddress)
            .storeCoins(amount)
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1)
            .storeUint(1, 1)  // has body
            .storeRef(
                beginCell()
                    .storeUint(0, 32)  // text comment op
                    .storeSlice(comment)
                    .endCell()
            )
            .endCell();
        sendRawMessage(msg, mode);
    }
}

// Transfer NFT to new owner
@inline
fun transferNft(
    nftAddress: address,
    newOwner: address,
    responseDestination: address,
    forwardAmount: int
) {
    var nftTransferBody: cell = beginCell()
        .storeUint(OP_TRANSFER, 32)
        .storeUint(0, 64)  // query_id
        .storeAddress(newOwner)
        .storeAddress(responseDestination)
        .storeUint(0, 1)  // no custom_payload
        .storeCoins(forwardAmount)
        .storeUint(0, 1)  // no forward_payload
        .endCell();
    
    var msg: cell = beginCell()
        .storeUint(0x18, 6)  // bounce
        .storeAddress(nftAddress)
        .storeCoins(gas_for_nft_transfer)
        .storeUint(1, 1 + 4 + 4 + 64 + 32 + 1 + 1)
        .storeRef(nftTransferBody)
        .endCell();
    
    sendRawMessage(msg, 1);  // pay fees separately
}

// =============================================================================
// Buy NFT
// =============================================================================

fun buyNft(
    senderAddress: address,
    msgValue: int,
    isComplete: int,
    createdAt: int,
    marketplaceAddress: address,
    nftAddress: address,
    nftOwnerAddress: address,
    fullPrice: coins,
    marketplaceFeeAddress: address,
    marketplaceFee: coins,
    royaltyAddress: address,
    royaltyAmount: coins
) {
    // Check if sale is active
    assert(!(isComplete)) throw ERROR_ALREADY_SOLD;
    
    // Check sufficient funds
    assert(msgValue >= fullPrice + min_gas_amount) throw ERROR_NOT_ENOUGH_FUNDS;
    
    // Validate fees don't exceed price (prevent integer underflow)
    assert(marketplaceFee + royaltyAmount <= fullPrice) throw ERROR_INVALID_FEES;

    // Calculate seller amount (price - fees)
    var sellerAmount: int = fullPrice - marketplaceFee - royaltyAmount;
    
    // Mark as complete
    saveData(
        1,  // is_complete = true
        createdAt,
        marketplaceAddress,
        nftAddress,
        nftOwnerAddress,
        fullPrice,
        marketplaceFeeAddress,
        marketplaceFee,
        royaltyAddress,
        royaltyAmount
    );
    
    // 1. Transfer NFT to buyer
    transferNft(nftAddress, senderAddress, senderAddress, 1);
    
    // 2. Send marketplace fee
    sendTon(marketplaceFeeAddress, marketplaceFee, 1);
    
    // 3. Send royalty to creator (if any)
    if (royaltyAmount > 0) {
        sendTon(royaltyAddress, royaltyAmount, 1);
    }
    
    // 4. Send remaining to seller (with all remaining balance)
    sendTon(nftOwnerAddress, 0, 128);  // mode 128 = send remaining balance
}

// =============================================================================
// Cancel Sale
// =============================================================================

fun cancelSale(
    senderAddress: address,
    isComplete: int,
    createdAt: int,
    marketplaceAddress: address,
    nftAddress: address,
    nftOwnerAddress: address,
    fullPrice: coins,
    marketplaceFeeAddress: address,
    marketplaceFee: coins,
    royaltyAddress: address,
    royaltyAmount: coins
) {
    // Only seller can cancel (compare by hash)
    assert(senderAddress.bitsEqual(nftOwnerAddress)) throw ERROR_UNAUTHORIZED;
    
    // Check if sale is still active
    assert(!(isComplete)) throw ERROR_ALREADY_SOLD;
    
    // Mark as complete
    saveData(
        1,  // is_complete = true
        createdAt,
        marketplaceAddress,
        nftAddress,
        nftOwnerAddress,
        fullPrice,
        marketplaceFeeAddress,
        marketplaceFee,
        royaltyAddress,
        royaltyAmount
    );
    
    // Return NFT to seller
    transferNft(nftAddress, nftOwnerAddress, nftOwnerAddress, 1);
    
    // Return remaining balance to seller
    sendTon(nftOwnerAddress, 0, 128 + 32);  // 128 = remaining, 32 = destroy if zero
}

// =============================================================================
// Handle NFT Ownership Assigned (when NFT is transferred to this contract)
// =============================================================================

fun onNftReceived(
    senderAddress: address,
    msgValue: int,
    inMsgBody: slice,
    nftAddress: address,
    nftOwnerAddress: address
) {
    // Verify the NFT address matches (compare by hash)
    assert(senderAddress.bitsEqual(nftAddress)) throw ERROR_WRONG_NFT;
    
    // Parse ownership_assigned message
    // int query_id = in_msg_body~load_uint(64);
    // slice prev_owner = in_msg_body~load_msg_addr();
    
    // NFT is now held by this contract, sale is active
    // No action needed, contract is ready for buyers
}

// =============================================================================
// Main Entry Point
// =============================================================================

// in the future, use: fun onInternalMessage(in: InMessage) {
fun onInternalMessage(myBalance: int, msgValue: int, inMsgFull: cell, inMsgBody: slice) {
    // Ignore empty messages
    if (inMsgBody.isEmpty()) {
        return;
    }
    
    // Parse incoming message
    var cs: slice = inMsgFull.beginParse();
    var flags: int = cs.loadUint(4);
    
    // Ignore bounced messages
    if (flags & 1) {
        return;
    }
    
    var senderAddress: address = cs.loadAddress();
    
    // Load contract data
    var (
        isComplete: int,
        createdAt: int,
        marketplaceAddress: address,
        nftAddress: address,
        nftOwnerAddress: address,
        fullPrice: coins,
        marketplaceFeeAddress: address,
        marketplaceFee: coins,
        royaltyAddress: address,
        royaltyAmount: coins
    ) = loadData();
    
    // Parse operation code
    var op: int = inMsgBody.loadUint(32);
    
    // Handle NFT ownership assigned (NFT transferred to this contract)
    if (op == OP_OWNERSHIP_ASSIGNED) {
        onNftReceived(
            senderAddress, msgValue, inMsgBody,
            nftAddress, nftOwnerAddress
        );
        return;
    }
    
    // Handle buy
    if (op == OP_BUY) {
        buyNft(
            senderAddress, msgValue,
            isComplete, createdAt, marketplaceAddress,
            nftAddress, nftOwnerAddress, fullPrice,
            marketplaceFeeAddress, marketplaceFee,
            royaltyAddress, royaltyAmount
        );
        return;
    }
    
    // Handle cancel
    if (op == OP_CANCEL) {
        cancelSale(
            senderAddress,
            isComplete, createdAt, marketplaceAddress,
            nftAddress, nftOwnerAddress, fullPrice,
            marketplaceFeeAddress, marketplaceFee,
            royaltyAddress, royaltyAmount
        );
        return;
    }
    
    // Unknown operation - accept as buy attempt if enough TON sent
    // This allows users to buy by just sending TON without specific op
    if (msgValue >= fullPrice + min_gas_amount) {
        buyNft(
            senderAddress, msgValue,
            isComplete, createdAt, marketplaceAddress,
            nftAddress, nftOwnerAddress, fullPrice,
            marketplaceFeeAddress, marketplaceFee,
            royaltyAddress, royaltyAmount
        );
        return;
    }
    
    // Reject unknown operations with insufficient funds
    throw 0xffff;
}

// =============================================================================
// GET Methods
// =============================================================================

// Get sale data - compatible with Getgems format
get fun get_sale_data(): (int, int, int, address, address, address, coins, address, coins, address, coins) {
    var (
        isComplete: int,
        createdAt: int,
        marketplaceAddress: address,
        nftAddress: address,
        nftOwnerAddress: address,
        fullPrice: coins,
        marketplaceFeeAddress: address,
        marketplaceFee: coins,
        royaltyAddress: address,
        royaltyAmount: coins
    ) = loadData();
    
    // Return: magic, is_complete, created_at, marketplace, nft, owner, price, fee_addr, fee, royalty_addr, royalty
    return (
        0x46495850,  // "FIXP" magic number
        isComplete,
        createdAt,
        marketplaceAddress,
        nftAddress,
        nftOwnerAddress,
        fullPrice,
        marketplaceFeeAddress,
        marketplaceFee,
        royaltyAddress,
        royaltyAmount
    );
}

// Get NFT address
get fun get_nft_address(): address {
    var (_, _, _, nftAddress: address, _, _, _, _, _, _) = loadData();
    return nftAddress;
}

// Get price
get fun get_full_price(): coins {
    var (_, _, _, _, _, fullPrice: coins, _, _, _, _) = loadData();
    return fullPrice;
}

// Get sale status
get fun is_sale_complete(): int {
    var (isComplete: int, _, _, _, _, _, _, _, _, _) = loadData();
    return isComplete;
}

// Get seller address
get fun get_seller_address(): address {
    var (_, _, _, _, nftOwnerAddress: address, _, _, _, _, _) = loadData();
    return nftOwnerAddress;
}
