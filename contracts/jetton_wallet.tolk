// ================================================================
// QC RocketStart - Jetton Wallet Contract
// ================================================================
// TEP-74 Compliant Jetton Wallet
//
// Features:
// - Standard jetton transfers
// - Token burning (for sells)
// - Transfer notifications
// ================================================================

import "imports/opcodes"
import "imports/errors"
import "imports/constants"
import "imports/utils"

// ================================================================
// Storage
// ================================================================
// balance:coins owner:MsgAddr master:MsgAddr wallet_code:^Cell
// ================================================================

struct Storage {
    balance: coins
    ownerAddress: address
    jettonMasterAddress: address
    jettonWalletCode: cell
}

fun Storage.load(): Storage {
    return Storage.fromCell(contract.getData());
}

fun Storage.save(self) {
    contract.setData(self.toCell());
}

// ================================================================
// Send Tokens to Another Wallet
// ================================================================

@inline
fun sendTokens(
    toAddress: address,
    jettonMasterAddress: address,
    jettonWalletCode: cell,
    jettonAmount: int,
    queryId: int,
    responseAddress: address,
    forwardTonAmount: int,
    forwardPayload: cell?,
    msgValue: int
) {
    val stateInit = calculateJettonWalletStateInit(
        toAddress,
        jettonMasterAddress,
        jettonWalletCode
    );
    val toWallet = calculateJettonWalletAddress(stateInit);

    var body: cell = beginCell()
        .storeUint(OP_INTERNAL_TRANSFER, 32)
        .storeUint(queryId, 64)
        .storeCoins(jettonAmount)
        .storeAddress(contract.getAddress())
        .storeAddress(responseAddress)
        .storeCoins(forwardTonAmount)
        .storeUint(0, 1)
        .endCell();

    if (forwardPayload != null) {
        body = beginCell()
            .storeUint(OP_INTERNAL_TRANSFER, 32)
            .storeUint(queryId, 64)
            .storeCoins(jettonAmount)
            .storeAddress(contract.getAddress())
            .storeAddress(responseAddress)
            .storeCoins(forwardTonAmount)
            .storeUint(1, 1)
            .storeRef(forwardPayload)
            .endCell();
    }

    val message: cell = beginCell()
        .storeUint(0x18, 6)
        .storeAddress(toWallet)
        .storeCoins(msgValue)
        .storeUint(4 + 2 + 1, 1 + 4 + 4 + 64 + 32 + 1 + 1 + 1)
        .storeRef(stateInit)
        .storeRef(body)
        .endCell();

    sendRawMessage(message, 64);
}

// ================================================================
// Transfer Handler
// ================================================================

@inline
fun handleTransfer(
    senderAddress: address,
    msgValue: int,
    queryId: int,
    inMsgBody: slice
) {
    var st = Storage.load();

    // Only owner can transfer
    assert(senderAddress.bitsEqual(st.ownerAddress)) throw ERROR_NOT_OWNER;

    val jettonAmount = inMsgBody.loadCoins();
    val toAddress = inMsgBody.loadAddress();
    val responseAddress = inMsgBody.loadAddress();
    // custom_payload: Maybe ^Cell — skip the flag and the ref cell if present
    val hasCustomPayload = inMsgBody.loadUint(1);
    if (hasCustomPayload) {
        inMsgBody.loadRef(); // skip the custom_payload cell
    }
    val forwardTonAmount = inMsgBody.loadCoins();

    // Calculate gas needed
    var fwdCount = 1;
    if (forwardTonAmount > 0) {
        fwdCount = 2;
    }

    assert(msgValue > fwdCount * FORWARD_FEE + GAS_CONSUMPTION) throw ERROR_INSUFFICIENT_GAS;
    assert(st.balance >= jettonAmount) throw ERROR_INSUFFICIENT_BALANCE;

    // Parse optional forward payload
    var forwardPayload: cell? = null;
    if (inMsgBody.loadUint(1)) {
        forwardPayload = inMsgBody.loadRef();
    }

    // Update balance
    st.balance -= jettonAmount;
    st.save();

    // Send tokens
    sendTokens(
        toAddress,
        st.jettonMasterAddress,
        st.jettonWalletCode,
        jettonAmount,
        queryId,
        responseAddress,
        forwardTonAmount,
        forwardPayload,
        msgValue - GAS_CONSUMPTION
    );
}

// ================================================================
// Internal Transfer Handler (Receiving tokens)
// ================================================================

@inline
fun handleInternalTransfer(
    senderAddress: address,
    myBalance: int,
    msgValue: int,
    fwdFee: int,
    queryId: int,
    inMsgBody: slice
) {
    // NOTE: we can not allow fails in action phase since in that case there will be
    // no bounce. Thus check and throw in computation phase.
    var st = Storage.load();

    val jettonAmount = inMsgBody.loadCoins();
    val fromAddress: address = inMsgBody.loadAddress();
    val responseAddress: any_address = inMsgBody.loadAddressAny();
    val forwardTonAmount = inMsgBody.loadCoins();

    // Verify sender is master or valid wallet
    val isMaster: bool = senderAddress.bitsEqual(st.jettonMasterAddress);
    if (!isMaster) {
        val expectedWallet = getJettonWalletAddress(fromAddress, st.jettonMasterAddress, st.jettonWalletCode);
        assert(senderAddress.bitsEqual(expectedWallet)) throw ERROR_NOT_VALID_WALLET;
    }

    // Credit tokens first
    st.balance += jettonAmount;

    // Calculate available TON after storage and gas
    val tonBalanceBeforeMsg = myBalance - msgValue;
    val storageFee = MIN_TON_WALLET_STORAGE - min(tonBalanceBeforeMsg, MIN_TON_WALLET_STORAGE);
    var remainingValue = msgValue - (storageFee + GAS_CONSUMPTION);

    // Send transfer notification if requested
    if (forwardTonAmount > 0) {
        remainingValue -= (forwardTonAmount + fwdFee);
        val eitherForwardPayload: slice = inMsgBody;

        // Build notification body
        val msgBody: cell = beginCell()
            .storeUint(OP_TRANSFER_NOTIFICATION, 32)
            .storeUint(queryId, 64)
            .storeCoins(jettonAmount)
            .storeAddress(fromAddress)
            .storeSlice(eitherForwardPayload)
            .endCell();

        // Build message to owner (non-bounceable)
        val message: cell = beginCell()
            .storeUint(0x10, 6)
            .storeAddress(st.ownerAddress)
            .storeCoins(forwardTonAmount)
            .storeUint(1, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .storeRef(msgBody)
            .endCell();

        sendRawMessage(message, 1);
    }

    // Send excesses back if there's remaining value and valid response address
    if ((!responseAddress.isNone()) && (remainingValue > 0)) {
        val message: cell = beginCell()
            .storeUint(0x10, 6)
            .storeAddressAny(responseAddress)
            .storeCoins(remainingValue)
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .storeUint(OP_EXCESSES, 32)
            .storeUint(queryId, 64)
            .endCell();

        sendRawMessage(message, 2);
    }

    st.save();
}

// ================================================================
// Burn Handler (For selling tokens)
// ================================================================

@inline
fun handleBurn(
    senderAddress: address,
    msgValue: int,
    queryId: int,
    inMsgBody: slice
) {
    var st = Storage.load();

    // Only owner can burn
    assert(senderAddress.bitsEqual(st.ownerAddress)) throw ERROR_NOT_OWNER;

    val jettonAmount = inMsgBody.loadCoins();
    val responseAddress = inMsgBody.loadAddress();

    assert(st.balance >= jettonAmount) throw ERROR_INSUFFICIENT_BALANCE;
    assert(msgValue > GAS_CONSUMPTION + FORWARD_FEE) throw ERROR_INSUFFICIENT_GAS;

    // Deduct tokens
    st.balance -= jettonAmount;
    st.save();

    // Notify master (triggers sell)
    val body: cell = beginCell()
        .storeUint(OP_BURN_NOTIFICATION, 32)
        .storeUint(queryId, 64)
        .storeCoins(jettonAmount)
        .storeAddress(st.ownerAddress)
        .storeAddress(responseAddress)
        .endCell();

    val message: cell = beginCell()
        .storeUint(0x18, 6)
        .storeAddress(st.jettonMasterAddress)
        .storeCoins(msgValue - GAS_CONSUMPTION)
        .storeUint(1, 1 + 4 + 4 + 64 + 32 + 1 + 1)
        .storeRef(body)
        .endCell();

    sendRawMessage(message, 64);
}

// ================================================================
// Main Entry Point
// ================================================================
// Uses old-style signature because InMessage doesn't expose fwdFee
// or contractBalance, which are needed for internal transfer handling.

fun onInternalMessage(myBalance: int, msgValue: int, inMsgFull: cell, inMsgBody: slice) {
    if (inMsgBody.isEmpty()) {
        return;
    }

    var cs: slice = inMsgFull.beginParse();
    val flags = cs.loadUint(4);

    // Handle bounced messages - restore balance on failed transfers
    if (flags & 1) {
        // Bounced message body starts with 0xFFFFFFFF prefix (32 bits)
        // followed by the original op (32 bits) and query_id (64 bits)
        if (inMsgBody.remainingBitsCount() < 32) {
            return; // Too short to parse
        }
        inMsgBody.skipBits(32); // skip bounce prefix 0xFFFFFFFF

        if (inMsgBody.remainingBitsCount() < 32 + 64) {
            return; // Too short to contain op + query_id
        }
        val bouncedOp = inMsgBody.loadUint(32);
        inMsgBody.skipBits(64); // skip query_id

        // Restore balance on failed internal_transfer (outgoing tokens bounced back)
        if (bouncedOp == OP_INTERNAL_TRANSFER) {
            if (inMsgBody.remainingBitsCount() >= 4) { // coins need at least a few bits
                val jettonAmount = inMsgBody.loadCoins();
                var st = Storage.load();
                st.balance += jettonAmount;
                st.save();
            }
        }

        // Restore balance on failed burn_notification (burn bounced back from master)
        if (bouncedOp == OP_BURN_NOTIFICATION) {
            if (inMsgBody.remainingBitsCount() >= 4) {
                val jettonAmount = inMsgBody.loadCoins();
                var st = Storage.load();
                st.balance += jettonAmount;
                st.save();
            }
        }

        return;
    }

    val senderAddress: address = cs.loadAddress();
    cs.loadAddress();   // skip dst
    cs.loadCoins();     // skip value
    cs.skipBits(1);     // skip extracurrency collection
    cs.loadCoins();     // skip ihr_fee
    // We use message fwd_fee for estimation of forward_payload costs
    val fwdFee = mulDivFloor(cs.loadCoins(), 3, 2);

    val op = inMsgBody.loadUint(32);
    val queryId = inMsgBody.loadUint(64);

    // ----- TRANSFER -----
    if (op == OP_TRANSFER) {
        handleTransfer(senderAddress, msgValue, queryId, inMsgBody);
        return;
    }

    // ----- INTERNAL TRANSFER (Receive) -----
    if (op == OP_INTERNAL_TRANSFER) {
        handleInternalTransfer(senderAddress, myBalance, msgValue, fwdFee, queryId, inMsgBody);
        return;
    }

    // ----- BURN -----
    if (op == OP_BURN) {
        handleBurn(senderAddress, msgValue, queryId, inMsgBody);
        return;
    }

    throw ERROR_INVALID_OP;
}

// ================================================================
// GET Methods
// ================================================================

// TEP-74 Standard: Get Wallet Data
get fun get_wallet_data(): (coins, address, address, cell) {
    val st = Storage.load();
    return (st.balance, st.ownerAddress, st.jettonMasterAddress, st.jettonWalletCode);
}
