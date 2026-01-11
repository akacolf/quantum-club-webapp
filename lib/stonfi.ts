"use client";

import { StonApiClient, AssetTag } from "@ston-fi/api";
import { dexFactory } from "@ston-fi/sdk";
import { TonClient } from "@ton/ton";
import { Address } from "@ton/core";
import { getSafeHttpEndpoint } from "@/lib/ton-api";

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
    slippageTolerance: string = "0.01"
): Promise<SwapSimulation> {
    const client = createStonApiClient();

    try {
        const result = await client.simulateSwap({
            offerAddress,
            askAddress,
            offerUnits,
            slippageTolerance,
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
        // Use Orbs Network for rate-limit-free access (with fallback)
        const orbsEndpoint = await getSafeHttpEndpoint("mainnet");
        const tonClient = new TonClient({ endpoint: orbsEndpoint });

        // Build DEX contracts from simulation router
        const dexContracts = dexFactory(simulation.router);

        // Open the router contract
        const router = tonClient.open(
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
    const num = parseFloat(amount) || 0;
    const units = Math.floor(num * Math.pow(10, decimals));
    return units.toString();
}

// Convert blockchain units to human-readable amount
export function fromUnits(units: string, decimals: number): string {
    const num = BigInt(units);
    const divisor = BigInt(Math.pow(10, decimals));
    const whole = num / divisor;
    const fraction = num % divisor;
    const fractionStr = fraction.toString().padStart(decimals, "0");
    return `${whole}.${fractionStr}`;
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
