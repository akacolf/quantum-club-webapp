// Bonding Curve Calculations
// Implements exponential bonding curve: price = basePrice * e^(supply * k)

import {
    BondingCurveParams,
    DEFAULT_BONDING_CURVE,
    PLATFORM_FEES
} from "@/types/trading";

/**
 * Calculate the price for buying tokens using exponential bonding curve
 * Price = basePrice * e^(supply * steepness)
 * 
 * For buying, we integrate from currentSupply to currentSupply + buyAmount
 * to get the total cost
 */
export function calculateBuyPrice(
    currentSupply: bigint,
    buyAmount: bigint,
    params: BondingCurveParams = DEFAULT_BONDING_CURVE
): {
    totalCost: bigint; // Total TON needed
    averagePrice: bigint; // Average price per token
    newPrice: bigint; // Price after purchase
    fee: bigint; // Platform + creator fee
} {
    const basePrice = parseFloat(params.basePrice) || 0.00001;
    const k = params.steepness || 0.0000001;
    const virtualReserve = parseFloat(params.virtualReserve) || 30;

    // Convert to numbers for calculation (using nano precision)
    const supply = Number(currentSupply);
    const amount = Number(buyAmount);
    const newSupply = supply + amount;

    // Safe BigInt conversion helper
    const safeToBigInt = (value: number): bigint => {
        if (!Number.isFinite(value) || Number.isNaN(value)) {
            return BigInt(0);
        }
        // Clamp to safe integer range
        const clamped = Math.min(Math.max(Math.floor(value), Number.MIN_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
        return BigInt(clamped);
    };

    // Calculate total cost using integration of exponential curve
    // ∫ basePrice * e^(kx) dx from supply to newSupply
    // = (basePrice / k) * (e^(k * newSupply) - e^(k * supply))
    const integralNew = Math.exp(k * newSupply);
    const integralOld = Math.exp(k * supply);

    // Total cost = (basePrice / k) * (e^(k*newSupply) - e^(k*supply))
    // Using virtualReserve to smooth the curve
    const denominator = supply + virtualReserve * 1e6;
    const costMultiplier = (basePrice / k) * (integralNew - integralOld);
    const totalCostTon = denominator > 0 ? costMultiplier * (1 + virtualReserve / denominator) : costMultiplier;

    // Convert to nanoTON (9 decimals) with safety check
    const totalCostNano = safeToBigInt(totalCostTon * 1e9);

    // Calculate average price
    const avgPriceNano = buyAmount > BigInt(0) ? totalCostNano / buyAmount : BigInt(0);

    // New price after purchase
    const newPriceFloat = basePrice * Math.exp(k * newSupply);
    const newPriceNano = safeToBigInt(newPriceFloat * 1e9);

    // Calculate fee
    const feePercent = PLATFORM_FEES.tradingFeePercent / 100;
    const feeNano = safeToBigInt(Number(totalCostNano) * feePercent);

    return {
        totalCost: totalCostNano + feeNano,
        averagePrice: avgPriceNano,
        newPrice: newPriceNano,
        fee: feeNano,
    };
}

/**
 * Calculate the proceeds from selling tokens
 * Uses the same exponential curve but in reverse
 */
export function calculateSellPrice(
    currentSupply: bigint,
    sellAmount: bigint,
    params: BondingCurveParams = DEFAULT_BONDING_CURVE
): {
    totalProceeds: bigint; // Total TON received
    averagePrice: bigint; // Average price per token
    newPrice: bigint; // Price after sale
    fee: bigint; // Platform + creator fee deducted
} {
    const basePrice = parseFloat(params.basePrice) || 0.00001;
    const k = params.steepness || 0.0000001;
    const virtualReserve = parseFloat(params.virtualReserve) || 30;

    // Safe BigInt conversion helper
    const safeToBigInt = (value: number): bigint => {
        if (!Number.isFinite(value) || Number.isNaN(value)) {
            return BigInt(0);
        }
        const clamped = Math.min(Math.max(Math.floor(value), Number.MIN_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
        return BigInt(clamped);
    };

    const supply = Number(currentSupply);
    const amount = Number(sellAmount);
    const newSupply = Math.max(0, supply - amount);

    // Calculate proceeds using integration
    const integralOld = Math.exp(k * supply);
    const integralNew = Math.exp(k * newSupply);

    const denominator = newSupply + virtualReserve * 1e6;
    const proceedsMultiplier = (basePrice / k) * (integralOld - integralNew);
    const totalProceedsTon = denominator > 0 ? proceedsMultiplier * (1 + virtualReserve / denominator) : proceedsMultiplier;

    // Convert to nanoTON with safety check
    const totalProceedsNano = safeToBigInt(totalProceedsTon * 1e9);

    // Calculate fee
    const feePercent = PLATFORM_FEES.tradingFeePercent / 100;
    const feeNano = safeToBigInt(Number(totalProceedsNano) * feePercent);

    // Net proceeds after fee
    const netProceedsNano = totalProceedsNano > feeNano ? totalProceedsNano - feeNano : BigInt(0);

    // Average price
    const avgPriceNano = sellAmount > BigInt(0) ? netProceedsNano / sellAmount : BigInt(0);

    // New price after sale
    const newPriceFloat = basePrice * Math.exp(k * newSupply);
    const newPriceNano = safeToBigInt(newPriceFloat * 1e9);

    return {
        totalProceeds: netProceedsNano,
        averagePrice: avgPriceNano,
        newPrice: newPriceNano,
        fee: feeNano,
    };
}

/**
 * Get current token price based on supply
 */
export function getCurrentPrice(
    currentSupply: bigint,
    params: BondingCurveParams = DEFAULT_BONDING_CURVE
): bigint {
    const basePrice = parseFloat(params.basePrice) || 0.00001;
    const k = params.steepness || 0.0000001;
    const supply = Number(currentSupply);

    const priceFloat = basePrice * Math.exp(k * supply);

    // Safe conversion
    if (!Number.isFinite(priceFloat) || Number.isNaN(priceFloat)) {
        return BigInt(0);
    }
    const clamped = Math.min(Math.max(Math.floor(priceFloat * 1e9), 0), Number.MAX_SAFE_INTEGER);
    return BigInt(clamped);
}

/**
 * Calculate market cap based on current supply and price
 */
export function calculateMarketCap(
    currentSupply: bigint,
    currentPriceNano: bigint
): bigint {
    // Market cap = supply * current price
    return (currentSupply * currentPriceNano) / BigInt(1e9);
}

/**
 * Calculate how many tokens you get for a given TON amount
 */
export function calculateTokensForTon(
    currentSupply: bigint,
    tonAmountNano: bigint,
    params: BondingCurveParams = DEFAULT_BONDING_CURVE
): bigint {
    // Binary search to find the token amount
    let low = BigInt(0);
    let high = tonAmountNano * BigInt(1000000); // Start high

    while (high - low > BigInt(1)) {
        const mid = (low + high) / BigInt(2);
        const { totalCost } = calculateBuyPrice(currentSupply, mid, params);

        if (totalCost <= tonAmountNano) {
            low = mid;
        } else {
            high = mid;
        }
    }

    return low;
}

/**
 * Format price for display (in TON)
 */
export function formatPrice(priceNano: bigint): string {
    const price = Number(priceNano) / 1e9;

    // Handle zero or very small values
    if (price === 0 || !Number.isFinite(price)) {
        return "0.00";
    }

    if (price < 0.00001) {
        // For very small prices, show with subscript notation or just more decimals
        if (price < 0.0000001) {
            return "< 0.0000001";
        }
        return price.toFixed(8);
    } else if (price < 0.01) {
        return price.toFixed(6);
    } else if (price < 1) {
        return price.toFixed(4);
    } else {
        return price.toFixed(2);
    }
}

/**
 * Format any number in compact form (K, M, B)
 */
export function formatCompactNumber(value: number, decimals: number = 1): string {
    if (value < 1000) {
        return value.toFixed(decimals);
    } else if (value < 1000000) {
        return `${(value / 1000).toFixed(decimals)}K`;
    } else if (value < 1000000000) {
        return `${(value / 1000000).toFixed(decimals)}M`;
    } else {
        return `${(value / 1000000000).toFixed(decimals)}B`;
    }
}

/**
 * Format market cap for display
 */
export function formatMarketCap(marketCapTon: bigint, tonPriceUsd: number): string {
    const mcUsd = (Number(marketCapTon) / 1e9) * tonPriceUsd;

    if (mcUsd < 1000) {
        return `$${mcUsd.toFixed(2)}`;
    } else if (mcUsd < 1000000) {
        return `$${(mcUsd / 1000).toFixed(1)}K`;
    } else if (mcUsd < 1000000000) {
        return `$${(mcUsd / 1000000).toFixed(2)}M`;
    } else {
        return `$${(mcUsd / 1000000000).toFixed(2)}B`;
    }
}

/**
 * Check if token has reached graduation threshold
 */
export function hasReachedGraduation(
    marketCapTon: bigint,
    tonPriceUsd: number,
    thresholdUsd: string
): boolean {
    const mcUsd = (Number(marketCapTon) / 1e9) * tonPriceUsd;
    return mcUsd >= parseFloat(thresholdUsd);
}
