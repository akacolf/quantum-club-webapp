// ================================================================
// QC RocketStart - Shared Utilities
// ================================================================
// Common functions used across all contracts
// ================================================================

import "constants"
import "opcodes"

// ----- Slice Comparison -----
@pure
fun equalSlices(a: slice, b: slice): int
    asm "SDEQ";

// ----- Pack Jetton Wallet Data -----
@inline
fun packJettonWalletData(ownerAddress: address, jettonMasterAddress: address, jettonWalletCode: cell): cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(ownerAddress)
        .storeAddress(jettonMasterAddress)
        .storeRef(jettonWalletCode)
        .endCell();
}

// ----- Calculate Jetton Wallet StateInit -----
@inline
fun calculateJettonWalletStateInit(ownerAddress: address, jettonMasterAddress: address, jettonWalletCode: cell): cell {
    return beginCell()
        .storeUint(0, 2)
        .storeDict(jettonWalletCode)
        .storeDict(packJettonWalletData(ownerAddress, jettonMasterAddress, jettonWalletCode))
        .storeUint(0, 1)
        .endCell();
}

// ----- Calculate Address from StateInit -----
@inline
fun calculateJettonWalletAddress(stateInit: cell): address {
    return beginCell()
        .storeUint(4, 3)
        .storeInt(0, 8)
        .storeUint(stateInit.hash(), 256)
        .endCell()
        .beginParse()
        .loadAddress();
}

// ----- Get Jetton Wallet Address for Owner -----
@inline
fun getJettonWalletAddress(ownerAddress: address, jettonMasterAddress: address, jettonWalletCode: cell): address {
    var stateInit: cell = calculateJettonWalletStateInit(ownerAddress, jettonMasterAddress, jettonWalletCode);
    return calculateJettonWalletAddress(stateInit);
}

// ----- Send Message with Reserve -----
@inline
fun sendMsgWithReserve(message: cell, mode: int) {
    reserveToncoinsOnBalance(MIN_TON_FOR_STORAGE, 0);
    sendRawMessage(message, mode);
}

// ----- Send Excesses (Refund) -----
@inline
fun sendExcesses(toAddress: address, queryId: int) {
    var message: cell = beginCell()
        .storeUint(0x10, 6)
        .storeAddress(toAddress)
        .storeCoins(0)
        .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
        .storeUint(OP_EXCESSES, 32)
        .storeUint(queryId, 64)
        .endCell();
    
    // Mode 64: Carry all remaining gas to this message
    // Don't use mode 128 (send all balance) as it conflicts with other outbound messages  
    sendRawMessage(message, 64);
}

// ----- Send Fee Payment -----
@inline
fun sendFee(toAddress: address, amount: int, queryId: int) {
    if (amount > 0) {
        var message: cell = beginCell()
            .storeUint(0x10, 6)
            .storeAddress(toAddress)
            .storeCoins(amount)
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .storeUint(OP_FEE_PAYMENT, 32)
            .storeUint(queryId, 64)
            .endCell();
        
        sendRawMessage(message, 1);
    }
}

// ----- Emit External Log -----
// Emits an external message for indexers to track events
@inline
fun emitLog(logOp: int, user: address, amount: int, price: int) {
    // Build log data
    var log: cell = beginCell()
        .storeUint(logOp, 32)
        .storeUint(blockchain.now(), 64)
        .storeAddress(user)
        .storeCoins(amount)
        .storeCoins(price)
        .endCell();
    
    // Send as external out message with proper format
    // ext_out_msg_info$11 src:MsgAddressInt dest:MsgAddressExt created_lt:uint64 created_at:uint32
    var msg: cell = beginCell()
        .storeUint(3, 2)          // ext_out_msg_info tag (11 in binary = 3)
        .storeAddress(contract.getAddress()) // src: contract address
        .storeUint(0, 2)          // dest: addr_none (00 in binary)
        .storeUint(0, 64 + 32)    // created_lt, created_at (filled by validator)
        .storeUint(0, 1)          // no init
        .storeUint(1, 1)          // body in ref
        .storeRef(log)
        .endCell();
    
    sendRawMessage(msg, 0);
}
