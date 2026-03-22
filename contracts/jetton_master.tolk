// ================================================================
// QC RocketStart - Jetton Master Contract
// ================================================================
// TEP-74 Compliant Jetton Master with Bonding Curve Trading
//
// Features:
// - Automatic bonding curve pricing (linear, integral-based)
// - Buy tokens with TON
// - Sell tokens to get TON back
// - Automatic graduation to DEX at threshold
// - Platform and creator fee collection
// - External logging for indexers
// - Bounce handling for failed mints
// ================================================================

import "imports/opcodes"
import "imports/errors"
import "imports/constants"
import "imports/bonding_curve"
import "imports/utils"

// ================================================================
// Storage
// ================================================================
// total_supply:coins mintable:bool admin:MsgAddr creator:MsgAddr
// content:^Cell wallet_code:^Cell ton_reserve:coins
// graduated:bool graduation_target:coins
// ================================================================

struct Storage {
    totalSupply: coins
    mintable: bool
    adminAddress: address
    creatorAddress: address
    jettonContent: cell
    jettonWalletCode: cell
    tonReserve: coins
    graduated: bool
    graduationTarget: coins
}

fun Storage.load(): Storage {
    return Storage.fromCell(contract.getData());
}

fun Storage.save(self) {
    contract.setData(self.toCell());
}

// ================================================================
// Internal Functions
// ================================================================

@inline
fun mintTokens(
    toAddress: address,
    jettonAmount: int,
    queryId: int,
    forwardTonAmount: int,
    jettonWalletCode: cell,
    totalTonAmount: int
) {
    val stateInit = calculateJettonWalletStateInit(
        toAddress,
        contract.getAddress(),
        jettonWalletCode
    );
    val toWallet = calculateJettonWalletAddress(stateInit);

    val body: cell = beginCell()
        .storeUint(OP_INTERNAL_TRANSFER, 32)
        .storeUint(queryId, 64)
        .storeCoins(jettonAmount)
        .storeAddress(contract.getAddress())
        .storeAddress(toAddress)
        .storeCoins(forwardTonAmount)
        .storeUint(0, 1)
        .endCell();

    val message: cell = beginCell()
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
    var st = Storage.load();

    // Cannot buy after graduation
    assert(!st.graduated) throw ERROR_ALREADY_GRADUATED;

    // Ensure enough TON to cover gas, wallet deployment, and forward fees.
    // Without this, the action phase could fail silently (mint message skipped,
    // state committed but no tokens delivered, no bounce to revert).
    assert(msgValue >= GAS_CONSUMPTION + JETTON_WALLET_DEPLOY_GAS + FORWARD_FEE) throw ERROR_INSUFFICIENT_GAS;

    // Parse slippage protection (optional)
    var minTokensOut = 0;
    if (!inMsgBody.isEmpty()) {
        minTokensOut = inMsgBody.loadCoins();
    }

    // Calculate net amount after gas
    val grossAmount = msgValue - GAS_CONSUMPTION;

    // Calculate platform fee (1.1% - includes referral pool distributed off-chain)
    val platformFee = mulDivFloor(grossAmount, PLATFORM_FEE_BPS, 10000);
    val netAmount = grossAmount - platformFee;

    assert(!(netAmount <= 0)) throw ERROR_ZERO_AMOUNT;

    // Calculate tokens using bonding curve (integral-based)
    val tokensToMint = calculateBuyPrice(netAmount, st.totalSupply);
    assert(!(tokensToMint <= 0)) throw ERROR_ZERO_AMOUNT;

    // Slippage protection
    assert(!((minTokensOut > 0) && (tokensToMint < minTokensOut))) throw ERROR_SLIPPAGE_EXCEEDED;

    // Supply cap check
    assert(!(st.totalSupply + tokensToMint > MAX_SUPPLY)) throw ERROR_INSUFFICIENT_LIQUIDITY;

    // Update state
    st.totalSupply += tokensToMint;
    st.tonReserve += netAmount;

    // Check graduation
    if (st.tonReserve >= st.graduationTarget) {
        st.graduated = true;
    }

    // Reserve minimum contract balance to prevent freezing
    reserveToncoinsOnBalance(MIN_TON_FOR_STORAGE, 0);

    // Save state
    st.save();

    // Send platform fee with +2 (ignore errors) so fee failure doesn't block the buy
    sendFee(st.adminAddress, platformFee, queryId);

    // Mint tokens to buyer
    mintTokens(
        senderAddress,
        tokensToMint,
        queryId,
        FORWARD_FEE,
        st.jettonWalletCode,
        JETTON_WALLET_DEPLOY_GAS
    );

    // Emit external log for indexers (mode 2 = ignore errors)
    emitLog(`log::buy`, senderAddress, tokensToMint, getCurrentPrice(st.totalSupply));
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
    var st = Storage.load();

    // Cannot sell after graduation (trade on DEX instead)
    assert(!st.graduated) throw ERROR_ALREADY_GRADUATED;
    assert(!(jettonAmount <= 0)) throw ERROR_ZERO_AMOUNT;
    assert(!(jettonAmount > st.totalSupply)) throw ERROR_INSUFFICIENT_BALANCE;

    // Calculate TON return using bonding curve
    val grossReturn = calculateSellReturn(jettonAmount, st.totalSupply);
    assert(!(grossReturn > st.tonReserve)) throw ERROR_INSUFFICIENT_LIQUIDITY;

    // Calculate platform fee (1.1% - includes referral pool distributed off-chain)
    val platformFee = mulDivFloor(grossReturn, PLATFORM_FEE_BPS, 10000);
    val netReturn = grossReturn - platformFee;

    // Update state
    st.totalSupply -= jettonAmount;
    st.tonReserve -= grossReturn;

    // Reserve minimum contract balance to prevent freezing
    reserveToncoinsOnBalance(MIN_TON_FOR_STORAGE, 0);

    // Save state
    st.save();

    // Send platform fee with +2 (ignore errors) so fee failure doesn't block the sell
    sendFee(st.adminAddress, platformFee, queryId);

    // Send TON to seller
    val message: cell = beginCell()
        .storeUint(0x10, 6)
        .storeAddress(fromAddress)
        .storeCoins(netReturn)
        .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
        .storeUint(OP_EXCESSES, 32)
        .storeUint(queryId, 64)
        .endCell();

    sendRawMessage(message, 1);

    // Emit external log for indexers
    emitLog(`log::sell`, fromAddress, jettonAmount, getCurrentPrice(st.totalSupply));
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
    var st = Storage.load();

    // Only admin can trigger graduation after threshold is reached
    assert(senderAddress.bitsEqual(st.adminAddress)) throw ERROR_NOT_ADMIN;
    assert(st.graduated) throw ERROR_NOT_GRADUATED;
    assert(st.tonReserve > 0) throw ERROR_INSUFFICIENT_LIQUIDITY;

    // Parse DEX router address
    val dexRouter = inMsgBody.loadAddress();

    // Calculate graduation fee (2%)
    val graduationFee = mulDivFloor(st.tonReserve, GRADUATION_FEE_BPS, 10000);
    val liquidityTon = st.tonReserve - graduationFee;

    // Clear reserve
    st.tonReserve = 0;

    // Reserve minimum contract balance to prevent freezing
    reserveToncoinsOnBalance(MIN_TON_FOR_STORAGE, 0);

    // Save state
    st.save();

    // Send graduation fee to platform
    sendFee(st.adminAddress, graduationFee, queryId);

    // Send liquidity to DEX router (or admin wallet for manual DEX provisioning).
    // Bounceable (0x18) so TON returns to contract on failure (recoverable via OP_WITHDRAW_FEES).
    // No body — plain TON transfer is universally accepted; avoids rejection by
    // routers that throw on unknown ops.
    val message: cell = beginCell()
        .storeUint(0x18, 6)
        .storeAddress(dexRouter)
        .storeCoins(liquidityTon)
        .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
        .endCell();

    sendRawMessage(message, 1);

    // Emit graduation log
    emitLog(`log::graduate`, st.creatorAddress, st.totalSupply, liquidityTon);
}

// ================================================================
// Bounce Handler - Revert state on failed mints
// ================================================================

@inline
fun handleBounce(inMsgBody: slice) {
    // Bounced message body: 0xFFFFFFFF prefix (32 bits) + original op + query_id + data
    if (inMsgBody.remainingBitsCount() < 32) {
        return;
    }
    inMsgBody.skipBits(32); // skip bounce prefix 0xFFFFFFFF

    if (inMsgBody.remainingBitsCount() < 32 + 64) {
        return;
    }
    val bouncedOp = inMsgBody.loadUint(32);
    inMsgBody.skipBits(64); // skip query_id

    // If an internal_transfer (mint) bounced, revert totalSupply AND tonReserve.
    // Without reverting tonReserve, the reserve becomes inflated relative to supply,
    // allowing subsequent sellers to extract more TON than they should.
    if (bouncedOp == OP_INTERNAL_TRANSFER) {
        if (inMsgBody.remainingBitsCount() >= 4) {
            val jettonAmount = inMsgBody.loadCoins();
            var st = Storage.load();

            // Calculate how much TON these tokens represent at the current (post-buy) supply
            val tonToRevert = calculateSellReturn(jettonAmount, st.totalSupply);

            st.totalSupply -= jettonAmount;
            if (tonToRevert > st.tonReserve) {
                st.tonReserve = 0;
            } else {
                st.tonReserve -= tonToRevert;
            }
            st.save();
        }
    }
}

// ================================================================
// Main Entry Point
// ================================================================

fun onInternalMessage(myBalance: int, msgValue: int, inMsgFull: cell, inMsgBody: slice) {
    if (inMsgBody.isEmpty()) {
        return;
    }

    var cs: slice = inMsgFull.beginParse();
    val flags = cs.loadUint(4);

    // Handle bounced messages - revert state on failed mints
    if (flags & 1) {
        handleBounce(inMsgBody);
        return;
    }

    val senderAddress: address = cs.loadAddress();

    val op = inMsgBody.loadUint(32);
    val queryId = inMsgBody.loadUint(64);

    // ----- BUY -----
    if (op == OP_BUY) {
        handleBuy(senderAddress, msgValue, queryId, inMsgBody);
        return;
    }

    // ----- BURN NOTIFICATION (Sell via burn) -----
    if (op == OP_BURN_NOTIFICATION) {
        val jettonAmount = inMsgBody.loadCoins();
        val fromAddress = inMsgBody.loadAddress();

        // Verify sender is the correct jetton wallet
        val st = lazy Storage.load();
        val expectedWallet = getJettonWalletAddress(fromAddress, contract.getAddress(), st.jettonWalletCode);
        assert(senderAddress.bitsEqual(expectedWallet)) throw ERROR_NOT_FROM_WALLET;

        handleSell(senderAddress, queryId, jettonAmount, fromAddress);
        return;
    }

    // ----- TEP-89: Provide Wallet Address (discovery) -----
    if (op == OP_PROVIDE_WALLET_ADDRESS) {
        val ownerAddress = inMsgBody.loadAddress();
        val includeAddress = inMsgBody.loadUint(1);

        val st = lazy Storage.load();
        val walletAddress = getJettonWalletAddress(ownerAddress, contract.getAddress(), st.jettonWalletCode);

        var body = beginCell()
            .storeUint(OP_TAKE_WALLET_ADDRESS, 32)
            .storeUint(queryId, 64)
            .storeAddress(walletAddress);

        if (includeAddress) {
            body = body
                .storeAddress(ownerAddress);
        } else {
            body = body
                .storeUint(0, 2); // addr_none
        }

        val message: cell = beginCell()
            .storeUint(0x10, 6)
            .storeAddress(senderAddress)
            .storeCoins(0)
            .storeUint(1, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .storeRef(body.endCell())
            .endCell();

        sendRawMessage(message, 64);
        return;
    }

    // ----- GRADUATE -----
    if (op == OP_GRADUATE) {
        handleGraduate(senderAddress, queryId, inMsgBody);
        return;
    }

    // ----- ADMIN: Withdraw excess TON (safety recovery) -----
    if (op == OP_WITHDRAW_FEES) {
        val st = lazy Storage.load();
        assert(senderAddress.bitsEqual(st.adminAddress)) throw ERROR_NOT_ADMIN;

        // Reserve the bonding curve TON + minimum storage, send everything else
        val locked = st.tonReserve + MIN_TON_FOR_STORAGE;
        assert(myBalance > locked) throw ERROR_INSUFFICIENT_LIQUIDITY;

        reserveToncoinsOnBalance(locked, 0);

        val message: cell = beginCell()
            .storeUint(0x10, 6)
            .storeAddress(st.adminAddress)
            .storeCoins(0)
            .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
            .storeUint(OP_EXCESSES, 32)
            .storeUint(queryId, 64)
            .endCell();

        sendRawMessage(message, 128);
        return;
    }

    throw ERROR_INVALID_OP;
}

// ================================================================
// GET Methods
// ================================================================

// TEP-74 Standard: Get Jetton Data
get fun get_jetton_data(): (coins, bool, address, cell, cell) {
    val st = Storage.load();
    return (st.totalSupply, st.mintable, st.adminAddress, st.jettonContent, st.jettonWalletCode);
}

// TEP-74 Standard: Get Wallet Address
get fun get_wallet_address(ownerAddress: address): address {
    val st = Storage.load();
    return getJettonWalletAddress(ownerAddress, contract.getAddress(), st.jettonWalletCode);
}

// Custom: Get Bonding Curve Data
get fun get_curve_data(): (int, int, int, bool, int) {
    val st = Storage.load();
    val currentPrice = getCurrentPrice(st.totalSupply);

    return (
        st.totalSupply,
        st.tonReserve,
        currentPrice,
        st.graduated,
        st.graduationTarget
    );
}

// Custom: Preview Buy (for UI)
get fun preview_buy(tonAmount: int): int {
    val st = Storage.load();

    var netAmount = tonAmount - GAS_CONSUMPTION;
    val platformFee = mulDivFloor(netAmount, PLATFORM_FEE_BPS, 10000);
    netAmount -= platformFee;

    return calculateBuyPrice(netAmount, st.totalSupply);
}

// Custom: Preview Sell (for UI)
get fun preview_sell(tokenAmount: int): int {
    val st = Storage.load();

    val grossReturn = calculateSellReturn(tokenAmount, st.totalSupply);
    val platformFee = mulDivFloor(grossReturn, PLATFORM_FEE_BPS, 10000);

    return grossReturn - platformFee;
}
