"use client";

import { create } from "zustand";
import type { Token, HolderPosition, CreateTokenParams, TradeResult } from "@/types/trading";

interface TradingState {
    // Token discovery (synced from TanStack Query)
    trendingTokens: Token[];
    newTokens: Token[];
    graduatedTokens: Token[];
    searchResults: Token[];
    isLoading: boolean;
    isBuying: boolean;
    isSelling: boolean;

    // User's created tokens
    myTokens: Token[];

    // User positions (from on-chain queries)
    positions: HolderPosition[];

    // Selected token
    selectedToken: Token | null;
}

interface TradingActions {
    // Setters for bridge sync
    setSearchResults: (results: Token[]) => void;
    setIsLoading: (v: boolean) => void;
    setIsBuying: (v: boolean) => void;
    setIsSelling: (v: boolean) => void;
    setPositions: (p: HolderPosition[]) => void;
    setSelectedToken: (t: Token | null) => void;

    // Actions — set by bridge hook (depend on React hooks)
    fetchMyTokens: () => Promise<void>;
    retryDeployToken: (tokenId: string) => Promise<{ success: boolean; error?: string }>;
    searchTokens: (query: string) => Promise<void>;
    clearSearch: () => void;
    selectToken: (tokenId: string) => Promise<void>;
    buyTokens: (tokenId: string, tonAmount: string, slippageTolerance?: number, isInitialBuy?: boolean) => Promise<TradeResult>;
    sellTokens: (tokenId: string, tokenAmount: string) => Promise<TradeResult>;
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
    createToken: (params: CreateTokenParams) => Promise<Token | null>;
    refreshTokens: () => Promise<void>;
    refreshPositions: () => Promise<void>;
    getPosition: (tokenId: string) => HolderPosition | null;
}

export type TradingStore = TradingState & TradingActions;

export const useTradingStore = create<TradingStore>()((set, get) => ({
    // State defaults
    trendingTokens: [],
    newTokens: [],
    graduatedTokens: [],
    searchResults: [],
    isLoading: false,
    isBuying: false,
    isSelling: false,
    myTokens: [],
    positions: [],
    selectedToken: null,

    // Setters
    setSearchResults: (results) => set({ searchResults: results }),
    setIsLoading: (v) => set({ isLoading: v }),
    setIsBuying: (v) => set({ isBuying: v }),
    setIsSelling: (v) => set({ isSelling: v }),
    setPositions: (p) => set({ positions: p }),
    setSelectedToken: (t) => set({ selectedToken: t }),

    // Placeholder actions — overridden by useTradingBridge
    fetchMyTokens: async () => {},
    retryDeployToken: async () => ({ success: false, error: "Not initialized" }),
    searchTokens: async () => {},
    clearSearch: () => set({ searchResults: [] }),
    selectToken: async () => {},
    buyTokens: async () => ({ success: false, error: "Not initialized" }),
    sellTokens: async () => ({ success: false, error: "Not initialized" }),
    previewBuy: async () => null,
    previewSell: async () => null,
    createToken: async () => null,
    refreshTokens: async () => {},
    refreshPositions: async () => {},
    getPosition: (tokenId) => get().positions.find((p) => p.tokenId === tokenId) || null,
}));
