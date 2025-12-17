"use client";

import { StonApiClient, AssetTag } from "@ston-fi/api";
import { dexFactory } from "@ston-fi/sdk";
import { TonClient } from "@ton/ton";
import { Address } from "@ton/core";

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
        // Fetch assets with liquidity
        const condition = [
            AssetTag.LiquidityVeryHigh,
            AssetTag.LiquidityHigh,
            AssetTag.LiquidityMedium,
        ].join(" | ");

        const assets = await client.queryAssets({ condition });

        return assets.map((asset) => ({
            contractAddress: asset.contractAddress,
            kind: asset.kind === "Ton" ? "Ton" : "Jetton",
            symbol: asset.meta?.symbol || "???",
            displayName: asset.meta?.displayName || asset.meta?.symbol || "Unknown",
            imageUrl: asset.meta?.imageUrl,
            decimals: asset.meta?.decimals ?? 9,
        }));
    } catch (error) {
        console.error("Failed to fetch swappable assets:", error);
        return [];
    }
}

// Simulate a swap
export async function simulateSwap(
    offerAddress: string,
    askAddress: string,
    offerUnits: string,
    slippageTolerance: string = "0.01"
): Promise<SwapSimulation | null> {
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
    } catch (error) {
        console.error("Swap simulation failed:", error);
        return null;
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
        // Create TON client
        const tonClient = new TonClient({
            endpoint: "https://toncenter.com/api/v2/jsonRPC",
        });

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
