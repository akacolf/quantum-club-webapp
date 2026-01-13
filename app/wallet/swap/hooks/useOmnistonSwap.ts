"use client";

import { useCallback, useState, useMemo } from "react";
import { 
    useOmniston, 
    useConnectionStatus,
    useRfq,
    Blockchain,
    SettlementMethod,
    GaslessSettlement,
    type QuoteRequest,
    type Quote,
} from "@ston-fi/omniston-sdk-react";
import { Address as TonAddress } from "@ton/core";

export interface OmnistonAsset {
    address: string;
    blockchain: number;
    kind: "Ton" | "Jetton";
    symbol: string;
    displayName: string;
    imageUrl?: string;
    decimals: number;
}

export interface QuoteParams {
    fromAsset: OmnistonAsset;
    toAsset: OmnistonAsset;
    amount: string; // In base units (nanotons for TON)
    slippageBps?: number; // Slippage in basis points (e.g., 100 = 1%)
    preferGasless?: boolean; // Whether to prefer gasless settlement
}

export interface UseOmnistonSwapProps {
    params: QuoteParams | null;
    enabled?: boolean;
}

export interface UseOmnistonSwapReturn {
    quote: Quote | null;
    isQuoting: boolean;
    quoteError: string | null;
    resolverName: string | null;
    resolverId: string | null;
    isGasless: boolean;
    priceImpact: number | null; // Price impact as percentage
    isConnected: boolean;
    connectionStatus: string;
    buildAndExecute: (
        quote: Quote,
        walletAddress: string,
        sendTransaction: (params: { to: string; value: bigint; body: string }) => Promise<void>
    ) => Promise<string | null>;
    isBuilding: boolean;
    unsubscribe: () => void;
}

/**
 * Custom hook for Omniston swap functionality
 * Uses the official useRfq hook from the SDK
 */
export function useOmnistonSwap({ params, enabled = true }: UseOmnistonSwapProps): UseOmnistonSwapReturn {
    const omniston = useOmniston();
    const connectionStatus = useConnectionStatus();
    const [isBuilding, setIsBuilding] = useState(false);

    // Build the quote request from params
    const quoteRequest = useMemo((): QuoteRequest => {
        if (!params) {
            return {
                settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
                amount: {},
            };
        }

        return {
            settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
            bidAssetAddress: {
                blockchain: Blockchain.TON,
                address: params.fromAsset.address,
            },
            askAssetAddress: {
                blockchain: Blockchain.TON,
                address: params.toAsset.address,
            },
            amount: {
                bidUnits: params.amount,
            },
            settlementParams: {
                maxPriceSlippageBps: params.slippageBps ?? 100, // Default 1%
                gaslessSettlement: params.preferGasless 
                    ? GaslessSettlement.GASLESS_SETTLEMENT_REQUIRED 
                    : GaslessSettlement.GASLESS_SETTLEMENT_POSSIBLE,
            },
        };
    }, [params]);

    // Check if we have valid params to enable the query
    const isFormValid = Boolean(
        params &&
        params.fromAsset?.address &&
        params.toAsset?.address &&
        params.amount &&
        BigInt(params.amount) > BigInt(0)
    );

    // Use the official useRfq hook from the SDK
    const rfqResult = useRfq(quoteRequest, {
        enabled: enabled && isFormValid,
    });

    // Check if connection is usable
    const isConnected = connectionStatus !== "closed" && connectionStatus !== "error" && connectionStatus !== "closing";

    // Extract quote from the result
    const quoteEvent = rfqResult.data;
    const quote = quoteEvent?.type === "quoteUpdated" ? quoteEvent.quote : null;
    const resolverName = quote?.resolverName ?? null;
    const resolverId = quote?.resolverId ?? null;

    // Check if gasless settlement is available
    const isGasless = quote?.gasBudget === "0" || (quote?.gasBudget !== undefined && BigInt(quote.gasBudget) === BigInt(0));

    // Calculate price impact (simplified - in production should use pool reserves)
    const priceImpact = useMemo(() => {
        if (!quote || !params) return null;
        
        // Calculate based on bid/ask ratio vs expected 1:1 ratio
        // This is a simplified calculation - real price impact requires pool data
        const bidUnits = BigInt(quote.bidUnits);
        
        if (bidUnits === BigInt(0)) return null;
        
        // Price impact is hard to calculate without market price
        // For now, we'll show 0 and let the UI handle high slippage warnings
        return 0;
    }, [quote, params]);

    // Determine error state
    let quoteError: string | null = null;
    if (rfqResult.error) {
        quoteError = rfqResult.error.message || "Failed to get quote";
    } else if (quoteEvent?.type === "noQuote") {
        quoteError = "No quote available for this pair";
    } else if (quoteEvent?.type === "unsubscribed") {
        quoteError = "Quote request timed out";
    } else if (!isConnected) {
        quoteError = "Connection lost. Please try again.";
    }

    // Determine loading state - only show loading when we're actually fetching a quote
    // and we don't already have a valid quote
    const isQuoting = rfqResult.isFetching && !quote;

    const buildAndExecute = useCallback(async (
        quoteToExecute: Quote,
        walletAddress: string,
        sendTransaction: (params: { to: string; value: bigint; body: string }) => Promise<void>
    ): Promise<string | null> => {
        if (!isConnected) {
            throw new Error("Not connected to swap service");
        }

        setIsBuilding(true);

        try {
            // Build the transaction using Omniston
            const transaction = await omniston.buildTransfer({
                quote: quoteToExecute,
                sourceAddress: {
                    blockchain: Blockchain.TON,
                    address: walletAddress,
                },
                destinationAddress: {
                    blockchain: Blockchain.TON,
                    address: walletAddress,
                },
                gasExcessAddress: {
                    blockchain: Blockchain.TON,
                    address: walletAddress,
                },
                useRecommendedSlippage: true,
            });

            if (!transaction || !transaction.ton || !transaction.ton.messages || transaction.ton.messages.length === 0) {
                throw new Error("Failed to build transaction");
            }

            // Get the first message from the transaction
            const tonMsg = transaction.ton.messages[0];

            // Parse the transaction for sending
            const toAddress = TonAddress.parse(tonMsg.targetAddress);
            const value = BigInt(tonMsg.sendAmount);
            const body = tonMsg.payload || "";

            // Send the transaction
            await sendTransaction({
                to: toAddress.toString(),
                value,
                body,
            });

            return quoteToExecute.quoteId;
        } catch (error) {
            console.error("Failed to build/execute swap:", error);
            throw error;
        } finally {
            setIsBuilding(false);
        }
    }, [omniston, isConnected]);

    return {
        quote,
        isQuoting,
        quoteError,
        resolverName,
        resolverId,
        isGasless,
        priceImpact,
        isConnected,
        connectionStatus,
        buildAndExecute,
        isBuilding,
        unsubscribe: rfqResult.unsubscribe,
    };
}
