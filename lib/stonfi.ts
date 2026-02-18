"use client";

import { StonApiClient, AssetTag } from "@ston-fi/api";
import { dexFactory } from "@ston-fi/sdk";
import { Address } from "@ton/core";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";

// Types for swap assets
export interface SwapAsset {
    contractAddress: string;
    kind: "Ton" | "Jetton";
    symbol: string;
    displayName: string;
    imageUrl?: string;
    decimals: number;
    balance?: string;
    balanceUsd?: string;
}

export interface SwapSimulation {
    offerAddress: string;
    askAddress: string;
    offerUnits: string;
    askUnits: string;
    minAskUnits: string;
    swapRate: string;
    priceImpact: string;
    feePercent: string;
    feeUnits: string;
    gasParams: {
        gasBudget?: string;
        forwardGas: string;
        estimatedGasConsumption: string;
    };
    router: {
        address: string;
        ptonMasterAddress: string;
        ptonVersion: string;
        majorVersion: number;
        minorVersion: number;
    };
}

// Create a new API client instance (avoid singleton to prevent IDB connection issues)
export function createStonApiClient(): StonApiClient {
    return new StonApiClient();
}

// Fetch swappable assets from STON.fi
export async function fetchSwappableAssets(): Promise<SwapAsset[]> {
    const client = createStonApiClient();

    try {
        // Fetch assets with good liquidity only
        // Excluding LiquidityLow to avoid high slippage, failed txs, and scam tokens
        const condition = [
            AssetTag.LiquidityVeryHigh,
            AssetTag.LiquidityHigh,
            AssetTag.LiquidityMedium,
        ].join(" | ");

        const assets = await client.queryAssets({ condition });

        // Map and sort by liquidity (TON first, then by symbol alphabetically)
        const mappedAssets = assets.map((asset) => ({
            contractAddress: asset.contractAddress,
            kind: asset.kind === "Ton" ? "Ton" as const : "Jetton" as const,
            symbol: asset.meta?.symbol || "???",
            displayName: asset.meta?.displayName || asset.meta?.symbol || "Unknown",
            imageUrl: asset.meta?.imageUrl,
            decimals: asset.meta?.decimals ?? 9,
        }));

        // Sort: TON first, then by symbol alphabetically
        return mappedAssets.sort((a, b) => {
            if (a.kind === "Ton") return -1;
            if (b.kind === "Ton") return 1;
            return a.symbol.localeCompare(b.symbol);
        });
    } catch (error) {
        console.error("Failed to fetch swappable assets:", error);
        return [];
    }
}

// Custom error class for swap errors
export class SwapError extends Error {
    code: string;

    constructor(message: string, code: string) {
        super(message);
        this.name = "SwapError";
        this.code = code;
    }
}

// Simulate a swap
export async function simulateSwap(
    offerAddress: string,
    askAddress: string,
    offerUnits: string,
    slippageTolerance: string = "0.01",
    referralFeeBps: string = "10" // 0.1% referral fee (matches REFERRAL_FEE_PERCENT in platform-config.ts)
): Promise<SwapSimulation> {
    const client = createStonApiClient();

    try {
        const result = await client.simulateSwap({
            offerAddress,
            askAddress,
            offerUnits,
            slippageTolerance,
            referralFeeBps,
        });

        return {
            offerAddress: result.offerAddress,
            askAddress: result.askAddress,
            offerUnits: result.offerUnits,
            askUnits: result.askUnits,
            minAskUnits: result.minAskUnits,
            swapRate: result.swapRate,
            priceImpact: result.priceImpact,
            feePercent: result.feePercent,
            feeUnits: result.feeUnits,
            gasParams: {
                gasBudget: result.gasParams.gasBudget,
                forwardGas: result.gasParams.forwardGas,
                estimatedGasConsumption: result.gasParams.estimatedGasConsumption,
            },
            router: {
                address: result.router.address,
                ptonMasterAddress: result.router.ptonMasterAddress,
                ptonVersion: result.router.ptonVersion,
                majorVersion: result.router.majorVersion,
                minorVersion: result.router.minorVersion,
            },
        };
    } catch (error: unknown) {
        console.error("Swap simulation failed:", error);

        // Parse error response for more specific messages
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorString = String(error);

        // Check for common error scenarios
        if (errorString.includes("400") || errorMessage.includes("400")) {
            // 400 errors typically mean no route/pool exists or invalid params
            if (errorString.includes("no route") || errorString.includes("pool")) {
                throw new SwapError("No liquidity pool available for this token pair", "NO_POOL");
            }
            // Could be amount related
            throw new SwapError("Cannot swap these tokens. The pair may not have enough liquidity.", "SWAP_UNAVAILABLE");
        }

        if (errorString.includes("429") || errorMessage.includes("rate")) {
            throw new SwapError("Too many requests. Please wait a moment and try again.", "RATE_LIMITED");
        }

        if (errorString.includes("500") || errorString.includes("502") || errorString.includes("503")) {
            throw new SwapError("STON.fi service is temporarily unavailable. Please try again later.", "SERVICE_ERROR");
        }

        // Generic error
        throw new SwapError("Unable to get swap quote. Please try a different amount or token pair.", "SIMULATION_FAILED");
    }
}

// Build swap transaction parameters
// NOTE: Pass original fromAssetAddress and toAssetAddress to ensure correct swap direction,
// as the simulation API may reorder offerAddress/askAddress
export async function buildSwapTxParams(
    simulation: SwapSimulation,
    userWalletAddress: string,
    fromAssetKind: "Ton" | "Jetton",
    toAssetKind: "Ton" | "Jetton",
    fromAssetAddress: string,
    toAssetAddress: string
): Promise<{
    to: Address;
    value: bigint;
    body: Buffer | null;
} | null> {
    try {
        // Use TonAPI for reliable access
        const tonApiClient = new TonApiClient({
            baseUrl: "https://tonapi.io",
        });
        const contractAdapter = new ContractAdapter(tonApiClient);

        // Build DEX contracts from simulation router
        const dexContracts = dexFactory(simulation.router);

        // Open the router contract
        const router = contractAdapter.open(
            dexContracts.Router.create(simulation.router.address)
        );

        // Create proxyTon for TON swaps
        const proxyTon = dexContracts.pTON.create(simulation.router.ptonMasterAddress);

        let txParams;

        if (fromAssetKind === "Ton") {
            // TON -> Jetton
            // Use original toAssetAddress to ensure correct direction
            txParams = await router.getSwapTonToJettonTxParams({
                userWalletAddress,
                offerAmount: simulation.offerUnits,
                minAskAmount: simulation.minAskUnits,
                askJettonAddress: toAssetAddress,
                proxyTon,
            });
        } else if (toAssetKind === "Ton") {
            // Jetton -> TON
            // Use original fromAssetAddress to ensure correct direction
            txParams = await router.getSwapJettonToTonTxParams({
                userWalletAddress,
                offerJettonAddress: fromAssetAddress,
                offerAmount: simulation.offerUnits,
                minAskAmount: simulation.minAskUnits,
                proxyTon,
            });
        } else {
            // Jetton -> Jetton
            // Use original asset addresses to ensure correct direction
            txParams = await router.getSwapJettonToJettonTxParams({
                userWalletAddress,
                offerJettonAddress: fromAssetAddress,
                askJettonAddress: toAssetAddress,
                offerAmount: simulation.offerUnits,
                minAskAmount: simulation.minAskUnits,
            });
        }

        return {
            to: txParams.to,
            value: txParams.value,
            body: txParams.body ? txParams.body.toBoc() : null,
        };
    } catch (error) {
        console.error("Failed to build swap transaction:", error);
        return null;
    }
}

// Convert human-readable amount to blockchain units
export function toUnits(amount: string, decimals: number): string {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return "0";
    // Use BigInt math to avoid floating point precision issues
    const [whole, frac = ""] = amount.split(".");
    const wholePart = BigInt(whole || "0") * BigInt(10 ** decimals);
    const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
    const fracPart = BigInt(fracPadded);
    return (wholePart + fracPart).toString();
}

// Convert blockchain units to human-readable amount
export function fromUnits(units: string, decimals: number): string {
    if (!units || units === "0") return "0";
    try {
        const num = BigInt(units);
        if (num < 0n) return "0";
        const divisor = BigInt(10 ** decimals);
        const whole = num / divisor;
        const fraction = num % divisor;
        const fractionStr = fraction.toString().padStart(decimals, "0");
        // Trim trailing zeros for cleaner display
        return `${whole}.${fractionStr}`.replace(/\.?0+$/, "") || "0";
    } catch {
        return "0";
    }
}

// Format swap rate for display
export function formatSwapRate(
    fromSymbol: string,
    toSymbol: string,
    swapRate: string
): string {
    const rate = parseFloat(swapRate);
    if (rate === 0) return "";
    return `1 ${fromSymbol} = ${rate.toFixed(6)} ${toSymbol}`;
}

// TON native address constant
export const TON_ADDRESS = "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";

// Liquidity provision simulation result type
export interface LiquidityProvisionResult {
    provisionType: "Initial" | "Balanced" | "Arbitrary";
    router: {
        address: string;
        ptonMasterAddress: string;
        ptonVersion: string;
        majorVersion: number;
        minorVersion: number;
    };
    poolAddress: string;
    tokenA: string;
    tokenB: string;
    tokenAUnits: string;
    tokenBUnits: string;
    estimatedLpUnits: string;
    minLpUnits: string;
    minTokenAUnits: string;
    minTokenBUnits: string;
    priceImpact: string;
}

// Build liquidity provision transaction parameters
export async function buildLiquidityTxParams(
    simulation: LiquidityProvisionResult,
    userWalletAddress: string
): Promise<Array<{ to: Address; value: bigint; body: Buffer | null }>> {
    try {
        // Use TonAPI for reliable access
        const tonApiClient = new TonApiClient({
            baseUrl: "https://tonapi.io",
        });
        const contractAdapter = new ContractAdapter(tonApiClient);

        const dexContracts = dexFactory(simulation.router);
        const router = contractAdapter.open(
            dexContracts.Router.create(simulation.router.address)
        );
        const proxyTon = dexContracts.pTON.create(simulation.router.ptonMasterAddress);

        const isSingleSide =
            simulation.provisionType === "Arbitrary" &&
            (simulation.tokenAUnits === "0" || simulation.tokenBUnits === "0");

        const results: Array<{ to: Address; value: bigint; body: Buffer | null }> = [];

        // Build transaction for Token A if amount > 0
        if (simulation.tokenAUnits !== "0" && BigInt(simulation.tokenAUnits) > BigInt(0)) {
            const txParams = await buildSingleLpTx(
                router,
                proxyTon,
                userWalletAddress,
                simulation.tokenA,
                simulation.tokenB,
                simulation.tokenAUnits,
                simulation.minLpUnits,
                isSingleSide
            );
            results.push({
                to: txParams.to,
                value: txParams.value,
                body: txParams.body ? txParams.body.toBoc() : null,
            });
        }

        // Build transaction for Token B if amount > 0
        if (simulation.tokenBUnits !== "0" && BigInt(simulation.tokenBUnits) > BigInt(0)) {
            const txParams = await buildSingleLpTx(
                router,
                proxyTon,
                userWalletAddress,
                simulation.tokenB,
                simulation.tokenA,
                simulation.tokenBUnits,
                simulation.minLpUnits,
                isSingleSide
            );
            results.push({
                to: txParams.to,
                value: txParams.value,
                body: txParams.body ? txParams.body.toBoc() : null,
            });
        }

        return results;
    } catch (error) {
        console.error("Failed to build liquidity transaction:", error);
        return [];
    }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function buildSingleLpTx(
    router: any,
    proxyTon: any,
    userWalletAddress: string,
    sendToken: string,
    otherToken: string,
    sendAmount: string,
    minLpOut: string,
    isSingleSide: boolean
) {
/* eslint-enable @typescript-eslint/no-explicit-any */
    const baseArgs = {
        userWalletAddress,
        sendAmount,
        minLpOut,
    };

    if (sendToken === TON_ADDRESS) {
        const args = {
            ...baseArgs,
            proxyTon,
            otherTokenAddress: otherToken === TON_ADDRESS
                ? proxyTon.address.toString()
                : otherToken,
        };

        if (isSingleSide && "getSingleSideProvideLiquidityTonTxParams" in router) {
            return router.getSingleSideProvideLiquidityTonTxParams(args);
        }
        return router.getProvideLiquidityTonTxParams(args);
    }

    const args = {
        ...baseArgs,
        sendTokenAddress: sendToken,
        otherTokenAddress: otherToken === TON_ADDRESS
            ? proxyTon.address.toString()
            : otherToken,
    };

    if (isSingleSide && "getSingleSideProvideLiquidityJettonTxParams" in router) {
        return router.getSingleSideProvideLiquidityJettonTxParams(args);
    }
    return router.getProvideLiquidityJettonTxParams(args);
}

// Burn LP tokens parameters
export interface BurnLpParams {
    poolAddress: string;
    lpBalance: string;
    userWalletAddress: string;
}

// Build burn LP transaction parameters
export async function buildBurnLpTxParams(
    params: BurnLpParams
): Promise<{ to: Address; value: bigint; body: Buffer | null } | null> {
    try {
        const apiClient = createStonApiClient();
        
        // Get pool info to retrieve router metadata
        const poolInfo = await apiClient.getPool(params.poolAddress);
        if (!poolInfo) {
            throw new Error("Pool not found");
        }

        // Get router metadata for dexFactory
        const routerMetadata = await apiClient.getRouter(poolInfo.routerAddress);
        if (!routerMetadata) {
            throw new Error("Router metadata not found");
        }

        // Use TonAPI for reliable access
        const tonApiClient = new TonApiClient({
            baseUrl: "https://tonapi.io",
        });
        const contractAdapter = new ContractAdapter(tonApiClient);

        // Build DEX contracts from router metadata
        const dexContracts = dexFactory(routerMetadata);

        // Open the pool contract
        const pool = contractAdapter.open(
            dexContracts.Pool.create(params.poolAddress)
        );

        // Get LP wallet for user
        const lpWallet = contractAdapter.open(
            await pool.getJettonWallet({ ownerAddress: params.userWalletAddress })
        );

        // Get current LP balance if not provided (use from param or fetch)
        let burnAmount = params.lpBalance;
        if (!burnAmount || burnAmount === "0") {
            const walletData = await lpWallet.getWalletData();
            burnAmount = walletData.balance.toString();
        }

        // Build burn transaction
        // responseAddress: where excess gas is returned
        // userWalletAddress: the user's wallet address initiating the burn
        const txParams = await pool.getBurnTxParams({
            amount: burnAmount,
            userWalletAddress: params.userWalletAddress,
            responseAddress: params.userWalletAddress, // Same as user wallet for gas refund
            queryId: Date.now(), // Use timestamp as unique query ID
        });

        return {
            to: txParams.to,
            value: txParams.value,
            body: txParams.body ? txParams.body.toBoc() : null,
        };
    } catch (error) {
        console.error("Failed to build burn LP transaction:", error);
        return null;
    }
}
