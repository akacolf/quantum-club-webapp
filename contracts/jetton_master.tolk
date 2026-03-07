// ================================================================
// QC RocketStart - Jetton Master Contract
// ================================================================
// TEP-74 Compliant Jetton Master with Bonding Curve Trading
// 
// Features:
// - Automatic bonding curve pricing (linear)
// - Buy tokens with TON
// - Sell tokens to get TON back
// - Automatic graduation to DEX at threshold
// - Platform and creator fee collection
// - External logging for indexers
// ================================================================

import "imports/opcodes"
import "imports/errors"
import "imports/constants"
import "imports/bonding_curve"
import "imports/utils"

// ================================================================
// Storage
// ================================================================
// total_supply:coins mintable:int1 admin:MsgAddr creator:MsgAddr
// content:^Cell wallet_code:^Cell ton_reserve:coins 
// graduated:int1 graduation_target:coins
// ================================================================

@inline
fun loadData(): (coins, int, address, address, cell, cell, coins, int, coins) {
    var ds: slice = contract.getData().beginParse();
    return (
        ds.loadCoins(),      // total_supply
        ds.loadInt(1),       // mintable
        ds.loadAddress(),   // admin_address
        ds.loadAddress(),   // creator_address
        ds.loadRef(),        // jetton_content
        ds.loadRef(),        // jetton_wallet_code
        ds.loadCoins(),      // ton_reserve
        ds.loadInt(1),       // graduated
        ds.loadCoins()       // graduation_target
    );
}

@inline
fun saveData(
    totalSupply: coins,
    mintable: int,
    adminAddress: address,
    creatorAddress: address,
    jettonContent: cell,
    jettonWalletCode: cell,
    tonReserve: coins,
    graduated: int,
    graduationTarget: coins
) {
    contract.setData(beginCell()
        .storeCoins(totalSupply)
        .storeInt(mintable, 1)
        .storeAddress(adminAddress)
        .storeAddress(creatorAddress)
        .storeRef(jettonContent)
        .storeRef(jettonWalletCode)
        .storeCoins(tonReserve)
        .storeInt(graduated, 1)
        .storeCoins(graduationTarget)
        .endCell()
    );
}

// ================================================================
// Internal Functions
// ================================================================

@inline
fun mintTokens(
    toAddress: address,
    jettonAmount: int,
    forwardTonAmount: int,
    jettonWalletCode: cell,
    totalTonAmount: int
) {
    var stateInit: cell = calculateJettonWalletStateInit(
        toAddress, 
        contract.getAddress(), 
        jettonWalletCode
    );
    var toWallet: address = calculateJettonWalletAddress(stateInit);
    
    var body: cell = beginCell()
        .storeUint(OP_INTERNAL_TRANSFER, 32)
        .storeUint(0, 64)
        .storeCoins(jettonAmount)
        .storeAddress(contract.getAddress())
        .storeAddress(toAddress)
        .storeCoins(forwardTonAmount)
        .storeUint(0, 1)
        .endCell();
    
    var message: cell = beginCell()
        .storeUint(0x18, 6)
        .storeAddress(toWallet)
        .storeCoins(totalTonAmount)
        .storeUint(4 + 2 + 1, 1 + 4 + 4 + 64 + 32 + 1 + 1 + 1)
        .storeRef(stateInit)
        .storeRef(body)
        .endCell();
    
    sendRawMessage(message, 1);
}

// ================================================================
// Buy Handler - Purchase tokens with TON
// ================================================================

@inline
fun handleBuy(
    senderAddress: address,
    msgValue: int,
    queryId: int,
    inMsgBody: slice
) {
    var (
        totalSupply: coins,
        mintable: int,
        adminAddress: address,
        creatorAddress: address,
        jettonContent: cell,
        jettonWalletCode: cell,
        tonReserve: coins,
        graduated: int,
        graduationTarget: coins
    ) = loadData();
    
    // Cannot buy after graduation
    assert(!(graduated)) throw ERROR_ALREADY_GRADUATED;
    
    // Parse slippage protection (optional)
    var minTokensOut: int = 0;
    if (!inMsgBody.isEmpty()) {
        minTokensOut = inMsgBody.loadCoins();
    }
    
    // Calculate net amount after gas
    var grossAmount: int = msgValue - GAS_CONSUMPTION;
    assert(!(grossAmount <= 0)) throw ERROR_INSUFFICIENT_GAS;
    
    // Calculate platform fee (1.1% - includes referral pool distributed off-chain)
    var platformFee: int = mulDivFloor(grossAmount, PLATFORM_FEE_BPS, 10000);
    var netAmount: int = grossAmount - platformFee;
    
    assert(!(netAmount <= 0)) throw ERROR_ZERO_AMOUNT;
    
    // Calculate tokens using bonding curve
    var tokensToMint: int = calculateBuyPrice(netAmount, totalSupply);
    assert(!(tokensToMint <= 0)) throw ERROR_ZERO_AMOUNT;
    
    // Slippage protection
    assert(!((minTokensOut > 0) & (tokensToMint < minTokensOut))) throw ERROR_SLIPPAGE_EXCEEDED;
    
    // Supply cap check
    assert(!(totalSupply + tokensToMint > MAX_SUPPLY)) throw ERROR_INSUFFICIENT_LIQUIDITY;
    
    // Update state
    totalSupply += tokensToMint;
    tonReserve += netAmount;
    
    // Check graduation
    if (tonReserve >= graduationTarget) {
        graduated = 1;
    }
    
    // Save state
    saveData(
        totalSupply, mintable, adminAddress, creatorAddress,
        jettonContent, jettonWalletCode, tonReserve,
        graduated, graduationTarget
    );
    
    // Send platform fee (referral distribution happens off-chain)
    sendFee(adminAddress, platformFee, queryId);
    
    // Mint tokens to buyer
    mintTokens(
        senderAddress,
        tokensToMint,
        FORWARD_FEE,
        jettonWalletCode,
        JETTON_WALLET_DEPLOY_GAS
    );
    
    // Emit external log for indexers
    emitLog(`log::buy`, senderAddress, tokensToMint, getCurrentPrice(totalSupply));
}

// ================================================================
// Sell Handler - Burn tokens to get TON back
// ================================================================

@inline
fun handleSell(
    senderAddress: address,
    queryId: int,
    jettonAmount: int,
    fromAddress: address
) {
    var (
        totalSupply: coins,
        mintable: int,
        adminAddress: address,
        creatorAddress: address,
        jettonContent: cell,
        jettonWalletCode: cell,
        tonReserve: coins,
        graduated: int,
        graduationTarget: coins
    ) = loadData();
    
    // Cannot sell after graduation (trade on DEX instead)
    assert(!(graduated)) throw ERROR_ALREADY_GRADUATED;
    assert(!(jettonAmount <= 0)) throw ERROR_ZERO_AMOUNT;
    assert(!(jettonAmount > totalSupply)) throw ERROR_INSUFFICIENT_BALANCE;
    
    // Calculate TON return using bonding curve
    var grossReturn: int = calculateSellReturn(jettonAmount, totalSupply);
    assert(!(grossReturn > tonReserve)) throw ERROR_INSUFFICIENT_LIQUIDITY;
    
    // Calculate platform fee (1.1% - includes referral pool distributed off-chain)
    var platformFee: int = mulDivFloor(grossReturn, PLATFORM_FEE_BPS, 10000);
    var netReturn: int = grossReturn - platformFee;
    
    // Update state
    totalSupply -= jettonAmount;
    tonReserve -= grossReturn;
    
    // Save state
    saveData(
        totalSupply, mintable, adminAddress, creatorAddress,
        jettonContent, jettonWalletCode, tonReserve,
        graduated, graduationTarget
    );
    
    // Send platform fee (referral distribution happens off-chain)
    sendFee(adminAddress, platformFee, queryId);
    
    // Send TON to seller
    var message: cell = beginCell()
        .storeUint(0x10, 6)
        .storeAddress(fromAddress)
        .storeCoins(netReturn)
        .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
        .storeUint(OP_EXCESSES, 32)
        .storeUint(queryId, 64)
        .endCell();
    
    sendRawMessage(message, 1);
    
    // Emit external log for indexers
    emitLog(`log::sell`, fromAddress, jettonAmount, getCurrentPrice(totalSupply));
}

// ================================================================
// Graduation Handler - Migrate to DEX
// ================================================================

@inline
fun handleGraduate(
    senderAddress: address,
    queryId: int,
    inMsgBody: slice
) {
    var (
        totalSupply: coins, mintable: int, adminAddress: address, creatorAddress: address,
        jettonContent: cell, jettonWalletCode: cell, tonReserve: coins,
        graduated: int, graduationTarget: coins
    ) = loadData();
    
    // Only admin can trigger graduation
    assert(senderAddress.bitsEqual(adminAddress)) throw ERROR_NOT_ADMIN;
    assert(!(graduated)) throw ERROR_ALREADY_GRADUATED;
    assert(tonReserve >= graduationTarget) throw ERROR_INSUFFICIENT_LIQUIDITY;
    
    // Parse DEX router address
    var dexRouter: address = inMsgBody.loadAddress();
    
    // Mark as graduated
    graduated = 1;
    
    // Calculate graduation fee (2%)
    var graduationFee: int = mulDivFloor(tonReserve, GRADUATION_FEE_BPS, 10000);
    var liquidityTon: int = tonReserve - graduationFee;
    
    // Clear reserve
    tonReserve = 0;
    
    // Save state
    saveData(
        totalSupply, mintable, adminAddress, creatorAddress,
        jettonContent, jettonWalletCode, tonReserve,
        graduated, graduationTarget
    );
    
    // Send graduation fee to platform
    sendFee(adminAddress, graduationFee, queryId);
    
    // Send liquidity to DEX router
    var message: cell = beginCell()
        .storeUint(0x10, 6)
        .storeAddress(dexRouter)
        .storeCoins(liquidityTon)
        .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
        .storeUint(`log::graduate`, 32)
        .storeUint(queryId, 64)
        .endCell();
    
    sendRawMessage(message, 1);
    
    // Emit graduation log
    emitLog(`log::graduate`, creatorAddress, totalSupply, liquidityTon);
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
    cs.skipBits(1);      // skip ihr_disabled
    cs.loadCoins();      // skip ihr_fee
    cs.loadCoins();      // skip fwd_fee
    
    var op: int = inMsgBody.loadUint(32);
    var queryId: int = inMsgBody.loadUint(64);
    
    // ----- BUY -----
    if (op == OP_BUY) {
        handleBuy(senderAddress, msgValue, queryId, inMsgBody);
        return;
    }
    
    // ----- BURN NOTIFICATION (Sell via burn) -----
    if (op == OP_BURN_NOTIFICATION) {
        var jettonAmount: int = inMsgBody.loadCoins();
        var fromAddress: address = inMsgBody.loadAddress();
        
        // Verify sender is the correct jetton wallet
        var (_, _, _, _, _, jettonWalletCode: cell, _, _, _) = loadData();
        var expectedWallet: address = getJettonWalletAddress(fromAddress, contract.getAddress(), jettonWalletCode);
        assert(senderAddress.bitsEqual(expectedWallet)) throw ERROR_NOT_FROM_WALLET;
        
        handleSell(senderAddress, queryId, jettonAmount, fromAddress);
        return;
    }
    
    // ----- SELL NOTIFICATION (Alternative sell path) -----
    if (op == OP_SELL_NOTIFICATION) {
        var jettonAmount: int = inMsgBody.loadCoins();
        var fromAddress: address = inMsgBody.loadAddress();
        
        var (_, _, _, _, _, jettonWalletCode: cell, _, _, _) = loadData();
        var expectedWallet: address = getJettonWalletAddress(fromAddress, contract.getAddress(), jettonWalletCode);
        assert(senderAddress.bitsEqual(expectedWallet)) throw ERROR_NOT_FROM_WALLET;
        
        handleSell(senderAddress, queryId, jettonAmount, fromAddress);
        return;
    }
    
    // ----- GRADUATE -----
    if (op == OP_GRADUATE) {
        handleGraduate(senderAddress, queryId, inMsgBody);
        return;
    }
    
    // ----- ADMIN: Mint (for initial distribution) -----
    if (op == OP_MINT) {
        var (_, _, adminAddress: address, _, _, _, _, _, _) = loadData();
        assert(senderAddress.bitsEqual(adminAddress)) throw ERROR_NOT_ADMIN;
        
        // Admin minting logic here if needed
        return;
    }
    
    throw ERROR_INVALID_OP;
}

// ================================================================
// GET Methods
// ================================================================

// TEP-74 Standard: Get Jetton Data
get fun get_jetton_data(): (coins, int, address, cell, cell) {
    var (
        totalSupply: coins, mintable: int, _, creatorAddress: address,
        jettonContent: cell, jettonWalletCode: cell, _, _, _
    ) = loadData();
    
    return (totalSupply, mintable, creatorAddress, jettonContent, jettonWalletCode);
}

// TEP-74 Standard: Get Wallet Address
get fun get_wallet_address(ownerAddress: address): address {
    var (_, _, _, _, _, jettonWalletCode: cell, _, _, _) = loadData();
    return getJettonWalletAddress(ownerAddress, contract.getAddress(), jettonWalletCode);
}

// Custom: Get Bonding Curve Data
get fun get_curve_data(): (int, int, int, int, int) {
    var (
        totalSupply: coins, _, _, _,
        _, _, tonReserve: coins,
        graduated: int, graduationTarget: coins
    ) = loadData();
    
    var currentPrice: int = getCurrentPrice(totalSupply);
    
    return (
        totalSupply,
        tonReserve,
        currentPrice,
        graduated,
        graduationTarget
    );
}

// Custom: Preview Buy (for UI)
get fun preview_buy(tonAmount: int): int {
    var (totalSupply: coins, _, _, _, _, _, _, _, _) = loadData();
    
    var netAmount: int = tonAmount - GAS_CONSUMPTION;
    var platformFee: int = mulDivFloor(netAmount, PLATFORM_FEE_BPS, 10000);
    netAmount -= platformFee;
    
    return calculateBuyPrice(netAmount, totalSupply);
}

// Custom: Preview Sell (for UI)
get fun preview_sell(tokenAmount: int): int {
    var (totalSupply: coins, _, _, _, _, _, _, _, _) = loadData();
    
    var grossReturn: int = calculateSellReturn(tokenAmount, totalSupply);
    var platformFee: int = mulDivFloor(grossReturn, PLATFORM_FEE_BPS, 10000);
    
    return grossReturn - platformFee;
}
