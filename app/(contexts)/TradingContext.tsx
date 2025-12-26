"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { dbfs } from "@/app/(firebase)/client";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
    increment,
} from "firebase/firestore";
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
    calculateBuyPrice,
    calculateSellPrice,
    getCurrentPrice,
    calculateMarketCap,
    calculateTokensForTon,
} from "@/lib/bonding-curve";
import { updatePriceCandle } from "@/lib/price-history";
import { PLATFORM_WALLET_ADDRESS, FEE_CONFIG } from "@/lib/platform-config";

interface TradingContextType {
    // Token discovery
    trendingTokens: Token[];
    newTokens: Token[];
    searchResults: Token[];
    isLoading: boolean;

    // Search
    searchTokens: (query: string) => Promise<void>;
    clearSearch: () => void;

    // User positions
    positions: HolderPosition[];
    getPosition: (tokenId: string) => HolderPosition | null;
    refreshPositions: () => Promise<void>;

    // Token details
    selectedToken: Token | null;
    selectToken: (tokenId: string) => Promise<void>;
    clearSelectedToken: () => void;

    // Trading actions
    buyTokens: (tokenId: string, tonAmount: string) => Promise<TradeResult>;
    sellTokens: (tokenId: string, tokenAmount: string) => Promise<TradeResult>;

    // Price calculations (for UI preview)
    previewBuy: (tokenId: string, tonAmount: string) => {
        tokensReceived: string;
        averagePrice: string;
        fee: string;
        newPrice: string;
    } | null;
    previewSell: (tokenId: string, tokenAmount: string) => {
        tonReceived: string;
        averagePrice: string;
        fee: string;
        newPrice: string;
    } | null;

    // Token creation
    createToken: (params: CreateTokenParams) => Promise<Token | null>;

    // Sell helpers (simplified - no anti-dump)
    getAvailableToSell: (tokenId: string) => { amount: string; reason: string };

    // Refresh
    refreshTokens: () => Promise<void>;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export function TradingProvider({ children }: { children: React.ReactNode }) {
    const { telegramId, username } = useGameContext();
    const { walletAddress, sendTransaction } = useWallet();

    // State
    const [trendingTokens, setTrendingTokens] = useState<Token[]>([]);
    const [newTokens, setNewTokens] = useState<Token[]>([]);
    const [searchResults, setSearchResults] = useState<Token[]>([]);
    const [positions, setPositions] = useState<HolderPosition[]>([]);
    const [selectedToken, setSelectedToken] = useState<Token | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Helper: Convert Firestore doc to Token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docToToken = useCallback((docSnap: any): Token => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            name: data.name,
            symbol: data.symbol,
            description: data.description || "",
            image: data.image || "",
            creatorId: data.creatorId,
            creatorAddress: data.creatorAddress,
            creatorUsername: data.creatorUsername,
            createdAt: data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(),
            totalSupply: data.totalSupply || "0",
            currentPrice: data.currentPrice || "0",
            marketCap: data.marketCap || "0",
            volume24h: data.volume24h || "0",
            priceChange24h: data.priceChange24h || 0,
            bondingCurve: data.bondingCurve || DEFAULT_BONDING_CURVE,
            status: data.status || "bonding",
            graduationThreshold: data.graduationThreshold || DEFAULT_GRADUATION_THRESHOLD_TON,
            holders: data.holders || 0,
            trades: data.trades || 0,
            // On-chain status
            isOnChain: data.isOnChain || false,
            deploymentPending: data.deploymentPending || false,
            deployedAt: data.deployedAt instanceof Timestamp
                ? data.deployedAt.toDate()
                : undefined,
            jettonMasterAddress: data.jettonMasterAddress || undefined,
        };
    }, []);

    // Fetch trending tokens (by volume)
    const fetchTrendingTokens = useCallback(async () => {
        try {
            const tokensRef = collection(dbfs, "tokens");
            const q = query(
                tokensRef,
                where("status", "==", "bonding"),
                orderBy("volume24h", "desc"),
                limit(20)
            );
            const snapshot = await getDocs(q);
            const tokens = snapshot.docs.map(docToToken);
            setTrendingTokens(tokens);
        } catch (error) {
            console.error("Error fetching trending tokens:", error);
        }
    }, [docToToken]);

    // Fetch new tokens
    const fetchNewTokens = useCallback(async () => {
        try {
            const tokensRef = collection(dbfs, "tokens");
            const q = query(
                tokensRef,
                orderBy("createdAt", "desc"),
                limit(20)
            );
            const snapshot = await getDocs(q);
            const tokens = snapshot.docs.map(docToToken);
            setNewTokens(tokens);
        } catch (error) {
            console.error("Error fetching new tokens:", error);
        }
    }, [docToToken]);

    // Refresh all tokens
    const refreshTokens = useCallback(async () => {
        setIsLoading(true);
        await Promise.all([fetchTrendingTokens(), fetchNewTokens()]);
        setIsLoading(false);
    }, [fetchTrendingTokens, fetchNewTokens]);

    // Search tokens
    const searchTokens = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const searchLower = searchQuery.toLowerCase().trim();
            const searchUpper = searchQuery.toUpperCase().trim();
            const tokensRef = collection(dbfs, "tokens");

            // Search by name (case-insensitive prefix match)
            const nameQuery = query(
                tokensRef,
                where("nameLower", ">=", searchLower),
                where("nameLower", "<=", searchLower + "\uf8ff"),
                limit(20)
            );

            // Search by symbol (exact or prefix match - symbols are typically uppercase)
            const symbolQuery = query(
                tokensRef,
                where("symbol", ">=", searchUpper),
                where("symbol", "<=", searchUpper + "\uf8ff"),
                limit(20)
            );

            // Execute both queries
            const [nameSnapshot, symbolSnapshot] = await Promise.all([
                getDocs(nameQuery),
                getDocs(symbolQuery)
            ]);

            // Merge results and deduplicate by token ID
            const tokenMap = new Map<string, ReturnType<typeof docToToken>>();

            nameSnapshot.docs.forEach(doc => {
                const token = docToToken(doc);
                tokenMap.set(token.id, token);
            });

            symbolSnapshot.docs.forEach(doc => {
                const token = docToToken(doc);
                if (!tokenMap.has(token.id)) {
                    tokenMap.set(token.id, token);
                }
            });

            setSearchResults(Array.from(tokenMap.values()));
        } catch (error) {
            console.error("Error searching tokens:", error);
        }
    }, [docToToken]);

    const clearSearch = useCallback(() => {
        setSearchResults([]);
    }, []);

    // Fetch user positions
    const refreshPositions = useCallback(async () => {
        if (!telegramId) return;

        try {
            const positionsRef = collection(dbfs, `users/${telegramId}/positions`);
            const snapshot = await getDocs(positionsRef);

            const positionsList: HolderPosition[] = await Promise.all(
                snapshot.docs.map(async (docSnap) => {
                    const data = docSnap.data();

                    // Fetch token data for each position
                    const tokenDoc = await getDoc(doc(dbfs, `tokens/${data.tokenId}`));
                    const token = tokenDoc.exists() ? docToToken(tokenDoc) : undefined;

                    return {
                        tokenId: data.tokenId,
                        token,
                        balance: data.balance || "0",
                        averageBuyPrice: data.averageBuyPrice || "0",
                        totalInvested: data.totalInvested || "0",
                        unrealizedPnl: "0",
                        unrealizedPnlPercent: 0,
                    };
                })
            );

            setPositions(positionsList);
        } catch (error) {
            console.error("Error fetching positions:", error);
        }
    }, [telegramId, docToToken]);

    // Get position for a specific token
    const getPosition = useCallback((tokenId: string) => {
        return positions.find(p => p.tokenId === tokenId) || null;
    }, [positions]);

    // Select a token (fetch full details)
    const selectToken = useCallback(async (tokenId: string) => {
        try {
            const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
            if (tokenDoc.exists()) {
                setSelectedToken(docToToken(tokenDoc));
            }
        } catch (error) {
            console.error("Error fetching token:", error);
        }
    }, [docToToken]);

    const clearSelectedToken = useCallback(() => {
        setSelectedToken(null);
    }, []);

    // Preview buy (for UI)
    const previewBuy = useCallback((tokenId: string, tonAmount: string) => {
        const token = selectedToken?.id === tokenId
            ? selectedToken
            : [...trendingTokens, ...newTokens].find(t => t.id === tokenId);

        if (!token || !tonAmount || parseFloat(tonAmount) <= 0) return null;

        try {
            const tonNano = BigInt(Math.floor(parseFloat(tonAmount) * 1e9));
            const currentSupply = BigInt(token.totalSupply);
            const tokensReceived = calculateTokensForTon(currentSupply, tonNano, token.bondingCurve);

            if (tokensReceived <= BigInt(0)) return null;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { totalCost, averagePrice, newPrice, fee } = calculateBuyPrice(
                currentSupply,
                tokensReceived,
                token.bondingCurve
            );

            return {
                tokensReceived: tokensReceived.toString(),
                averagePrice: (Number(averagePrice) / 1e9).toFixed(9),
                fee: (Number(fee) / 1e9).toFixed(6),
                newPrice: (Number(newPrice) / 1e9).toFixed(9),
            };
        } catch (error) {
            console.error("Error previewing buy:", error);
            return null;
        }
    }, [selectedToken, trendingTokens, newTokens]);

    // Preview sell (for UI)
    const previewSell = useCallback((tokenId: string, tokenAmount: string) => {
        const token = selectedToken?.id === tokenId
            ? selectedToken
            : [...trendingTokens, ...newTokens].find(t => t.id === tokenId);

        if (!token || !tokenAmount || parseFloat(tokenAmount) <= 0) return null;

        try {
            const sellAmount = BigInt(tokenAmount);
            const currentSupply = BigInt(token.totalSupply);

            const { totalProceeds, averagePrice, newPrice, fee } = calculateSellPrice(
                currentSupply,
                sellAmount,
                token.bondingCurve
            );

            return {
                tonReceived: (Number(totalProceeds) / 1e9).toFixed(6),
                averagePrice: (Number(averagePrice) / 1e9).toFixed(9),
                fee: (Number(fee) / 1e9).toFixed(6),
                newPrice: (Number(newPrice) / 1e9).toFixed(9),
            };
        } catch (error) {
            console.error("Error previewing sell:", error);
            return null;
        }
    }, [selectedToken, trendingTokens, newTokens]);

    // Buy tokens
    const buyTokens = useCallback(async (
        tokenId: string,
        tonAmount: string
    ): Promise<TradeResult> => {
        if (!telegramId || !walletAddress) {
            return { success: false, error: "Wallet not connected" };
        }

        try {
            // Server-side validation first
            const validationResponse = await fetch("/api/trade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tokenId,
                    type: "buy",
                    amount: tonAmount,
                }),
            });

            if (!validationResponse.ok) {
                const errorData = await validationResponse.json();
                if (validationResponse.status === 429) {
                    return { success: false, error: `Rate limit exceeded. Try again in ${errorData.retryAfter}s` };
                }
                return { success: false, error: errorData.error || "Validation failed" };
            }

            // In the foundation phase, this is a simulated/centralized buy
            // Will be replaced with on-chain transactions later

            const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
            if (!tokenDoc.exists()) {
                return { success: false, error: "Token not found" };
            }

            const token = docToToken(tokenDoc);
            const preview = previewBuy(tokenId, tonAmount);

            if (!preview) {
                return { success: false, error: "Invalid amount" };
            }

            const tokensReceived = BigInt(preview.tokensReceived);
            const newSupply = BigInt(token.totalSupply) + tokensReceived;
            const newPrice = getCurrentPrice(newSupply, token.bondingCurve);
            const newMarketCap = calculateMarketCap(newSupply, newPrice);

            // Convert TON amount to nanoTON for tracking
            const tonAmountNano = Math.floor(parseFloat(tonAmount) * 1e9);

            // Update token
            await updateDoc(doc(dbfs, `tokens/${tokenId}`), {
                totalSupply: newSupply.toString(),
                currentPrice: newPrice.toString(),
                marketCap: newMarketCap.toString(),
                holders: increment(1), // Simplified - should check if new holder
                trades: increment(1),
                volume24h: increment(parseFloat(tonAmount)),
                collectedTon: increment(tonAmountNano), // Track total collected for graduation
            });

            // Update user position
            const positionRef = doc(dbfs, `users/${telegramId}/positions/${tokenId}`);
            const existingPosition = await getDoc(positionRef);

            if (existingPosition.exists()) {
                const data = existingPosition.data();
                const newBalance = (BigInt(data.balance || "0") + tokensReceived).toString();

                await updateDoc(positionRef, {
                    balance: newBalance,
                    totalInvested: (parseFloat(data.totalInvested || "0") + parseFloat(tonAmount)).toString(),
                });
            } else {
                await setDoc(positionRef, {
                    tokenId,
                    balance: preview.tokensReceived,
                    averageBuyPrice: preview.averagePrice,
                    totalInvested: tonAmount,
                    createdAt: serverTimestamp(),
                });
            }

            // Create trade record
            const tradeId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await setDoc(doc(dbfs, `tokens/${tokenId}/trades/${tradeId}`), {
                type: "buy",
                userId: telegramId,
                walletAddress: walletAddress || "",
                username: username || "Unknown",
                amount: preview.tokensReceived,
                price: preview.averagePrice,
                totalTon: tonAmount,
                fee: preview.fee,
                timestamp: serverTimestamp(),
                status: "completed",
            });

            // Record in user's holder entry
            await setDoc(doc(dbfs, `tokens/${tokenId}/holders/${telegramId}`), {
                telegramId,
                username: username || "Unknown",
                balance: existingPosition.exists()
                    ? (BigInt(existingPosition.data().balance || "0") + tokensReceived).toString()
                    : preview.tokensReceived,
                lastTradeAt: serverTimestamp(),
            }, { merge: true });

            // Collect platform fee (50% of trading fee goes to platform)
            const platformFeeNano = Math.floor(parseFloat(preview.fee) * 1e9 * (FEE_CONFIG.platformSharePercent / 100));
            if (platformFeeNano > 0) {
                sendTransaction({
                    to: PLATFORM_WALLET_ADDRESS,
                    value: String(platformFeeNano),
                }).catch(err => console.error("Fee collection failed:", err));
            }

            await refreshPositions();

            // Update price history for charts
            updatePriceCandle(tokenId, newPrice.toString()).catch(console.error);

            return {
                success: true,
                trade: {
                    id: tradeId,
                    tokenId,
                    type: "buy",
                    userId: telegramId,
                    amount: preview.tokensReceived,
                    price: preview.averagePrice,
                    totalTon: tonAmount,
                    timestamp: new Date(),
                    status: "completed",
                },
                newBalance: existingPosition.exists()
                    ? (BigInt(existingPosition.data().balance || "0") + tokensReceived).toString()
                    : preview.tokensReceived,
            };
        } catch (error) {
            console.error("Error buying tokens:", error);
            return { success: false, error: "Transaction failed" };
        }
    }, [telegramId, username, walletAddress, docToToken, previewBuy, refreshPositions, sendTransaction]);

    // Sell tokens
    const sellTokens = useCallback(async (
        tokenId: string,
        tokenAmount: string
    ): Promise<TradeResult> => {
        if (!telegramId) {
            return { success: false, error: "Not authenticated" };
        }

        try {
            // Server-side validation first
            const validationResponse = await fetch("/api/trade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tokenId,
                    type: "sell",
                    amount: tokenAmount,
                }),
            });

            if (!validationResponse.ok) {
                const errorData = await validationResponse.json();
                if (validationResponse.status === 429) {
                    return { success: false, error: `Rate limit exceeded. Try again in ${errorData.retryAfter}s` };
                }
                return { success: false, error: errorData.error || "Validation failed" };
            }

            const position = getPosition(tokenId);
            if (!position) {
                return { success: false, error: "No position found" };
            }

            const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
            if (!tokenDoc.exists()) {
                return { success: false, error: "Token not found" };
            }

            const token = docToToken(tokenDoc);

            // Check if user has enough balance
            if (BigInt(tokenAmount) > BigInt(position.balance)) {
                return {
                    success: false,
                    error: `Insufficient balance. You have ${position.balance} tokens`
                };
            }

            const preview = previewSell(tokenId, tokenAmount);
            if (!preview) {
                return { success: false, error: "Invalid amount" };
            }

            const sellAmount = BigInt(tokenAmount);
            const newSupply = BigInt(token.totalSupply) - sellAmount;
            const newPrice = getCurrentPrice(newSupply, token.bondingCurve);
            const newMarketCap = calculateMarketCap(newSupply, newPrice);

            // Update token
            await updateDoc(doc(dbfs, `tokens/${tokenId}`), {
                totalSupply: newSupply.toString(),
                currentPrice: newPrice.toString(),
                marketCap: newMarketCap.toString(),
                trades: increment(1),
                volume24h: increment(parseFloat(preview.tonReceived)),
            });

            // Update user position
            const positionRef = doc(dbfs, `users/${telegramId}/positions/${tokenId}`);
            const newBalance = BigInt(position.balance) - sellAmount;

            if (newBalance > BigInt(0)) {
                await updateDoc(positionRef, {
                    balance: newBalance.toString(),
                });
            } else {
                // Remove position if fully sold
                await updateDoc(positionRef, {
                    balance: "0",
                });
            }

            // Create trade record
            const tradeId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await setDoc(doc(dbfs, `tokens/${tokenId}/trades/${tradeId}`), {
                type: "sell",
                userId: telegramId,
                walletAddress: walletAddress || "",
                username: username || "Unknown",
                amount: tokenAmount,
                price: preview.averagePrice,
                totalTon: preview.tonReceived,
                fee: preview.fee,
                timestamp: serverTimestamp(),
                status: "completed",
            });

            // Collect platform fee (50% of trading fee goes to platform)
            const platformFeeNano = Math.floor(parseFloat(preview.fee) * 1e9 * (FEE_CONFIG.platformSharePercent / 100));
            if (platformFeeNano > 0) {
                sendTransaction({
                    to: PLATFORM_WALLET_ADDRESS,
                    value: String(platformFeeNano),
                }).catch(err => console.error("Fee collection failed:", err));
            }

            await refreshPositions();

            // Update price history for charts
            updatePriceCandle(tokenId, newPrice.toString()).catch(console.error);

            return {
                success: true,
                trade: {
                    id: tradeId,
                    tokenId,
                    type: "sell",
                    userId: telegramId,
                    amount: tokenAmount,
                    price: preview.averagePrice,
                    totalTon: preview.tonReceived,
                    timestamp: new Date(),
                    status: "completed",
                },
                newBalance: newBalance.toString(),
            };
        } catch (error) {
            console.error("Error selling tokens:", error);
            return { success: false, error: "Transaction failed" };
        }
    }, [telegramId, username, getPosition, docToToken, previewSell, refreshPositions, sendTransaction]);

    // Create new token
    const createToken = useCallback(async (params: CreateTokenParams): Promise<Token | null> => {
        if (!telegramId || !username) {
            console.error("Not authenticated");
            return null;
        }

        try {
            const tokenId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const bondingCurve = {
                ...DEFAULT_BONDING_CURVE,
                ...params.bondingCurve,
            };

            const initialPrice = getCurrentPrice(BigInt(0), bondingCurve);
            const tokenData = {
                name: params.name,
                nameLower: params.name.toLowerCase(),
                symbol: params.symbol.toUpperCase(),
                description: params.description,
                image: params.image,
                creatorId: telegramId,
                creatorAddress: walletAddress,
                creatorUsername: username,
                createdAt: serverTimestamp(),
                totalSupply: "0", // Creators start with 0 tokens
                currentPrice: initialPrice.toString(),
                marketCap: "0",
                volume24h: "0",
                priceChange24h: 0,
                bondingCurve,
                status: "bonding" as const,
                graduationThreshold: DEFAULT_GRADUATION_THRESHOLD_TON,
                holders: 0,
                trades: 0,
            };

            await setDoc(doc(dbfs, `tokens/${tokenId}`), tokenData);

            const token: Token = {
                id: tokenId,
                ...tokenData,
                createdAt: new Date(),
            };

            // Refresh token lists
            await refreshTokens();

            return token;
        } catch (error) {
            console.error("Error creating token:", error);
            return null;
        }
    }, [telegramId, username, refreshTokens]);

    // Get available to sell (simplified - no restrictions)
    const getAvailableToSell = useCallback((tokenId: string) => {
        const position = getPosition(tokenId);
        if (!position) {
            return { amount: "0", reason: "No position" };
        }
        // No restrictions - can sell full balance
        return { amount: position.balance, reason: "No restrictions" };
    }, [getPosition]);

    // Initial load
    useEffect(() => {
        refreshTokens();
    }, [refreshTokens]);

    // Load positions when user changes
    useEffect(() => {
        if (telegramId) {
            refreshPositions();
        }
    }, [telegramId, refreshPositions]);

    return (
        <TradingContext.Provider
            value={{
                trendingTokens,
                newTokens,
                searchResults,
                isLoading,
                searchTokens,
                clearSearch,
                positions,
                getPosition,
                refreshPositions,
                selectedToken,
                selectToken,
                clearSelectedToken,
                buyTokens,
                sellTokens,
                previewBuy,
                previewSell,
                createToken,
                getAvailableToSell,
                refreshTokens,
            }}
        >
            {children}
        </TradingContext.Provider>
    );
}

export function useTrading() {
    const context = useContext(TradingContext);
    if (!context) {
        throw new Error("useTrading must be used within a TradingProvider");
    }
    return context;
}
