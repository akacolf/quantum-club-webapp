"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useOmniston, useConnectionStatus } from "@ston-fi/omniston-sdk-react";
import { 
    SettlementMethod,
    GaslessSettlement,
    type Quote,
    type QuoteResponseEvent,
} from "@ston-fi/omniston-sdk";
import { Address as TonAddress } from "@ton/core";

// TON blockchain ID in Omniston
const TON_BLOCKCHAIN_ID = 607;

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
}

export interface UseOmnistonSwapReturn {
    quote: Quote | null;
    isQuoting: boolean;
    quoteError: string | null;
    resolverName: string | null;
    isConnected: boolean;
    requestQuote: (params: QuoteParams) => void;
    cancelQuote: () => void;
    buildAndExecute: (
        quote: Quote,
        walletAddress: string,
        sendTransaction: (params: { to: string; value: bigint; body: string }) => Promise<void>
    ) => Promise<string | null>;
    isBuilding: boolean;
}

/**
 * Custom hook for Omniston swap functionality
 * Handles quote streaming via WebSocket
 */
export function useOmnistonSwap(): UseOmnistonSwapReturn {
    const omniston = useOmniston();
    const connectionStatus = useConnectionStatus();

    const [quote, setQuote] = useState<Quote | null>(null);
    const [isQuoting, setIsQuoting] = useState(false);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [resolverName, setResolverName] = useState<string | null>(null);
    const [isBuilding, setIsBuilding] = useState(false);

    const quoteSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
    const lastQuoteParamsRef = useRef<QuoteParams | null>(null);

    // Check if connection is usable (ready or connected - SDK connects lazily)
    // Only block when explicitly closed or errored
    const isConnected = connectionStatus !== "closed" && connectionStatus !== "error" && connectionStatus !== "closing";

    // Cleanup subscription on unmount
    useEffect(() => {
        return () => {
            quoteSubscriptionRef.current?.unsubscribe();
        };
    }, []);

    // Reset error when connection status changes
    useEffect(() => {
        if (connectionStatus === "closed" || connectionStatus === "error") {
            setQuoteError("Connection lost. Reconnecting...");
        } else if (connectionStatus === "connected" && quoteError === "Connection lost. Reconnecting...") {
            setQuoteError(null);
            // Retry last quote request if we had one
            if (lastQuoteParamsRef.current && !quoteSubscriptionRef.current) {
                // Will be handled by the component re-requesting
            }
        }
    }, [connectionStatus, quoteError]);

    const cancelQuote = useCallback(() => {
        quoteSubscriptionRef.current?.unsubscribe();
        quoteSubscriptionRef.current = null;
        setIsQuoting(false);
    }, []);

    const requestQuote = useCallback((params: QuoteParams) => {
        // Only block if connection is specifically closed/errored
        if (connectionStatus === "closed" || connectionStatus === "error") {
            setQuoteError("Connection lost. Please try again.");
            setIsQuoting(false);
            return;
        }

        // Cancel any existing quote subscription
        cancelQuote();
        setQuote(null);
        setQuoteError(null);
        setResolverName(null);
        setIsQuoting(true);
        lastQuoteParamsRef.current = params;

        try {
            const quoteRequest = {
                settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
                bidAssetAddress: {
                    blockchain: TON_BLOCKCHAIN_ID,
                    address: params.fromAsset.address,
                },
                askAssetAddress: {
                    blockchain: TON_BLOCKCHAIN_ID,
                    address: params.toAsset.address,
                },
                amount: {
                    bidUnits: params.amount,
                },
                // Enable gasless settlement when possible
                settlementParams: {
                    gaslessSettlement: GaslessSettlement.GASLESS_SETTLEMENT_POSSIBLE,
                    maxPriceSlippageBps: 100, // 1% slippage
                },
            };

            const observable = omniston.requestForQuote(quoteRequest);
            const subscription = observable.subscribe({
                next: (event: QuoteResponseEvent) => {
                    if (event.type === "quoteUpdated" && event.quote) {
                        setQuote(event.quote);
                        setResolverName(event.quote.resolverName || null);
                        setQuoteError(null);
                        // Keep isQuoting true as quotes stream continuously
                    } else if (event.type === "noQuote") {
                        setQuote(null);
                        setResolverName(null);
                        setQuoteError("No quote available for this pair");
                        setIsQuoting(false);
                    } else if (event.type === "unsubscribed") {
                        // Quote stream ended normally
                        setIsQuoting(false);
                    }
                },
                error: (error: Error) => {
                    console.error("Quote error:", error);
                    const errorMsg = error?.message || "Failed to get quote";
                    // Handle connection closed error specifically
                    if (errorMsg.toLowerCase().includes("closed") || errorMsg.toLowerCase().includes("connection")) {
                        setQuoteError("Connection lost. Please try again.");
                    } else {
                        setQuoteError(errorMsg);
                    }
                    setIsQuoting(false);
                    quoteSubscriptionRef.current = null;
                },
                complete: () => {
                    // Stream completed - don't set isQuoting false here as we may have a valid quote
                    if (!quote) {
                        setIsQuoting(false);
                    }
                },
            });

            quoteSubscriptionRef.current = subscription;
        } catch (error) {
            console.error("Failed to request quote:", error);
            setQuoteError("Failed to connect to swap service");
            setIsQuoting(false);
        }
    }, [omniston, cancelQuote, isConnected, quote]);

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
                    blockchain: TON_BLOCKCHAIN_ID,
                    address: walletAddress,
                },
                destinationAddress: {
                    blockchain: TON_BLOCKCHAIN_ID,
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
        isConnected,
        requestQuote,
        cancelQuote,
        buildAndExecute,
        isBuilding,
    };
}
