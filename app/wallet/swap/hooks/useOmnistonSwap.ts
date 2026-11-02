"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
    useOmniston, 
    useConnectionStatus,
    useRfq,
    isOrderQuote,
    type QuoteRequest,
    type Quote,
    type AssetId,
    type ChainAddress,
    type SettlementParams,
    type TonMessage,
} from "@ston-fi/omniston-sdk-react";
import { Address as TonAddress } from "@ton/core";

export type SupportedBlockchain =
    | "ton"
    | "tron"
    | "ethereum"
    | "base"
    | "bnb"
    | "arbitrum"
    | "polygon"
    | "avalanche"
    | number;

export interface OmnistonAsset {
    address: string;
    contractAddress?: string;
    blockchain?: SupportedBlockchain;
    kind?: "Ton" | "Jetton" | "Trc20" | "Erc20" | "Native" | string;
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
    referrerAddress?: string; // TON address to receive referral fees
    referrerFeeBps?: number; // Referral fee in basis points (e.g., 10 = 0.1%)
}

export interface OmnistonQuote extends Quote {
    /** Alias for inputUnits for backwards compatibility */
    bidUnits: string;
    /** Alias for outputUnits for backwards compatibility */
    askUnits: string;
}

export interface UseOmnistonSwapProps {
    params: QuoteParams | null;
    enabled?: boolean;
}

export interface UseOmnistonSwapReturn {
    quote: OmnistonQuote | null;
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
        sendTransaction: (params: { to: string; value: bigint; body: string }) => Promise<void>,
        options?: {
            sourceBlockchain?: SupportedBlockchain;
            destinationAddress?: string;
            destinationBlockchain?: SupportedBlockchain;
        }
    ) => Promise<string | null>;
    isBuilding: boolean;
    unsubscribe: () => void;
}

export function normalizeChain(chain?: SupportedBlockchain): string {
    if (!chain) return "ton";
    if (typeof chain === "number") {
        if (chain === 195) return "tron";
        if (chain === 607) return "ton";
        return "ton";
    }
    const c = chain.toLowerCase();
    if (c === "tron") return "tron";
    if (c === "eth" || c === "ethereum") return "ethereum";
    if (c === "base") return "base";
    if (c === "bnb" || c === "bsc") return "bnb";
    if (c === "arbitrum" || c === "arb") return "arbitrum";
    if (c === "polygon" || c === "matic") return "polygon";
    if (c === "avalanche" || c === "avax") return "avalanche";
    return "ton";
}

export function toAssetId(asset: OmnistonAsset): AssetId {
    const chain = normalizeChain(asset.blockchain);
    const kind = asset.kind?.toLowerCase();
    const isNative = kind === "ton" || kind === "native" || asset.symbol === "TON" || asset.symbol === "TRX" || asset.symbol === "ETH" || asset.symbol === "BNB" || asset.symbol === "AVAX" || asset.symbol === "POL";
    const addr = asset.address || asset.contractAddress || "";

    if (chain === "ton") {
        if (isNative || addr.toLowerCase() === "ton" || addr === "") {
            return {
                chain: {
                    $case: "ton",
                    value: { kind: { $case: "native", value: {} } },
                },
            };
        }
        return {
            chain: {
                $case: "ton",
                value: { kind: { $case: "jetton", value: addr } },
            },
        };
    }

    if (chain === "tron") {
        if (isNative || asset.symbol === "TRX") {
            return {
                chain: {
                    $case: "tron",
                    value: { kind: { $case: "native", value: {} } },
                },
            };
        }
        return {
            chain: {
                $case: "tron",
                value: { kind: { $case: "trc20", value: addr } },
            },
        };
    }

    // Supported EVM chains
    const evmChains = ["ethereum", "base", "bnb", "arbitrum", "polygon", "avalanche"] as const;
    const evmCase = (evmChains as readonly string[]).includes(chain) 
        ? (chain as typeof evmChains[number]) 
        : "ethereum";

    if (isNative) {
        return {
            chain: {
                $case: evmCase,
                value: { kind: { $case: "native", value: {} } },
            },
        };
    }

    return {
        chain: {
            $case: evmCase,
            value: { kind: { $case: "erc20", value: addr } },
        },
    };
}

export function toChainAddress(address: string, chain?: SupportedBlockchain): ChainAddress {
    const c = normalizeChain(chain);
    if (c === "tron") return { chain: { $case: "tron", value: address } };
    if (c === "ethereum") return { chain: { $case: "ethereum", value: address } };
    if (c === "base") return { chain: { $case: "base", value: address } };
    if (c === "bnb") return { chain: { $case: "bnb", value: address } };
    if (c === "arbitrum") return { chain: { $case: "arbitrum", value: address } };
    if (c === "polygon") return { chain: { $case: "polygon", value: address } };
    if (c === "avalanche") return { chain: { $case: "avalanche", value: address } };
    return { chain: { $case: "ton", value: address } };
}

/**
 * Custom hook for Omniston swap functionality (supporting multichain & cross-chain order settlement)
 * Uses the official useRfq hook from the SDK
 */
export function useOmnistonSwap({ params, enabled = true }: UseOmnistonSwapProps): UseOmnistonSwapReturn {
    const omniston = useOmniston();
    const queryClient = useQueryClient();
    const connectionStatus = useConnectionStatus();
    const [isBuilding, setIsBuilding] = useState(false);

    // Check if we have valid params to enable the query
    const isFormValid = Boolean(
        params &&
        (params.fromAsset?.address || params.fromAsset?.contractAddress) &&
        (params.toAsset?.address || params.toAsset?.contractAddress) &&
        params.amount &&
        BigInt(params.amount) > BigInt(0)
    );

    // Build the quote request from params
    const quoteRequest: QuoteRequest = (() => {
        if (!params || !isFormValid) {
            return {
                inputAsset: { chain: { $case: "ton", value: { kind: { $case: "native", value: {} } } } },
                outputAsset: { chain: { $case: "ton", value: { kind: { $case: "native", value: {} } } } },
                amount: { $case: "inputUnits", value: "0" },
                settlementParams: [],
            };
        }

        const settlementParams: SettlementParams[] = [
            {
                params: {
                    $case: "swap",
                    value: {
                        maxPriceSlippagePips: (params.slippageBps ?? 100) * 100, // Default 1% = 10,000 pips
                    },
                },
            },
            {
                params: {
                    $case: "order",
                    value: {},
                },
            },
        ];

        return {
            inputAsset: toAssetId(params.fromAsset),
            outputAsset: toAssetId(params.toAsset),
            amount: {
                $case: "inputUnits",
                value: params.amount,
            },
            settlementParams,
            ...(params.referrerAddress ? {
                integratorAddress: toChainAddress(params.referrerAddress, "ton"),
                integratorFeePips: (params.referrerFeeBps ?? 10) * 100, // Default 10 bps = 1,000 pips
            } : {}),
        };
    })();

    // Use the official useRfq hook from the SDK
    const rfqResult = useRfq(quoteRequest, {
        enabled: enabled && isFormValid,
    });

    // Check if connection is usable
    const isConnected = connectionStatus !== "closed" && connectionStatus !== "error" && connectionStatus !== "closing";

    // Extract quote from the result event
    const quoteEvent = rfqResult.data;
    const rawQuote = (quoteEvent && typeof quoteEvent === "object" && "$case" in quoteEvent && quoteEvent.$case === "quoteUpdated")
        ? quoteEvent.value
        : null;

    // Attach backwards-compatible aliases (bidUnits = inputUnits, askUnits = outputUnits)
    const quote: OmnistonQuote | null = rawQuote ? Object.assign(rawQuote, {
        bidUnits: rawQuote.inputUnits,
        askUnits: rawQuote.outputUnits,
    }) : null;

    const resolverName = quote?.resolverName ?? null;
    const resolverId = quote?.resolverId ?? null;

    // Check if gasless settlement is available
    const isGasless = quote?.gasBudget === "0" || (quote?.gasBudget !== undefined && BigInt(quote.gasBudget) === BigInt(0));

    // Calculate price impact (simplified estimate)
    const priceImpact = (() => {
        if (!quote || !params) return null;
        const inputUnits = BigInt(quote.inputUnits || quote.bidUnits || "0");
        if (inputUnits === BigInt(0)) return null;
        return 0;
    })();

    // Determine error state
    let quoteError: string | null = null;
    if (rfqResult.error) {
        quoteError = rfqResult.error.message || "Failed to get quote";
    } else if (quoteEvent && typeof quoteEvent === "object" && "$case" in quoteEvent && quoteEvent.$case === "noQuote") {
        quoteError = "No quote available for this pair";
    } else if (quoteEvent && typeof quoteEvent === "object" && "$case" in quoteEvent && quoteEvent.$case === "unsubscribed") {
        quoteError = "Quote request timed out";
    } else if (!isConnected) {
        quoteError = "Connection lost. Please try again.";
    }

    // Determine loading state - only show loading when we're actually fetching a quote
    const isQuoting = rfqResult.isFetching && !quote;

    async function buildAndExecute(
        quoteToExecute: Quote,
        walletAddress: string,
        sendTransaction: (params: { to: string; value: bigint; body: string }) => Promise<void>,
        options?: {
            sourceBlockchain?: SupportedBlockchain;
            destinationAddress?: string;
            destinationBlockchain?: SupportedBlockchain;
        }
    ): Promise<string | null> {
        if (!isConnected) {
            throw new Error("Not connected to swap service");
        }

        setIsBuilding(true);

        const srcBlockchain = options?.sourceBlockchain ?? "ton";
        const dstBlockchain = options?.destinationBlockchain ?? srcBlockchain;
        const dstAddress = options?.destinationAddress ?? walletAddress;

        try {
            let tonMessages: TonMessage[] = [];

            // Cross-chain order vs direct swap settlement
            const isOrder = isOrderQuote(quoteToExecute) || 
                (quoteToExecute.settlementData && quoteToExecute.settlementData.$case === "order");

            if (isOrder) {
                // Cross-chain escrow order settlement via tonBuildEscrowTransfer
                const transaction = await omniston.tonBuildEscrowTransfer({
                    quoteId: quoteToExecute.quoteId,
                    ownerSrcAddress: toChainAddress(walletAddress, srcBlockchain),
                    traderDstAddress: toChainAddress(dstAddress, dstBlockchain),
                    gasExcessAddress: toChainAddress(walletAddress, srcBlockchain),
                    refundSrcAddress: toChainAddress(walletAddress, srcBlockchain),
                });

                if (!transaction || !transaction.messages || transaction.messages.length === 0) {
                    throw new Error("Failed to build cross-chain order transaction");
                }
                tonMessages = transaction.messages;
            } else {
                // Direct TON swap settlement via tonBuildSwap
                const transaction = await omniston.tonBuildSwap({
                    quoteId: quoteToExecute.quoteId,
                    transferSrcAddress: toChainAddress(walletAddress, srcBlockchain),
                    traderDstAddress: toChainAddress(dstAddress, dstBlockchain),
                    gasExcessAddress: toChainAddress(walletAddress, srcBlockchain),
                    refundSrcAddress: toChainAddress(walletAddress, srcBlockchain),
                    useRecommendedSlippage: true,
                });

                if (!transaction || !transaction.messages || transaction.messages.length === 0) {
                    throw new Error("Failed to build swap transaction");
                }
                tonMessages = transaction.messages;
            }

            // Get the first message from the transaction
            const tonMsg = tonMessages[0];

            // Parse the transaction for sending
            const toAddress = TonAddress.parse(tonMsg.targetAddress);
            const value = BigInt(tonMsg.sendAmount);

            // Downstream sendTransaction implementations expect body as a base64-encoded BoC
            // Omniston ton messages payload is BoC hex string or base64 string
            let body = tonMsg.payload || "";
            if (body) {
                try {
                    // If payload is hex, convert to base64 cell BoC so downstream callers can parse it
                    if (/^[0-9a-fA-F]+$/.test(body) && body.length % 2 === 0) {
                        body = Buffer.from(body, "hex").toString("base64");
                    }
                } catch {
                    // Fall back to original payload
                }
            }

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
    }

    const unsubscribe = useCallback(() => {
        void queryClient.cancelQueries({ queryKey: ["requestForQuote"] });
    }, [queryClient]);

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
        unsubscribe,
    };
}
