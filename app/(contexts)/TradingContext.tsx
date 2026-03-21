"use client";

/**
 * QC RocketStart - Trading Provider (thin wrapper)
 *
 * All state and action logic lives in stores/trading-store.ts.
 * This Provider only:
 * 1. Runs TanStack Query hooks and syncs results into the store
 * 2. Syncs external dependencies (walletAddress, sendTransaction, etc.)
 * 3. Connects TONAPI WebSocket for real-time on-chain updates
 */

import React, { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserContext } from "./UserContext";
import { useWallet } from "@/app/wallet/WalletContext";
import {
  useTrendingTokens,
  useNewTokens,
  useGraduatedTokens,
  useMyTokens,
  useInvalidateTokenQueries,
} from "@/app/(hooks)/queries/use-trading";
import { useTradingStore } from "@/stores/trading-store";
import { useTonApiStream } from "@/app/(hooks)/use-tonapi-stream";
import { useShallow } from "zustand/shallow";

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const { telegramId } = useUserContext();
  const { walletAddress, sendTransaction } = useWallet();
  const queryClient = useQueryClient();

  // TanStack Query hooks for token data
  const trendingQuery = useTrendingTokens();
  const newQuery = useNewTokens();
  const graduatedQuery = useGraduatedTokens();
  const myTokensQuery = useMyTokens(telegramId, walletAddress);
  const invalidateTokenQueries = useInvalidateTokenQueries();

  const isLoading =
    trendingQuery.isFetching || newQuery.isFetching || graduatedQuery.isFetching;

  // Real-time on-chain updates via TONAPI WebSocket
  useTonApiStream();

  // Sync external dependencies into the store
  const refetchMyTokens = myTokensQuery.refetch;
  useEffect(() => {
    useTradingStore.getState().setDeps({
      walletAddress,
      telegramId,
      sendTransaction,
      invalidateTokenQueries,
      refetchMyTokens,
      queryClient,
    });
  }, [walletAddress, telegramId, sendTransaction, invalidateTokenQueries, refetchMyTokens, queryClient]);

  // Sync TanStack Query results into the store (flatten infinite query pages)
  useEffect(() => {
    useTradingStore.setState({
      trendingTokens: trendingQuery.data?.pages.flatMap(p => p.tokens) ?? [],
      newTokens: newQuery.data?.pages.flatMap(p => p.tokens) ?? [],
      graduatedTokens: graduatedQuery.data?.pages.flatMap(p => p.tokens) ?? [],
      myTokens: myTokensQuery.data?.pages.flatMap(p => p.tokens) ?? [],
      isLoading,
    });
  }, [trendingQuery.data, newQuery.data, graduatedQuery.data, myTokensQuery.data, isLoading]);

  // Refresh positions when wallet changes
  useEffect(() => {
    if (walletAddress) {
      useTradingStore.getState().refreshPositions();
    }
  }, [walletAddress]);

  // Initial on-chain enrichment when token lists first load
  useEffect(() => {
    const trendingLen = trendingQuery.data?.pages[0]?.tokens.length ?? 0;
    const newLen = newQuery.data?.pages[0]?.tokens.length ?? 0;

    if (trendingLen > 0 || newLen > 0) {
      useTradingStore.getState().refreshTokensOnChain();
    }
  }, [trendingQuery.data?.pages, newQuery.data?.pages]);

  return <>{children}</>;
}

// =====================================================
// Compatibility hook — consumers continue using useTrading() unchanged
// =====================================================
export const useTrading = () =>
  useTradingStore(
    useShallow((s) => ({
      trendingTokens: s.trendingTokens,
      newTokens: s.newTokens,
      graduatedTokens: s.graduatedTokens,
      searchResults: s.searchResults,
      isLoading: s.isLoading || s.isSearching,
      isBuying: s.isBuying,
      isSelling: s.isSelling,
      myTokens: s.myTokens,
      fetchMyTokens: s.fetchMyTokens,
      retryDeployToken: s.retryDeployToken,
      searchTokens: s.searchTokens,
      clearSearch: s.clearSearch,
      positions: s.positions,
      selectedToken: s.selectedToken,
      selectToken: s.selectToken,
      buyTokens: s.buyTokens,
      sellTokens: s.sellTokens,
      previewBuy: s.previewBuy,
      previewSell: s.previewSell,
      createToken: s.createToken,
      refreshTokens: s.refreshTokens,
      refreshPositions: s.refreshPositions,
      getPosition: s.getPosition,
    }))
  );
