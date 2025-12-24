// Graduation Service - Handles token migration from bonding curve to STON.fi DEX
// This creates a liquidity pool when a token reaches its market cap threshold

import { StonApiClient } from "@ston-fi/api";
import { dexFactory } from "@ston-fi/sdk";
import { TonClient } from "@ton/ton";
import { Address } from "@ton/core";

export interface GraduationConfig {
    // Amount of TON to seed the liquidity pool (from collected bonding curve funds)
    tonLiquidity: string;
    // Amount of tokens to pair with TON
    tokenAmount: string;
    // Token jetton master address
    tokenAddress: string;
    // Platform wallet that holds the collected TON
    platformWalletAddress: string;
}

export interface GraduationResult {
    success: boolean;
    poolAddress?: string;
    lpTokenAddress?: string;
    txHash?: string;
    error?: string;
}


/**
 * Simulate liquidity provision to get pool info
 */
export async function simulateLiquidityProvision(
    tokenAddress: string,
    tonAmount: string
): Promise<{
    poolAddress: string;
    estimatedLpTokens: string;
    router: {
        address: string;
        ptonMasterAddress: string;
    };
} | null> {
    try {
        const client = new StonApiClient();

        // Simulate providing liquidity
        // Note: STON.fi API may require specific endpoints for LP simulation
        const simulation = await client.simulateSwap({
            offerAddress: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c", // Native TON
            askAddress: tokenAddress,
            offerUnits: tonAmount,
            slippageTolerance: "0.05",
        });

        return {
            poolAddress: simulation.router.address, // Pool would be created here
            estimatedLpTokens: "0", // Would be calculated
            router: {
                address: simulation.router.address,
                ptonMasterAddress: simulation.router.ptonMasterAddress,
            },
        };
    } catch (error) {
        console.error("LP simulation failed:", error);
        return null;
    }
}

/**
 * Build transaction to provide initial liquidity (creates pool if doesn't exist)
 */
export async function buildProvideLiquidityTx(
    tokenAddress: string,
    tonAmount: string,
    _tokenAmount: string, // Unused but kept for interface consistency
    userWalletAddress: string
): Promise<{
    to: Address;
    value: bigint;
    body: Buffer | null;
} | null> {
    try {
        const tonClient = new TonClient({
            endpoint: "https://toncenter.com/api/v2/jsonRPC",
        });

        // First simulate to get router info
        const client = new StonApiClient();
        const simulation = await client.simulateSwap({
            offerAddress: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
            askAddress: tokenAddress,
            offerUnits: tonAmount,
            slippageTolerance: "0.05",
        });

        // Create DEX contracts from simulation router
        const dexContracts = dexFactory(simulation.router);

        const router = tonClient.open(
            dexContracts.Router.create(simulation.router.address)
        );

        const proxyTon = dexContracts.pTON.create(simulation.router.ptonMasterAddress);

        // Build provide liquidity transaction for TON + Jetton
        // This will create a new pool if one doesn't exist
        const txParams = await router.getProvideLiquidityTonTxParams({
            userWalletAddress,
            sendAmount: tonAmount,
            otherTokenAddress: tokenAddress,
            minLpOut: "1", // Minimum LP tokens to receive
            proxyTon,
        });

        return {
            to: txParams.to,
            value: txParams.value,
            body: txParams.body ? txParams.body.toBoc() : null,
        };
    } catch (error) {
        console.error("Failed to build provide liquidity tx:", error);
        return null;
    }
}

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

/**
 * Get STON.fi pool info for a graduated token
 */
export async function getPoolInfo(tokenAddress: string): Promise<{
    poolAddress: string;
    reserve0: string;
    reserve1: string;
    lpTotalSupply: string;
    token0Price: string;
    token1Price: string;
} | null> {
    try {
        const client = new StonApiClient();

        // Query for pools containing this token paired with TON
        const pools = await client.queryPools({
            condition: `token0Address == "${tokenAddress}" || token1Address == "${tokenAddress}"`,
        });

        if (pools.length === 0) {
            return null;
        }

        // Find the TON pair
        const tonPool = pools.find(p =>
            p.token0Address === "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c" ||
            p.token1Address === "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c"
        );

        if (!tonPool) {
            return null;
        }

        return {
            poolAddress: tonPool.address,
            reserve0: tonPool.reserve0,
            reserve1: tonPool.reserve1,
            lpTotalSupply: tonPool.lpTotalSupply,
            token0Price: tonPool.token0Balance || "0",
            token1Price: tonPool.token1Balance || "0",
        };
    } catch (error) {
        console.error("Failed to get pool info:", error);
        return null;
    }
}

/**
 * Build swap transaction for graduated token (uses STON.fi)
 */
export async function buildGraduatedSwapTx(
    isBuying: boolean,
    tokenAddress: string,
    amount: string,
    minReceived: string,
    userWalletAddress: string
): Promise<{
    to: Address;
    value: bigint;
    body: Buffer | null;
} | null> {
    try {
        const tonClient = new TonClient({
            endpoint: "https://toncenter.com/api/v2/jsonRPC",
        });

        // First simulate to get router info
        const client = new StonApiClient();
        const simulation = await client.simulateSwap({
            offerAddress: isBuying ? "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c" : tokenAddress,
            askAddress: isBuying ? tokenAddress : "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
            offerUnits: amount,
            slippageTolerance: "0.05",
        });

        const dexContracts = dexFactory(simulation.router);

        const router = tonClient.open(
            dexContracts.Router.create(simulation.router.address)
        );

        const proxyTon = dexContracts.pTON.create(simulation.router.ptonMasterAddress);

        let txParams;

        if (isBuying) {
            // TON -> Token (buying tokens with TON)
            txParams = await router.getSwapTonToJettonTxParams({
                userWalletAddress,
                offerAmount: amount,
                minAskAmount: minReceived,
                askJettonAddress: tokenAddress,
                proxyTon,
            });
        } else {
            // Token -> TON (selling tokens for TON)
            txParams = await router.getSwapJettonToTonTxParams({
                userWalletAddress,
                offerJettonAddress: tokenAddress,
                offerAmount: amount,
                minAskAmount: minReceived,
                proxyTon,
            });
        }

        return {
            to: txParams.to,
            value: txParams.value,
            body: txParams.body ? txParams.body.toBoc() : null,
        };
    } catch (error) {
        console.error("Failed to build graduated swap tx:", error);
        return null;
    }
}

/**
 * Get current price of graduated token from STON.fi
 */
export async function getGraduatedTokenPrice(
    tokenAddress: string,
    tonAmount: string = "1000000000" // 1 TON
): Promise<{
    priceInTon: string;
    priceImpact: string;
} | null> {
    try {
        const client = new StonApiClient();

        const simulation = await client.simulateSwap({
            offerAddress: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c", // TON
            askAddress: tokenAddress,
            offerUnits: tonAmount,
            slippageTolerance: "0.01",
        });

        // Calculate price: how many tokens per 1 TON
        const tokensPerTon = parseFloat(simulation.askUnits) / 1e9;
        const priceInTon = 1 / tokensPerTon; // Price of 1 token in TON

        return {
            priceInTon: (priceInTon * 1e9).toString(), // Convert to nanoTON
            priceImpact: simulation.priceImpact,
        };
    } catch (error) {
        console.error("Failed to get graduated token price:", error);
        return null;
    }
}
