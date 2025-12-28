"use client";

/**
 * QC RocketStart - On-Chain Trading Context
 * 
 * All trading operations happen directly on TON blockchain via smart contracts.
 * Firebase/Firestore is only used for metadata caching and indexing.
 * 
 * TEP-74: https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { dbfs } from "@/app/(firebase)/client";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { Address, toNano, Cell } from "@ton/core";
import { useGameContext } from "./MiningContext";
import { useWallet } from "@/app/wallet/WalletContext";
import {
    Token,
    HolderPosition,
    CreateTokenParams,
    TradeResult,
    DEFAULT_BONDING_CURVE,
    DEFAULT_GRADUATION_THRESHOLD_TON,
} from "@/types/trading";
import {
    createTonClient,
    getJettonWalletAddress,
    getJettonBalance,
    getBondingCurveData,
    previewBuyOnChain,
    previewSellOnChain,
    formatTokenAmount,
    parseTokenAmount,
    buildBuyMessage,
    buildBurnMessage,
} from "@/lib/jetton-operations";
import { FEE_CONFIG } from "@/lib/platform-config";

// =====================================================
// Types
// =====================================================

interface TradingContextType {
    // Token discovery (cached from blockchain indexing)
    trendingTokens: Token[];
    newTokens: Token[];
    graduatedTokens: Token[];
    searchResults: Token[];
    isLoading: boolean;

    // Search
    searchTokens: (query: string) => Promise<void>;
    clearSearch: () => void;

    // User positions (from on-chain queries)
    positions: HolderPosition[];

    // Selected token
    selectedToken: Token | null;
    selectToken: (tokenId: string) => Promise<void>;

    // On-chain trading (slippageTolerance is percentage, e.g., 0.05 = 5%)
    buyTokens: (tokenId: string, tonAmount: string, slippageTolerance?: number) => Promise<TradeResult>;
    sellTokens: (tokenId: string, tokenAmount: string) => Promise<TradeResult>;

    // Preview trades (on-chain queries)
    previewBuy: (tokenId: string, tonAmount: string) => Promise<{
        tokensReceived: string;
        averagePrice: string;
        fee: string;
        newPrice: string;
    } | null>;
    previewSell: (tokenId: string, tokenAmount: string) => Promise<{
        tonReceived: string;
        averagePrice: string;
        fee: string;
        newPrice: string;
    } | null>;

    // Token creation (deploys on-chain)
    createToken: (params: CreateTokenParams) => Promise<Token | null>;

    // Refresh data
    refreshTokens: () => Promise<void>;
    refreshPositions: () => Promise<void>;

    // Utils
    getPosition: (tokenId: string) => HolderPosition | null;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

// =====================================================
// Provider
// =====================================================

export function TradingProvider({ children }: { children: React.ReactNode }) {
    const { telegramId } = useGameContext();
    const { walletAddress, sendTransaction, isTestnet } = useWallet();

    // State
    const [trendingTokens, setTrendingTokens] = useState<Token[]>([]);
    const [newTokens, setNewTokens] = useState<Token[]>([]);
    const [graduatedTokens, setGraduatedTokens] = useState<Token[]>([]);
    const [searchResults, setSearchResults] = useState<Token[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [positions, setPositions] = useState<HolderPosition[]>([]);
    const [selectedToken, setSelectedToken] = useState<Token | null>(null);

    // TON client for on-chain queries - use correct network based on wallet settings
    const tonClient = useMemo(() => createTonClient(isTestnet), [isTestnet]);

    // =====================================================
    // Helper: Convert Firestore doc to Token
    // =====================================================
    const docToToken = useCallback((doc: { id: string; data: () => Record<string, unknown> }): Token => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name as string || "",
            nameLower: (data.nameLower as string) || (data.name as string || "").toLowerCase(),
            symbol: data.symbol as string || "",
            symbolLower: (data.symbolLower as string) || (data.symbol as string || "").toLowerCase(),
            description: data.description as string || "",
            image: data.image as string || "",
            creatorId: data.creatorId as string || data.creatorUserId as string || "",
            creatorWallet: data.creatorWallet as string || data.creatorAddress as string || "",
            creatorUsername: data.creatorUsername as string || "",

            // On-chain data (fetched from blockchain)
            jettonMasterAddress: data.jettonMasterAddress as string || "",
            isOnChain: data.isOnChain as boolean || false,

            // Supply info
            maxSupply: data.maxSupply as string || "1000000000000000000", // 1B * 10^9
            totalSupply: data.totalSupply as string || "0",
            circulatingSupply: data.circulatingSupply as string || data.totalSupply as string || "0",
            tonReserve: data.tonReserve as string || data.marketCap as string || "0",

            // Price data
            currentPrice: data.currentPrice as string || "0",
            marketCap: data.marketCap as string || "0",

            // Metadata
            holders: data.holders as number || 0,
            trades: data.trades as number || 0,
            volume24h: data.volume24h as number || 0,
            priceChange24h: data.priceChange24h as number || 0,

            // Creator earnings
            creatorEarnings: data.creatorEarnings as string || "0",

            // Bonding curve config
            bondingCurve: (data.bondingCurve as { basePrice: string; slope: string }) || DEFAULT_BONDING_CURVE,
            graduationThreshold: data.graduationThreshold as string || DEFAULT_GRADUATION_THRESHOLD_TON,
            isGraduated: data.isGraduated as boolean || false,

            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        };
    }, []);

    // =====================================================
    // Fetch tokens (from cache/index)
    // =====================================================
    const fetchTokens = useCallback(async () => {
        setIsLoading(true);
        try {
            // Trending = highest volume (only confirmed on-chain tokens)
            const trendingQuery = query(
                collection(dbfs, "tokens"),
                where("isOnChain", "==", true),
                orderBy("volume24h", "desc"),
                limit(20)
            );
            const trendingSnapshot = await getDocs(trendingQuery);
            setTrendingTokens(trendingSnapshot.docs.map(docToToken));

            // New = recently created (include pending deployments so users see their newly created tokens)
            const newQuery = query(
                collection(dbfs, "tokens"),
                orderBy("createdAt", "desc"),
                limit(20)
            );
            const newSnapshot = await getDocs(newQuery);
            setNewTokens(newSnapshot.docs.map(docToToken));

            // Graduated = tokens migrated to DEX (STON.fi)
            const graduatedQuery = query(
                collection(dbfs, "tokens"),
                where("isGraduated", "==", true),
                orderBy("graduatedAt", "desc"),
                limit(20)
            );
            const graduatedSnapshot = await getDocs(graduatedQuery);
            setGraduatedTokens(graduatedSnapshot.docs.map(docToToken));
        } catch (error) {
            console.error("Error fetching tokens:", error);
        } finally {
            setIsLoading(false);
        }
    }, [docToToken]);

    // =====================================================
    // Search tokens
    // =====================================================
    const searchTokens = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const q = searchQuery.toLowerCase();
            const searchQ = query(
                collection(dbfs, "tokens"),
                where("nameLower", ">=", q),
                where("nameLower", "<=", q + "\uf8ff"),
                limit(20)
            );
            const snapshot = await getDocs(searchQ);
            setSearchResults(snapshot.docs.map(docToToken));
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsLoading(false);
        }
    }, [docToToken]);

    const clearSearch = useCallback(() => {
        setSearchResults([]);
    }, []);

    // =====================================================
    // Fetch user positions (from blockchain)
    // =====================================================
    const refreshPositions = useCallback(async () => {
        if (!walletAddress) {
            setPositions([]);
            return;
        }

        try {
            // Get all tokens user might hold (from cache)
            const tokensSnapshot = await getDocs(
                query(collection(dbfs, "tokens"), where("isOnChain", "==", true))
            );

            const positionsPromises = tokensSnapshot.docs.map(async (docSnap) => {
                const token = docToToken(docSnap);
                if (!token.jettonMasterAddress) return null;

                try {
                    // Query on-chain balance
                    const balance = await getJettonBalance(
                        token.jettonMasterAddress,
                        walletAddress,
                        tonClient
                    );

                    if (balance > BigInt(0)) {
                        return {
                            tokenId: token.id,
                            balance: balance.toString(),
                            averageBuyPrice: "0", // Can't determine without indexing
                            totalInvested: "0",
                            currentValue: formatTokenAmount(balance),
                            pnl: 0,
                            pnlPercent: 0,
                            token,
                        } as HolderPosition;
                    }
                } catch {
                    // Token might not be deployed yet
                }
                return null;
            });

            const results = await Promise.all(positionsPromises);
            setPositions(results.filter((p): p is HolderPosition => p !== null));
        } catch (error) {
            console.error("Error refreshing positions:", error);
        }
    }, [walletAddress, tonClient, docToToken]);

    // =====================================================
    // Select token (fetch on-chain data)
    // =====================================================
    const selectToken = useCallback(async (tokenId: string) => {
        try {
            const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
            if (!tokenDoc.exists()) {
                setSelectedToken(null);
                return;
            }

            const token = docToToken(tokenDoc);

            // If on-chain, try to fetch live data (may fail if contract not fully deployed)
            if (token.isOnChain && token.jettonMasterAddress) {
                try {
                    const curveData = await getBondingCurveData(
                        token.jettonMasterAddress,
                        tonClient
                    );

                    if (curveData) {
                        token.totalSupply = curveData.totalSupply.toString();
                        token.currentPrice = curveData.currentPrice.toString();
                        token.isGraduated = curveData.graduated;
                    }
                } catch (error) {
                    // Contract may not be fully deployed yet or may not have get_curve_data method
                    // This is expected for newly deployed tokens - use cached Firestore data
                    console.warn("Could not fetch on-chain data (contract may still be deploying):",
                        error instanceof Error ? error.message : error);
                }
            }

            setSelectedToken(token);
        } catch (error) {
            console.error("Error selecting token:", error);
        }
    }, [docToToken, tonClient]);

    // =====================================================
    // Preview Buy (on-chain query with local fallback)
    // =====================================================
    const previewBuy = useCallback(async (
        tokenId: string,
        tonAmount: string
    ) => {
        try {
            const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
            if (!tokenDoc.exists()) return null;

            const token = docToToken(tokenDoc);
            if (!token.jettonMasterAddress) return null;

            const tonNano = toNano(tonAmount);
            const tonAmountNum = parseFloat(tonAmount);

            // Get current price in TON (from nano)
            const currentPriceNano = Number(token.currentPrice || "1000000");
            const currentPriceTon = currentPriceNano / 1e9;

            // Try on-chain preview first
            let tokensOut = await previewBuyOnChain(
                token.jettonMasterAddress,
                tonNano,
                tonClient
            );

            // If on-chain preview fails, use local bonding curve calculation
            if (tokensOut === BigInt(0)) {
                // Apply trading fee first (1% platform + 0.5% creator = 1.5% total)
                const feePercent = FEE_CONFIG.totalTradingFeePercent / 100;
                const tonAfterFee = tonAmountNum * (1 - feePercent);

                // Simple linear bonding curve approximation:
                // tokens = tonAmount / currentPrice
                if (currentPriceTon > 0) {
                    const tokensNumeric = tonAfterFee / currentPriceTon;
                    tokensOut = BigInt(Math.floor(tokensNumeric * 1e9)); // Convert to nano-tokens
                }
            }

            if (tokensOut === BigInt(0)) return null;

            const fee = (tonAmountNum * FEE_CONFIG.totalTradingFeePercent / 100).toFixed(4);
            const tokensFormatted = formatTokenAmount(tokensOut);

            return {
                tokensReceived: tokensFormatted,
                averagePrice: currentPriceTon.toFixed(9), // Use current price for consistency
                fee,
                newPrice: currentPriceTon.toFixed(9), // Price after trade (approximately same for small trades)
            };
        } catch (error) {
            console.error("Preview buy error:", error);
            return null;
        }
    }, [docToToken, tonClient]);

    // =====================================================
    // Preview Sell (on-chain query with local fallback)
    // =====================================================
    const previewSell = useCallback(async (
        tokenId: string,
        tokenAmount: string
    ) => {
        try {
            const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
            if (!tokenDoc.exists()) return null;

            const token = docToToken(tokenDoc);
            if (!token.jettonMasterAddress) return null;

            const tokenNano = parseTokenAmount(tokenAmount);
            const tokenAmountNum = parseFloat(tokenAmount);

            // Get current price in TON (from nano)
            const currentPriceNano = Number(token.currentPrice || "1000000");
            const currentPriceTon = currentPriceNano / 1e9;

            // Try on-chain preview first
            let tonOut = await previewSellOnChain(
                token.jettonMasterAddress,
                tokenNano,
                tonClient
            );

            // If on-chain preview fails, use local bonding curve calculation
            if (tonOut === BigInt(0)) {
                // Simple linear bonding curve approximation:
                // tonOut = tokens * currentPrice * (1 - fee)
                if (currentPriceTon > 0) {
                    const feePercent = FEE_CONFIG.totalTradingFeePercent / 100;
                    const tonNumeric = tokenAmountNum * currentPriceTon * (1 - feePercent);
                    tonOut = BigInt(Math.floor(tonNumeric * 1e9)); // Convert to nano-TON
                }
            }

            if (tonOut === BigInt(0)) return null;

            const tonFormatted = formatTokenAmount(tonOut);
            // Calculate fee based on gross value (before fee deduction)
            const grossTonValue = tokenAmountNum * currentPriceTon;
            const fee = (grossTonValue * FEE_CONFIG.totalTradingFeePercent / 100).toFixed(4);

            return {
                tonReceived: tonFormatted,
                averagePrice: currentPriceTon.toFixed(9), // Use current price for consistency
                fee,
                newPrice: currentPriceTon.toFixed(9),
            };
        } catch (error) {
            console.error("Preview sell error:", error);
            return null;
        }
    }, [docToToken, tonClient]);

    // =====================================================
    // BUY TOKENS (On-Chain with Slippage Protection)
    // =====================================================
    const buyTokens = useCallback(async (
        tokenId: string,
        tonAmount: string,
        slippageTolerance: number = 0.05 // Default 5% slippage
    ): Promise<TradeResult> => {
        if (!walletAddress) {
            return { success: false, error: "Wallet not connected" };
        }

        try {
            // Get token data
            const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
            if (!tokenDoc.exists()) {
                return { success: false, error: "Token not found" };
            }

            const token = docToToken(tokenDoc);

            if (!token.jettonMasterAddress || !token.isOnChain) {
                return { success: false, error: "Token not deployed on-chain" };
            }

            if (token.isGraduated) {
                return { success: false, error: "Token graduated - trade on DEX" };
            }

            // Preview buy to calculate expected tokens
            const preview = await previewBuy(tokenId, tonAmount);
            let minTokensOut = BigInt(0);

            if (preview && preview.tokensReceived) {
                // Calculate minimum tokens with slippage tolerance
                const expectedTokens = BigInt(Math.floor(parseFloat(preview.tokensReceived) * 1e9));
                const slippageMultiplier = 1 - slippageTolerance;
                minTokensOut = BigInt(Math.floor(Number(expectedTokens) * slippageMultiplier));
            }

            // Build buy transaction with slippage protection
            const tonNano = toNano(tonAmount);
            const buyBody = buildBuyMessage({ minTokensOut });

            // Send transaction via QC Wallet
            const result = await sendTransaction({
                to: token.jettonMasterAddress,
                value: tonNano.toString(),
                body: buyBody,
            });

            if (!result.success) {
                return { success: false, error: result.error || "Transaction failed" };
            }

            // Log trade for indexing (async, don't wait)
            setDoc(doc(dbfs, `tokens/${tokenId}/trades/${Date.now()}`), {
                type: "buy",
                userId: telegramId,
                walletAddress,
                tonAmount,
                txHash: result.txHash,
                timestamp: serverTimestamp(),
                status: "pending",
            }).catch(console.error);

            // Refresh positions after a delay
            setTimeout(() => refreshPositions(), 5000);

            return {
                success: true,
                txHash: result.txHash,
            };
        } catch (error) {
            console.error("Buy error:", error);
            return { success: false, error: "Transaction failed" };
        }
    }, [walletAddress, telegramId, docToToken, sendTransaction, refreshPositions, previewBuy]);

    // =====================================================
    // SELL TOKENS (On-Chain)
    // =====================================================
    const sellTokens = useCallback(async (
        tokenId: string,
        tokenAmount: string
    ): Promise<TradeResult> => {
        if (!walletAddress) {
            return { success: false, error: "Wallet not connected" };
        }

        try {
            // Get token data
            const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
            if (!tokenDoc.exists()) {
                return { success: false, error: "Token not found" };
            }

            const token = docToToken(tokenDoc);

            if (!token.jettonMasterAddress || !token.isOnChain) {
                return { success: false, error: "Token not deployed on-chain" };
            }

            if (token.isGraduated) {
                return { success: false, error: "Token graduated - trade on DEX" };
            }

            // Get user's Jetton wallet address
            const jettonWalletAddress = await getJettonWalletAddress(
                token.jettonMasterAddress,
                walletAddress,
                tonClient
            );

            if (!jettonWalletAddress) {
                return { success: false, error: "Jetton wallet not found" };
            }

            // Build burn message (sell = burn tokens to get TON back)
            const tokenNano = parseTokenAmount(tokenAmount);
            const burnBody = buildBurnMessage({
                amount: tokenNano,
                responseDestination: Address.parse(walletAddress),
            });

            // Send transaction via QC Wallet
            const result = await sendTransaction({
                to: jettonWalletAddress,
                value: toNano("0.1").toString(), // Gas for burn operation
                body: burnBody,
            });

            if (!result.success) {
                return { success: false, error: result.error || "Transaction failed" };
            }

            // Log trade for indexing
            setDoc(doc(dbfs, `tokens/${tokenId}/trades/${Date.now()}`), {
                type: "sell",
                userId: telegramId,
                walletAddress,
                tokenAmount,
                txHash: result.txHash,
                timestamp: serverTimestamp(),
                status: "pending",
            }).catch(console.error);

            // Refresh positions after a delay
            setTimeout(() => refreshPositions(), 5000);

            return {
                success: true,
                txHash: result.txHash,
            };
        } catch (error) {
            console.error("Sell error:", error);
            return { success: false, error: "Transaction failed" };
        }
    }, [walletAddress, telegramId, docToToken, tonClient, sendTransaction, refreshPositions]);

    // =====================================================
    // CREATE TOKEN (Deploy on-chain)
    // =====================================================
    const createToken = useCallback(async (params: CreateTokenParams): Promise<Token | null> => {
        if (!walletAddress || !telegramId) {
            return null;
        }

        try {
            // Call API to prepare deployment package (creates Firestore doc + returns deployment tx)
            const response = await fetch("/api/deploy-jetton", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: params.name,
                    symbol: params.symbol,
                    description: params.description,
                    image: params.image,
                    creatorAddress: walletAddress,
                }),
            });

            if (!response.ok) {
                const responseText = await response.text();
                let errorData = {};
                try {
                    errorData = JSON.parse(responseText);
                } catch {
                    console.error("Token creation failed - raw response:", response.status, responseText);
                }
                console.error("Token creation failed:", response.status, errorData);
                return null;
            }

            const { tokenId, jettonAddress, deployTx, success } = await response.json();

            console.log("Token prepared:", {
                tokenId,
                jettonAddress,
                success,
                hasDeployTx: !!deployTx,
            });

            if (!success || !deployTx) {
                return null;
            }

            // Send deployment transaction from user's wallet (client-side)
            // This ensures the token is actually deployed on-chain
            try {
                // Parse the base64-encoded stateInit and body cells
                const stateInitCell = deployTx.stateInit
                    ? Cell.fromBoc(Buffer.from(deployTx.stateInit, "base64"))[0]
                    : undefined;
                const bodyCell = deployTx.body
                    ? Cell.fromBoc(Buffer.from(deployTx.body, "base64"))[0]
                    : undefined;

                console.log("Sending deployment transaction:", {
                    to: deployTx.to,
                    value: deployTx.value,
                    hasStateInit: !!stateInitCell,
                    hasBody: !!bodyCell,
                });

                const txResult = await sendTransaction({
                    to: deployTx.to,
                    value: deployTx.value,
                    stateInit: stateInitCell,
                    body: bodyCell,
                });

                if (txResult.success) {
                    console.log("Deployment transaction sent successfully:", txResult.txHash);

                    // Confirm deployment to update Firestore
                    await fetch("/api/deploy-jetton", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            tokenId,
                            jettonAddress,
                            txHash: txResult.txHash,
                        }),
                    }).catch(console.error);

                    // If initial buy is specified, execute it after deployment
                    if (params.initialBuyAmount && parseFloat(params.initialBuyAmount) > 0) {
                        console.log("Executing initial buy:", params.initialBuyAmount, "TON");

                        // Wait a moment for deployment to be confirmed
                        await new Promise(resolve => setTimeout(resolve, 3000));

                        // Execute initial buy
                        const buyResult = await buyTokens(tokenId, params.initialBuyAmount);
                        if (buyResult.success) {
                            console.log("Initial buy successful:", buyResult.txHash);
                        } else {
                            console.warn("Initial buy failed (token still created):", buyResult.error);
                        }
                    }
                } else {
                    console.error("Deployment transaction failed:", txResult.error);
                    // Token doc was created, but deployment failed
                    // The server-side fallback may still deploy it
                }
            } catch (deployError) {
                console.error("Failed to send deployment transaction:", deployError);
                // Continue anyway - server-side deployment may succeed
            }

            // Return the created token
            const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
            if (tokenDoc.exists()) {
                return docToToken(tokenDoc);
            }

            return null;
        } catch (error) {
            console.error("Create token error:", error);
            return null;
        }
    }, [walletAddress, telegramId, docToToken, sendTransaction, buyTokens]);

    // =====================================================
    // Get position helper
    // =====================================================
    const getPosition = useCallback((tokenId: string): HolderPosition | null => {
        return positions.find(p => p.tokenId === tokenId) || null;
    }, [positions]);

    // =====================================================
    // Effects
    // =====================================================
    useEffect(() => {
        fetchTokens();
    }, [fetchTokens]);

    useEffect(() => {
        if (walletAddress) {
            refreshPositions();
        }
    }, [walletAddress, refreshPositions]);

    // =====================================================
    // Context Value
    // =====================================================
    const value: TradingContextType = {
        trendingTokens,
        newTokens,
        graduatedTokens,
        searchResults,
        isLoading,
        searchTokens,
        clearSearch,
        positions,
        selectedToken,
        selectToken,
        buyTokens,
        sellTokens,
        previewBuy,
        previewSell,
        createToken,
        refreshTokens: fetchTokens,
        refreshPositions,
        getPosition,
    };

    return (
        <TradingContext.Provider value={value}>
            {children}
        </TradingContext.Provider>
    );
}

// =====================================================
// Hook
// =====================================================
export function useTrading() {
    const context = useContext(TradingContext);
    if (!context) {
        throw new Error("useTrading must be used within TradingProvider");
    }
    return context;
}
