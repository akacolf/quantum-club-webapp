/**
 * Calculate graduation liquidity based on bonding curve state
 * Returns how much TON and tokens should go into the LP
 */
export function calculateGraduationLiquidity(
    collectedTon: string, // Total TON collected from buys
    totalSupply: string,  // Current token supply
    platformFeePercent: number = 2 // Platform takes 2% of collected TON
): {
    tonForLp: string;
    tokensForLp: string;
    platformFee: string;
} {
    const collected = BigInt(collectedTon);

    // Platform fee (2%)
    const platformFee = (collected * BigInt(platformFeePercent)) / BigInt(100);

    // Remaining TON goes to LP
    const tonForLp = collected - platformFee;

    // Use 80% of total supply for LP, 20% remains in circulation
    const supply = BigInt(totalSupply);
    const tokensForLp = (supply * BigInt(80)) / BigInt(100);

    return {
        tonForLp: tonForLp.toString(),
        tokensForLp: tokensForLp.toString(),
        platformFee: platformFee.toString(),
    };
}
