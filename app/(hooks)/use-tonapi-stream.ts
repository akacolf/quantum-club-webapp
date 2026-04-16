"use client";

/**
 * useTonApiStream — Real-time token data via TONAPI WebSocket.
 *
 * Subscribes to all active token contract addresses and listens for
 * buy/sell/graduate events. On any event, immediately refetches
 * bonding curve data and invalidates relevant TanStack Query caches.
 */

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TonApiWebSocket } from "@/lib/tonapi-ws";
import { useTradingStore } from "@/stores/trading-store";
import {
  getBondingCurveData,
  getContractAdapter,
} from "@/lib/jetton-operations";
import { ROCKETSTART_TESTNET } from "@/lib/platform-config";
import type { Token } from "@/types/trading";

const contractAdapter = getContractAdapter(ROCKETSTART_TESTNET);

export function useTonApiStream() {
  const queryClient = useQueryClient();
  const wsRef = useRef<TonApiWebSocket | null>(null);

  // Build a map of address → token ID for fast lookup
  const addressMapRef = useRef<Map<string, string>>(new Map());

  const handleEvent = useCallback(
    async (accountId: string, _txHash: string) => {
      // Normalize: TONAPI returns raw address like "0:abc..."
      // Find matching token by checking if address ends match
      const store = useTradingStore.getState();
      const allTokens = [
        ...(store.trendingTokens ?? []),
        ...(store.newTokens ?? []),
      ];

      const matchedToken = allTokens.find((t) => {
        if (!t.jettonMasterAddress) return false;
        try {
          // Compare raw addresses
          return t.jettonMasterAddress === accountId ||
            accountId.includes(t.jettonMasterAddress) ||
            t.jettonMasterAddress.includes(accountId);
        } catch {
          return false;
        }
      });

      // Refetch bonding curve data for the affected token
      if (matchedToken?.jettonMasterAddress) {
        try {
          const curveData = await getBondingCurveData(
            matchedToken.jettonMasterAddress,
            contractAdapter
          );

          if (curveData) {
            const update: Partial<Token> = {
              totalSupply: curveData.totalSupply.toString(),
              currentPrice: curveData.currentPrice.toString(),
              tonReserve: curveData.tonReserve.toString(),
              marketCap: curveData.tonReserve.toString(),
              graduationThreshold: curveData.graduationTarget.toString(),
              isGraduated: curveData.graduated,
            };

            // Estimate volume/trade delta from tonReserve change
            const oldReserve = BigInt(matchedToken.tonReserve || matchedToken.marketCap || "0");
            const newReserve = curveData.tonReserve;
            const reserveDelta = newReserve > oldReserve
              ? newReserve - oldReserve
              : oldReserve - newReserve;
            const tradeTonValue = Number(reserveDelta) / 1e9;

            update.trades = (matchedToken.trades || 0) + 1;
            update.volume24h = (matchedToken.volume24h || 0) + tradeTonValue;

            // Update TanStack Query cache directly
            const updateList = (tokens: Token[] | undefined) =>
              tokens?.map((t) =>
                t.id === matchedToken.id ? { ...t, ...update } : t
              );

            queryClient.setQueryData<Token[]>(["tokens", "trending"], updateList);
            queryClient.setQueryData<Token[]>(["tokens", "new"], updateList);

            // Update selected token if it matches
            const { selectedToken } = useTradingStore.getState();
            if (selectedToken?.id === matchedToken.id) {
              useTradingStore.setState({
                selectedToken: { ...selectedToken, ...update },
              });
            }
          }
        } catch (err) {
          console.warn(`[ws] Failed to refetch curve data for ${matchedToken.symbol}:`, err);
        }
      }

      // Invalidate queries scoped to the affected token's address (matches query key structure)
      const addr = matchedToken?.jettonMasterAddress ?? accountId;
      queryClient.invalidateQueries({ queryKey: ["liveTrades", addr] });
      queryClient.invalidateQueries({ queryKey: ["tradeEvents", addr] });
      queryClient.invalidateQueries({ queryKey: ["onChainStats", addr] });
      // Global trades must stay broad — it aggregates across all tokens
      queryClient.invalidateQueries({ queryKey: ["globalTrades"] });
    },
    [queryClient]
  );

  // Initialize WebSocket
  useEffect(() => {
    const ws = new TonApiWebSocket(handleEvent);
    wsRef.current = ws;
    ws.connect();

    return () => {
      ws.dispose();
      wsRef.current = null;
    };
  }, [handleEvent]);

  // Subscribe to token addresses whenever token lists change
  useEffect(() => {
    const unsubscribe = useTradingStore.subscribe((state) => {
      const allTokens = [
        ...(state.trendingTokens ?? []),
        ...(state.newTokens ?? []),
      ];

      const addresses = allTokens
        .map((t) => t.jettonMasterAddress)
        .filter(Boolean) as string[];

      // Deduplicate
      const unique = [...new Set(addresses)];

      if (unique.length > 0 && wsRef.current) {
        wsRef.current.setAccounts(unique);
      }

      // Update address map
      addressMapRef.current.clear();
      for (const t of allTokens) {
        if (t.jettonMasterAddress) {
          addressMapRef.current.set(t.jettonMasterAddress, t.id);
        }
      }
    });

    return unsubscribe;
  }, []);
}
