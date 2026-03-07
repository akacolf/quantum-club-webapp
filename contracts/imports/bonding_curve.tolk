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
// Uses integral (average price) across the buy range for accuracy and
// symmetry with calculateSellReturn. This prevents arbitrage from
// buy/sell price asymmetry.
//
// We solve: tonAmount = integral of price(s) ds from currentSupply to currentSupply+tokens
// For linear curve price(s) = INITIAL_PRICE + s * CURVE_SLOPE / MAX_SUPPLY:
//   tonAmount = tokens * (INITIAL_PRICE + (currentSupply + tokens/2) * CURVE_SLOPE / MAX_SUPPLY)
//   tonAmount = tokens * avgPrice
//   tokens = tonAmount / avgPrice
//
// Since tokens appears on both sides, we use an iterative approach:
// First estimate with spot price, then refine with the average price of that range.
// Returns: token amount (in nano)
@inline
fun calculateBuyPrice(tonAmount: int, currentSupply: int): int {
    var currentPrice: int = INITIAL_PRICE + mulDivFloor(currentSupply, CURVE_SLOPE, MAX_SUPPLY);

    // Prevent division by zero or negative prices
    if (currentPrice < INITIAL_PRICE) {
        currentPrice = INITIAL_PRICE;
    }

    // Initial estimate using spot price
    var tokensEstimate: int = mulDivFloor(tonAmount, ONE_TOKEN, currentPrice);

    if (tokensEstimate <= 0) {
        return 0;
    }

    // Refine: calculate average price over the estimated range and re-derive tokens
    // avgPrice = INITIAL_PRICE + (currentSupply + tokensEstimate/2) * CURVE_SLOPE / MAX_SUPPLY
    var avgPrice: int = INITIAL_PRICE + mulDivFloor(currentSupply + tokensEstimate / 2, CURVE_SLOPE, MAX_SUPPLY);
    if (avgPrice < INITIAL_PRICE) {
        avgPrice = INITIAL_PRICE;
    }

    var tokensOut: int = mulDivFloor(tonAmount, ONE_TOKEN, avgPrice);

    // Second refinement pass for better accuracy
    avgPrice = INITIAL_PRICE + mulDivFloor(currentSupply + tokensOut / 2, CURVE_SLOPE, MAX_SUPPLY);
    if (avgPrice < INITIAL_PRICE) {
        avgPrice = INITIAL_PRICE;
    }
    tokensOut = mulDivFloor(tonAmount, ONE_TOKEN, avgPrice);

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
