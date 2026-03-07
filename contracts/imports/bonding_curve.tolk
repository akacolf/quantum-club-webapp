// ================================================================
// QC RocketStart - Bonding Curve Logic
// ================================================================
// Price calculation functions for the linear bonding curve
// 
// Formula: price(supply) = INITIAL_PRICE + (supply * CURVE_SLOPE / MAX_SUPPLY)
// ================================================================

import "constants"

// ----- Get Current Token Price -----
// Returns price in nano-TON per token
@inline
fun getCurrentPrice(currentSupply: int): int {
    return INITIAL_PRICE + mulDivFloor(currentSupply, CURVE_SLOPE, MAX_SUPPLY);
}

// ----- Calculate Tokens for TON Amount (Buy) -----
// Uses spot price for simplicity (linear approximation)
// Returns: token amount (in nano)
@inline
fun calculateBuyPrice(tonAmount: int, currentSupply: int): int {
    var currentPrice: int = INITIAL_PRICE + mulDivFloor(currentSupply, CURVE_SLOPE, MAX_SUPPLY);
    
    // Prevent division by zero or negative prices
    if (currentPrice < INITIAL_PRICE) {
        currentPrice = INITIAL_PRICE;
    }
    
    // tokens = ton_amount / price
    var tokensOut: int = mulDivFloor(tonAmount, ONE_TOKEN, currentPrice);
    return tokensOut;
}

// ----- Calculate TON for Token Amount (Sell) -----
// Uses average price across the sell range for accuracy
// Returns: TON amount (in nano)
@inline
fun calculateSellReturn(tokenAmount: int, currentSupply: int): int {
    // Can't sell more than supply
    if (tokenAmount > currentSupply) {
        tokenAmount = currentSupply;
    }
    
    // Calculate average price across the sell range
    var supplyAfter: int = currentSupply - tokenAmount;
    var avgPrice: int = INITIAL_PRICE + mulDivFloor(supplyAfter + tokenAmount / 2, CURVE_SLOPE, MAX_SUPPLY);
    
    // ton_out = tokens * avg_price
    var tonOut: int = mulDivFloor(tokenAmount, avgPrice, ONE_TOKEN);
    return tonOut;
}

// ----- Calculate Buy with Exact Output -----
// For slippage protection: given desired tokens, how much TON needed?
@inline
fun calculateTonForTokens(tokenAmount: int, currentSupply: int): int {
    // Average price for the range we're buying
    var supplyAfter: int = currentSupply + tokenAmount;
    var avgPrice: int = INITIAL_PRICE + mulDivFloor(currentSupply + tokenAmount / 2, CURVE_SLOPE, MAX_SUPPLY);
    
    var tonNeeded: int = mulDivFloor(tokenAmount, avgPrice, ONE_TOKEN);
    return tonNeeded;
}
