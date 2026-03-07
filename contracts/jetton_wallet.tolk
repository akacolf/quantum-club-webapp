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

@inline
fun loadData(): (coins, address, address, cell) {
    var ds: slice = contract.getData().beginParse();
    return (
        ds.loadCoins(),      // balance
        ds.loadAddress(),   // owner_address
        ds.loadAddress(),   // jetton_master_address
        ds.loadRef()         // jetton_wallet_code
    );
}

@inline
fun saveData(balance: coins, ownerAddress: address, jettonMasterAddress: address, jettonWalletCode: cell) {
    contract.setData(beginCell()
        .storeCoins(balance)
        .storeAddress(ownerAddress)
        .storeAddress(jettonMasterAddress)
        .storeRef(jettonWalletCode)
        .endCell()
    );
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
    responseAddress: address,
    forwardTonAmount: int,
    forwardPayload: cell?,
    msgValue: int
) {
    var stateInit: cell = calculateJettonWalletStateInit(
        toAddress,
        jettonMasterAddress,
        jettonWalletCode
    );
    var toWallet: address = calculateJettonWalletAddress(stateInit);
    
    var body: cell = beginCell()
        .storeUint(OP_INTERNAL_TRANSFER, 32)
        .storeUint(0, 64)
        .storeCoins(jettonAmount)
        .storeAddress(contract.getAddress())
        .storeAddress(responseAddress)
        .storeCoins(forwardTonAmount)
        .storeUint(0, 1)
        .endCell();
    
    if (forwardPayload != null) {
        body = beginCell()
            .storeUint(OP_INTERNAL_TRANSFER, 32)
            .storeUint(0, 64)
            .storeCoins(jettonAmount)
            .storeAddress(contract.getAddress())
            .storeAddress(responseAddress)
            .storeCoins(forwardTonAmount)
            .storeUint(1, 1)
            .storeRef(forwardPayload)
            .endCell();
    }
    
    var message: cell = beginCell()
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
    var (balance: coins, ownerAddress: address, jettonMasterAddress: address, jettonWalletCode: cell) = loadData();
    
    // Only owner can transfer
    assert(senderAddress.bitsEqual(ownerAddress)) throw ERROR_NOT_OWNER;
    
    var jettonAmount: int = inMsgBody.loadCoins();
    var toAddress: address = inMsgBody.loadAddress();
    var responseAddress: address = inMsgBody.loadAddress();
    inMsgBody.skipBits(1);  // skip custom_payload flag
    var forwardTonAmount: int = inMsgBody.loadCoins();
    
    // Calculate gas needed
    var fwdCount: int = 1;
    if (forwardTonAmount > 0) {
        fwdCount = 2;
    }
    
    assert(msgValue > fwdCount * FORWARD_FEE + GAS_CONSUMPTION) throw ERROR_INSUFFICIENT_GAS;
    assert(balance >= jettonAmount) throw ERROR_INSUFFICIENT_BALANCE;
    
    // Parse optional forward payload
    var forwardPayload: cell? = null;
    if (inMsgBody.loadUint(1)) {
        forwardPayload = inMsgBody.loadRef();
    }
    
    // Update balance
    balance -= jettonAmount;
    saveData(balance, ownerAddress, jettonMasterAddress, jettonWalletCode);
    
    // Send tokens
    sendTokens(
        toAddress,
        jettonMasterAddress,
        jettonWalletCode,
        jettonAmount,
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
    var (balance: coins, ownerAddress: address, jettonMasterAddress: address, jettonWalletCode: cell) = loadData();
    
    var jettonAmount: int = inMsgBody.loadCoins();
    var fromAddress: address = inMsgBody.loadAddress();
    var responseAddress: any_address = inMsgBody.loadAddressAny();
    var forwardTonAmount: int = inMsgBody.loadCoins();

    // Verify sender is master or valid wallet
    var isMaster: bool = senderAddress.bitsEqual(jettonMasterAddress);
    if (!isMaster) {
        var expectedWallet: address = getJettonWalletAddress(fromAddress, jettonMasterAddress, jettonWalletCode);
        assert(senderAddress.bitsEqual(expectedWallet)) throw ERROR_NOT_VALID_WALLET;
    }
    
    // Credit tokens first
    balance += jettonAmount;
    
    // Calculate available TON after storage and gas
    var tonBalanceBeforeMsg: int = myBalance - msgValue;
    var storageFee: int = MIN_TON_WALLET_STORAGE - min(tonBalanceBeforeMsg, MIN_TON_WALLET_STORAGE);
    msgValue -= (storageFee + GAS_CONSUMPTION);
    
    // Send transfer notification if requested
    if (forwardTonAmount > 0) {
        msgValue -= (forwardTonAmount + fwdFee);
        var eitherForwardPayload: slice = inMsgBody;
        
        // Build notification body
        var msgBody: cell = beginCell()
            .storeUint(OP_TRANSFER_NOTIFICATION, 32)
            .storeUint(queryId, 64)
            .storeCoins(jettonAmount)
            .storeAddress(fromAddress)
            .storeSlice(eitherForwardPayload)
            .endCell();
        
        // Build message to owner (non-bounceable)
        var message: cell = beginCell()
            .storeUint(0x10, 6)           // nobounce - int_msg_info$0 ihr_disabled:Bool bounce:Bool bounced:Bool src:MsgAddress -> 010000
            .storeAddress(ownerAddress)    // dest
            .storeCoins(forwardTonAmount)  // value
            .storeUint(1, 1 + 4 + 4 + 64 + 32 + 1 + 1)  // body in ref
            .storeRef(msgBody)
            .endCell();
        
        sendRawMessage(message, 1);  // mode 1: pay fees from contract balance
    }
    
    // Send excesses back if there's remaining value and valid response address
    if ((!responseAddress.isNone()) & (msgValue > 0)) {
        var message: cell = beginCell()
            .storeUint(0x10, 6)           // nobounce
            .storeAddressAny(responseAddress)
            .storeCoins(msgValue)        // send remaining value
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .storeUint(OP_EXCESSES, 32)
            .storeUint(queryId, 64)
            .endCell();
        
        sendRawMessage(message, 2);  // mode 2: ignore errors (ok if this fails)
    }
    
    saveData(balance, ownerAddress, jettonMasterAddress, jettonWalletCode);
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
    var (balance: coins, ownerAddress: address, jettonMasterAddress: address, jettonWalletCode: cell) = loadData();
    
    // Only owner can burn
    assert(senderAddress.bitsEqual(ownerAddress)) throw ERROR_NOT_OWNER;
    
    var jettonAmount: int = inMsgBody.loadCoins();
    var responseAddress: address = inMsgBody.loadAddress();
    
    assert(balance >= jettonAmount) throw ERROR_INSUFFICIENT_BALANCE;
    assert(msgValue > GAS_CONSUMPTION + FORWARD_FEE) throw ERROR_INSUFFICIENT_GAS;
    
    // Deduct tokens
    balance -= jettonAmount;
    saveData(balance, ownerAddress, jettonMasterAddress, jettonWalletCode);
    
    // Notify master (triggers sell)
    var body: cell = beginCell()
        .storeUint(OP_BURN_NOTIFICATION, 32)
        .storeUint(queryId, 64)
        .storeCoins(jettonAmount)
        .storeAddress(ownerAddress)
        .storeAddress(responseAddress)
        .endCell();
    
    var message: cell = beginCell()
        .storeUint(0x18, 6)
        .storeAddress(jettonMasterAddress)
        .storeCoins(msgValue - GAS_CONSUMPTION)
        .storeUint(1, 1 + 4 + 4 + 64 + 32 + 1 + 1)
        .storeRef(body)
        .endCell();
    
    sendRawMessage(message, 64);
}

// ================================================================
// Main Entry Point
// ================================================================

// in the future, use: fun onInternalMessage(in: InMessage) {
fun onInternalMessage(myBalance: int, msgValue: int, inMsgFull: cell, inMsgBody: slice) {
    if (inMsgBody.isEmpty()) {
        return;
    }
    
    var cs: slice = inMsgFull.beginParse();
    var flags: int = cs.loadUint(4);
    
    // Ignore bounced messages
    if (flags & 1) {
        return;
    }
    
    var senderAddress: address = cs.loadAddress();
    cs.loadAddress();   // skip dst
    cs.loadCoins();      // skip value
    cs.skipBits(1);      // skip extracurrency collection
    cs.loadCoins();      // skip ihr_fee
    // We use message fwd_fee for estimation of forward_payload costs
    var fwdFee: int = mulDivFloor(cs.loadCoins(), 3, 2);
    
    var op: int = inMsgBody.loadUint(32);
    var queryId: int = inMsgBody.loadUint(64);
    
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
    return loadData();
}
