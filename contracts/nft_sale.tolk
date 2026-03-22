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

// Gas constants
const min_gas_amount = 50000000       // 0.05 TON
const gas_for_nft_transfer = 50000000 // 0.05 TON for NFT transfer

// Fees data stored as a ref cell
struct FeesData {
    marketplaceFeeAddress: address
    marketplaceFee: coins
    royaltyAddress: address
    royaltyAmount: coins
}

// Main contract storage
struct Storage {
    isComplete: bool
    createdAt: uint32
    marketplaceAddress: address
    nftAddress: address
    nftOwnerAddress: address
    fullPrice: coins
    fees: Cell<FeesData>
    nftReceived: bool
}

fun Storage.load(): Storage {
    return Storage.fromCell(contract.getData());
}

fun Storage.save(self) {
    contract.setData(self.toCell());
}

// =============================================================================
// Send Functions
// =============================================================================

// Send TON to an address
// Note: mode 128 overrides the amount field with remaining balance,
// so we must NOT skip when amount is 0 and mode includes 128.
@inline
fun sendTon(toAddress: address, amount: int, mode: int) {
    if ((amount > 0) || (mode & 128)) {
        val msg: cell = beginCell()
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
        val msg: cell = beginCell()
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
    val nftTransferBody: cell = beginCell()
        .storeUint(OP_TRANSFER, 32)
        .storeUint(0, 64)  // query_id
        .storeAddress(newOwner)
        .storeAddress(responseDestination)
        .storeUint(0, 1)  // no custom_payload
        .storeCoins(forwardAmount)
        .storeUint(0, 1)  // no forward_payload
        .endCell();

    val msg: cell = beginCell()
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
    mutate st: Storage
) {
    val fees = FeesData.fromCell(st.fees);

    // Check if sale is active
    assert(!st.isComplete) throw ERROR_ALREADY_SOLD;

    // Check that NFT has been deposited
    assert(st.nftReceived) throw ERROR_WRONG_NFT;

    // Check sufficient funds
    assert(msgValue >= st.fullPrice + min_gas_amount) throw ERROR_NOT_ENOUGH_FUNDS;

    // Validate fees don't exceed price (prevent integer underflow)
    assert(fees.marketplaceFee + fees.royaltyAmount <= st.fullPrice) throw ERROR_INVALID_FEES;

    // Calculate seller amount (price - fees)
    val sellerAmount: int = st.fullPrice - fees.marketplaceFee - fees.royaltyAmount;

    // Mark as complete
    st.isComplete = true;
    st.save();

    // 1. Transfer NFT to buyer
    transferNft(st.nftAddress, senderAddress, senderAddress, 1);

    // 2. Send marketplace fee
    sendTon(fees.marketplaceFeeAddress, fees.marketplaceFee, 1);

    // 3. Send royalty to creator (if any)
    if (fees.royaltyAmount > 0) {
        sendTon(fees.royaltyAddress, fees.royaltyAmount, 1);
    }

    // 4. Send remaining to seller (with all remaining balance) and self-destruct
    sendTon(st.nftOwnerAddress, 0, 128 + 32);  // mode 128 = remaining balance, +32 = destroy if zero
}

// =============================================================================
// Cancel Sale
// =============================================================================

fun cancelSale(
    senderAddress: address,
    mutate st: Storage
) {
    // Only seller can cancel (compare by hash)
    assert(senderAddress.bitsEqual(st.nftOwnerAddress)) throw ERROR_UNAUTHORIZED;

    // Check if sale is still active
    assert(!st.isComplete) throw ERROR_ALREADY_SOLD;

    // Mark as complete
    st.isComplete = true;
    st.save();

    // Return NFT to seller
    transferNft(st.nftAddress, st.nftOwnerAddress, st.nftOwnerAddress, 1);

    // Return remaining balance to seller
    sendTon(st.nftOwnerAddress, 0, 128 + 32);  // 128 = remaining, 32 = destroy if zero
}

// =============================================================================
// Handle NFT Ownership Assigned (when NFT is transferred to this contract)
// =============================================================================

fun onNftReceived(
    senderAddress: address,
    nftAddress: address,
    mutate st: Storage
) {
    // Verify the NFT address matches (compare by hash)
    assert(senderAddress.bitsEqual(nftAddress)) throw ERROR_WRONG_NFT;

    // Mark NFT as received - sale is now active for buyers
    st.nftReceived = true;
    st.save();
}

// =============================================================================
// Main Entry Point
// =============================================================================

fun onInternalMessage(in: InMessage) {
    // Ignore empty messages
    if (in.body.isEmpty()) {
        return;
    }

    // Bounced messages are auto-filtered with InMessage
    // (no need for manual bounce flag check)

    val senderAddress: address = in.senderAddress;
    val msgValue: int = in.valueCoins;

    var st = Storage.load();

    // Parse operation code
    val op: int = in.body.loadUint(32);

    // Handle NFT ownership assigned (NFT transferred to this contract)
    if (op == OP_OWNERSHIP_ASSIGNED) {
        onNftReceived(senderAddress, st.nftAddress, mutate st);
        return;
    }

    // Handle buy
    if (op == OP_BUY) {
        buyNft(senderAddress, msgValue, mutate st);
        return;
    }

    // Handle cancel
    if (op == OP_CANCEL) {
        cancelSale(senderAddress, mutate st);
        return;
    }

    // Unknown operation - accept as buy attempt if enough TON sent and NFT deposited
    // This allows users to buy by just sending TON without specific op
    if (st.nftReceived && (msgValue >= st.fullPrice + min_gas_amount)) {
        buyNft(senderAddress, msgValue, mutate st);
        return;
    }

    // Reject unknown operations with insufficient funds
    throw 0xffff;
}

// =============================================================================
// GET Methods
// =============================================================================

// Get sale data - compatible with Getgems format
get fun get_sale_data(): (int, bool, uint32, address, address, address, coins, address, coins, address, coins) {
    val st = Storage.load();
    val fees = FeesData.fromCell(st.fees);

    // Return: magic, is_complete, created_at, marketplace, nft, owner, price, fee_addr, fee, royalty_addr, royalty
    return (
        0x46495850,  // "FIXP" magic number
        st.isComplete,
        st.createdAt,
        st.marketplaceAddress,
        st.nftAddress,
        st.nftOwnerAddress,
        st.fullPrice,
        fees.marketplaceFeeAddress,
        fees.marketplaceFee,
        fees.royaltyAddress,
        fees.royaltyAmount
    );
}

// Get NFT address
get fun get_nft_address(): address {
    val st = Storage.load();
    return st.nftAddress;
}

// Get price
get fun get_full_price(): coins {
    val st = Storage.load();
    return st.fullPrice;
}

// Get sale status
get fun is_sale_complete(): bool {
    val st = Storage.load();
    return st.isComplete;
}

// Get seller address
get fun get_seller_address(): address {
    val st = Storage.load();
    return st.nftOwnerAddress;
}
