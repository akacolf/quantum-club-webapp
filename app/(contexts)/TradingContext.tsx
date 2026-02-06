"use client";

/**
 * QC RocketStart - On-Chain Trading Context
 *
 * All trading operations happen directly on TON blockchain via smart contracts.
 * Firebase/Firestore is only used for metadata caching and indexing.
 *
 * TEP-74: https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { dbfs } from "@/app/(firebase)/client";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { Address, toNano, Cell } from "@ton/core";
import { useUserContext } from "./UserContext";
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
  getContractAdapter,
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
import { uploadTokenImage } from "@/lib/upload-image";
import { FEE_CONFIG } from "@/lib/platform-config";
import { getBalance, isContractActive } from "@/lib/ton-api";

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
  isBuying: boolean;
  isSelling: boolean;

  // User's created tokens (including pending deployments)
  myTokens: Token[];
  fetchMyTokens: () => Promise<void>;
  retryDeployToken: (
    tokenId: string
  ) => Promise<{ success: boolean; error?: string }>;

  // Search
  searchTokens: (query: string) => Promise<void>;
  clearSearch: () => void;

  // User positions (from on-chain queries)
  positions: HolderPosition[];

  // Selected token
  selectedToken: Token | null;
  selectToken: (tokenId: string) => Promise<void>;

  // On-chain trading (slippageTolerance is percentage, e.g., 0.05 = 5%)
  buyTokens: (
    tokenId: string,
    tonAmount: string,
    slippageTolerance?: number,
    isInitialBuy?: boolean
  ) => Promise<TradeResult>;
  sellTokens: (tokenId: string, tokenAmount: string) => Promise<TradeResult>;

  // Preview trades (on-chain queries)
  previewBuy: (
    tokenId: string,
    tonAmount: string
  ) => Promise<{
    tokensReceived: string;
    averagePrice: string;
    fee: string;
    newPrice: string;
  } | null>;
  previewSell: (
    tokenId: string,
    tokenAmount: string
  ) => Promise<{
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
  const { telegramId } = useUserContext();
  const { walletAddress, sendTransaction } = useWallet();

  // State
  const [trendingTokens, setTrendingTokens] = useState<Token[]>([]);
  const [newTokens, setNewTokens] = useState<Token[]>([]);
  const [graduatedTokens, setGraduatedTokens] = useState<Token[]>([]);
  const [myTokens, setMyTokens] = useState<Token[]>([]);
  const [searchResults, setSearchResults] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [positions, setPositions] = useState<HolderPosition[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  // Contract adapter for on-chain queries - uses TonAPI
  const [contractAdapter, setContractAdapter] = useState(() => getContractAdapter(false)); // Always mainnet

  // Initialize contract adapter on mount (sync, cached)
  useEffect(() => {
    const adapter = getContractAdapter(false); // Always mainnet
    setContractAdapter(adapter);
  }, []);

  // =====================================================
  // Helper: Convert Firestore doc to Token
  // =====================================================
  const docToToken = useCallback(
    (doc: { id: string; data: () => Record<string, unknown> }): Token => {
      const data = doc.data();
      return {
        id: doc.id,
        name: (data.name as string) || "",
        nameLower:
          (data.nameLower as string) ||
          ((data.name as string) || "").toLowerCase(),
        symbol: (data.symbol as string) || "",
        symbolLower:
          (data.symbolLower as string) ||
          ((data.symbol as string) || "").toLowerCase(),
        description: (data.description as string) || "",
        image: (data.image as string) || "",
        creatorId:
          (data.creatorId as string) || (data.creatorUserId as string) || "",
        creatorWallet:
          (data.creatorWallet as string) ||
          (data.creatorAddress as string) ||
          "",
        creatorUsername: (data.creatorUsername as string) || "",

        // On-chain data (fetched from blockchain)
        jettonMasterAddress: (data.jettonMasterAddress as string) || "",
        isOnChain: (data.isOnChain as boolean) || false,
        isDeployed: (data.isDeployed as boolean) || false,

        // Supply info
        maxSupply: (data.maxSupply as string) || "1000000000000000000", // 1B * 10^9
        totalSupply: (data.totalSupply as string) || "0",
        circulatingSupply:
          (data.circulatingSupply as string) ||
          (data.totalSupply as string) ||
          "0",
        tonReserve:
          (data.tonReserve as string) || (data.marketCap as string) || "0",

        // Price data
        currentPrice: (data.currentPrice as string) || "0",
        marketCap: (data.marketCap as string) || "0",

        // Metadata
        holders: (data.holders as number) || 0,
        trades: (data.trades as number) || 0,
        volume24h: (data.volume24h as number) || 0,
        priceChange24h: (data.priceChange24h as number) || 0,

        // Creator earnings
        creatorEarnings: (data.creatorEarnings as string) || "0",

        // Bonding curve config
        bondingCurve:
          (data.bondingCurve as { basePrice: string; slope: string }) ||
          DEFAULT_BONDING_CURVE,
        graduationThreshold:
          (data.graduationThreshold as string) ||
          DEFAULT_GRADUATION_THRESHOLD_TON,
        isGraduated: (data.isGraduated as boolean) || false,

        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(),
      };
    },
    []
  );

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

      // New = recently created (only show tokens with confirmed on-chain contracts)
      const newQuery = query(
        collection(dbfs, "tokens"),
        where("isOnChain", "==", true),
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
  // Refresh tokens with on-chain data (price, supply, etc.)
  // =====================================================
  const refreshTokensOnChain = useCallback(async () => {
    // Get all tokens that have jetton addresses
    const allTokens = [...trendingTokens, ...newTokens].filter(
      (t, i, arr) => t.jettonMasterAddress && arr.findIndex(x => x.id === t.id) === i
    );

    // Only refresh up to 5 tokens at a time to avoid rate limits
    const tokensToRefresh = allTokens.slice(0, 5);
    
    const enrichedUpdates: { id: string; data: Partial<Token> }[] = [];

    await Promise.all(
      tokensToRefresh.map(async (token) => {
        try {
          if (!token.jettonMasterAddress) return;
          
          const curveData = await getBondingCurveData(
            token.jettonMasterAddress,
            contractAdapter
          );

          if (curveData) {
            enrichedUpdates.push({
              id: token.id,
              data: {
                totalSupply: curveData.totalSupply.toString(),
                currentPrice: curveData.currentPrice.toString(),
                tonReserve: curveData.tonReserve.toString(),
                marketCap: curveData.tonReserve.toString(),
                graduationThreshold: curveData.graduationTarget.toString(),
                isGraduated: curveData.graduated,
              },
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch on-chain data for ${token.symbol}:`, error);
        }
      })
    );

    // Update trending tokens with on-chain data
    if (enrichedUpdates.length > 0) {
      setTrendingTokens((prev) =>
        prev.map((token) => {
          const update = enrichedUpdates.find((u) => u.id === token.id);
          return update ? { ...token, ...update.data } : token;
        })
      );

      setNewTokens((prev) =>
        prev.map((token) => {
          const update = enrichedUpdates.find((u) => u.id === token.id);
          return update ? { ...token, ...update.data } : token;
        })
      );
    }
  }, [trendingTokens, newTokens, contractAdapter]);

  // =====================================================
  // Fetch MY tokens (created by current user, including pending)
  // =====================================================
  const fetchMyTokens = useCallback(async () => {
    if (!telegramId && !walletAddress) {
      setMyTokens([]);
      return;
    }

    try {
      const tokenMap = new Map<string, Token>();

      // Query by telegramId (creatorUserId)
      if (telegramId) {
        const byUserIdQuery = query(
          collection(dbfs, "tokens"),
          where("creatorUserId", "==", telegramId),
          orderBy("createdAt", "desc"),
          limit(50)
        );
        const userIdSnapshot = await getDocs(byUserIdQuery);
        userIdSnapshot.docs.forEach((doc) => {
          tokenMap.set(doc.id, docToToken(doc));
        });
      }

      // Also query by wallet address (creatorAddress) for reliability
      if (walletAddress) {
        const byAddressQuery = query(
          collection(dbfs, "tokens"),
          where("creatorAddress", "==", walletAddress),
          orderBy("createdAt", "desc"),
          limit(50)
        );
        const addressSnapshot = await getDocs(byAddressQuery);
        addressSnapshot.docs.forEach((doc) => {
          tokenMap.set(doc.id, docToToken(doc));
        });
      }

      // Convert map to array, sorted by creation date (newest first)
      const tokens = Array.from(tokenMap.values()).sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      setMyTokens(tokens);
    } catch (error) {
      console.error("Error fetching my tokens:", error);
    }
  }, [telegramId, walletAddress, docToToken]);

  // =====================================================
  // Retry deploy token (for failed deployments)
  // =====================================================
  const retryDeployToken = useCallback(
    async (tokenId: string): Promise<{ success: boolean; error?: string }> => {
      if (!walletAddress || !telegramId) {
        return { success: false, error: "Wallet not connected" };
      }

      try {
        // Fetch token from Firestore to get details
        const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
        if (!tokenDoc.exists()) {
          return { success: false, error: "Token not found" };
        }

        const tokenData = tokenDoc.data();

        // Check if already deployed
        if (tokenData.isDeployed && tokenData.isOnChain) {
          return { success: false, error: "Token is already deployed" };
        }

        // Re-call the deploy API to get fresh stateInit
        const response = await fetch("/api/deploy-jetton", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: tokenData.name,
            symbol: tokenData.symbol,
            description: tokenData.description || "",
            image: tokenData.image || "",
            creatorAddress: walletAddress,
            tokenId: tokenId, // Pass tokenId to update existing record
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || "Failed to prepare deployment",
          };
        }

        const { jettonAddress, deployTx, success } = await response.json();

        if (!success || !deployTx) {
          return {
            success: false,
            error: "Failed to build deployment transaction",
          };
        }

        // Parse stateInit
        let stateInitCell: Cell | undefined;
        if (deployTx.stateInit) {
          const stateInitBuffer = Buffer.from(deployTx.stateInit, "base64");
          stateInitCell = Cell.fromBoc(stateInitBuffer)[0];
        }

        // Parse body
        let bodyCell: Cell | undefined;
        if (deployTx.body) {
          const bodyBuffer = Buffer.from(deployTx.body, "base64");
          bodyCell = Cell.fromBoc(bodyBuffer)[0];
        }

        // Send deployment transaction
        const txResult = await sendTransaction({
          to: deployTx.to,
          value: deployTx.value,
          stateInit: stateInitCell,
          body: bodyCell,
        });

        if (!txResult.success) {
          return {
            success: false,
            error: txResult.error || "Transaction failed",
          };
        }

        // Wait for on-chain confirmation using TonAPI
        let isDeployedOnChain = false;
        const maxRetries = 10;
        const retryDelay = 3000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));

          try {
            const isActive = await isContractActive(jettonAddress);

            if (isActive) {
              isDeployedOnChain = true;
              break;
            }
          } catch {
            // Status check failed, will retry
          }
        }

        if (isDeployedOnChain) {
          // Confirm deployment in database
          await fetch("/api/deploy-jetton", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tokenId,
              jettonAddress,
              txHash: txResult.txHash,
            }),
          }).catch(console.error);

          // Small delay to ensure Firestore write propagates
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Refresh my tokens list
          await fetchMyTokens();
          await fetchTokens();

          return { success: true };
        } else {
          return {
            success: false,
            error: "Deployment not confirmed. Please try again.",
          };
        }
      } catch (error) {
        console.error("Retry deploy error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Deployment failed",
        };
      }
    },
    [walletAddress, telegramId, sendTransaction, fetchMyTokens, fetchTokens]
  );

  // =====================================================
  // Search tokens
  // =====================================================
  const searchTokens = useCallback(
    async (searchQuery: string) => {
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
          limit(30) // Fetch more to filter
        );
        const snapshot = await getDocs(searchQ);
        // Filter to only show on-chain tokens
        const tokens = snapshot.docs.map(docToToken).filter((t) => t.isOnChain);
        setSearchResults(tokens.slice(0, 20));
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [docToToken]
  );

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

      const results: HolderPosition[] = [];

      // Process tokens sequentially to avoid rate limits (no API key = 1 req/sec limit)
      for (const docSnap of tokensSnapshot.docs) {
        const token = docToToken(docSnap);
        if (!token.jettonMasterAddress) continue;

        try {
          // Query on-chain balance
          const balance = await getJettonBalance(
            token.jettonMasterAddress,
            walletAddress,
            contractAdapter
          );

          if (balance > BigInt(0)) {
            results.push({
              tokenId: token.id,
              balance: balance.toString(),
              averageBuyPrice: "0", // Can't determine without indexing
              totalInvested: "0",
              currentValue: formatTokenAmount(balance),
              pnl: 0,
              pnlPercent: 0,
              token,
            });
          }

          // Small delay between requests to avoid rate limits
          await new Promise((r) => setTimeout(r, 100));
        } catch {
          // Token might not be deployed yet - silently ignore
        }
      }

      setPositions(results);
    } catch (error) {
      console.error("Error refreshing positions:", error);
    }
  }, [walletAddress, contractAdapter, docToToken]);

  // =====================================================
  // Select token (fetch on-chain data)
  // =====================================================
  const selectToken = useCallback(
    async (tokenId: string) => {
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
              contractAdapter
            );

            if (curveData) {
              token.totalSupply = curveData.totalSupply.toString();
              token.currentPrice = curveData.currentPrice.toString();
              token.isGraduated = curveData.graduated;
              // Set on-chain reserve data for accurate UI display
              token.tonReserve = curveData.tonReserve.toString();
              token.marketCap = curveData.tonReserve.toString(); // marketCap = TON reserve in bonding curve
              token.graduationThreshold = curveData.graduationTarget.toString();
            }
          } catch (error) {
            // Contract may not be fully deployed yet or may not have get_curve_data method
            // This is expected for newly deployed tokens - use cached Firestore data
            console.warn(
              "Could not fetch on-chain data (contract may still be deploying):",
              error instanceof Error ? error.message : error
            );
          }
        }

        setSelectedToken(token);
      } catch (error) {
        console.error("Error selecting token:", error);
      }
    },
    [docToToken, contractAdapter]
  );

  // =====================================================
  // Preview Buy (on-chain query with local fallback)
  // =====================================================
  const previewBuy = useCallback(
    async (tokenId: string, tonAmount: string) => {
      try {
        const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
        if (!tokenDoc.exists()) return null;

        const token = docToToken(tokenDoc);
        if (!token.jettonMasterAddress) return null;

        const tonNano = toNano(tonAmount);
        const tonAmountNum = parseFloat(tonAmount);

        // Get current price in TON (from nano)
        // Default to 1000 nanotons = 0.000001 TON (new initial price)
        const currentPriceNano = Number(token.currentPrice || "1000");
        const currentPriceTon = currentPriceNano / 1e9;

        // Try on-chain preview first
        let tokensOut = await previewBuyOnChain(
          token.jettonMasterAddress,
          tonNano,
          contractAdapter
        );

        // If on-chain preview fails, use local bonding curve calculation
        if (tokensOut === BigInt(0)) {
          // Apply trading fee (1% service fee + 0.1% referral fee = 1.1% total)
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

        const fee = (
          (tonAmountNum * FEE_CONFIG.totalTradingFeePercent) /
          100
        ).toFixed(4);
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
    },
    [docToToken, contractAdapter]
  );

  // =====================================================
  // Preview Sell (on-chain query with local fallback)
  // =====================================================
  const previewSell = useCallback(
    async (tokenId: string, tokenAmount: string) => {
      try {
        const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
        if (!tokenDoc.exists()) return null;

        const token = docToToken(tokenDoc);
        if (!token.jettonMasterAddress) return null;

        const tokenNano = parseTokenAmount(tokenAmount);
        const tokenAmountNum = parseFloat(tokenAmount);

        // Get current price in TON (from nano)
        // Default to 1000 nanotons = 0.000001 TON (new initial price)
        const currentPriceNano = Number(token.currentPrice || "1000");
        const currentPriceTon = currentPriceNano / 1e9;

        // Try on-chain preview first
        let tonOut = await previewSellOnChain(
          token.jettonMasterAddress,
          tokenNano,
          contractAdapter
        );

        // If on-chain preview fails, use local bonding curve calculation
        if (tonOut === BigInt(0)) {
          // Simple linear bonding curve approximation:
          // tonOut = tokens * currentPrice * (1 - fee)
          if (currentPriceTon > 0) {
            const feePercent = FEE_CONFIG.totalTradingFeePercent / 100;
            const tonNumeric =
              tokenAmountNum * currentPriceTon * (1 - feePercent);
            tonOut = BigInt(Math.floor(tonNumeric * 1e9)); // Convert to nano-TON
          }
        }

        if (tonOut === BigInt(0)) return null;

        const tonFormatted = formatTokenAmount(tonOut);
        // Calculate fee based on gross value (before fee deduction)
        const grossTonValue = tokenAmountNum * currentPriceTon;
        const fee = (
          (grossTonValue * FEE_CONFIG.totalTradingFeePercent) /
          100
        ).toFixed(4);

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
    },
    [docToToken, contractAdapter]
  );

  // =====================================================
  // BUY TOKENS (On-Chain with Slippage Protection)
  // =====================================================
  const buyTokens = useCallback(
    async (
      tokenId: string,
      tonAmount: string,
      slippageTolerance: number = 0.15, // Default 15% slippage (new tokens are volatile!)
      isInitialBuy: boolean = false // Skip some checks for initial buys after token creation
    ): Promise<TradeResult> => {
      if (!walletAddress) {
        return { success: false, error: "Wallet not connected" };
      }

      // Validate slippage tolerance bounds (0.1% to 50%)
      if (slippageTolerance < 0.001 || slippageTolerance > 0.5) {
        return { success: false, error: "Invalid slippage tolerance. Must be between 0.1% and 50%" };
      }

      setIsBuying(true);
      try {
        // CRITICAL: Check balance before proceeding
        const tonAmountNum = parseFloat(tonAmount);
        if (isNaN(tonAmountNum) || tonAmountNum <= 0) {
          return { success: false, error: "Invalid amount" };
        }

        // Minimum buy amount validation (contract gas requirements)
        // GAS_CONSUMPTION (0.015) + JETTON_WALLET_DEPLOY_GAS (0.1) + buffer
        const MIN_BUY = 0.15;
        if (tonAmountNum < MIN_BUY) {
          return {
            success: false,
            error: `Minimum buy amount is ${MIN_BUY} TON`,
          };
        }

        // Skip balance check for initial buy - already accounted for in token creation
        if (!isInitialBuy) {
          // Fetch current TON balance using TonAPI
          try {
            const balanceInNano = await getBalance(walletAddress);
            const balanceInTon = Number(balanceInNano) / 1e9;

            // Require extra 0.1 TON for gas fees
            const requiredTon = tonAmountNum + 0.1;
            if (balanceInTon < requiredTon) {
              return {
                success: false,
                error: `Insufficient balance. You need ${requiredTon.toFixed(
                  2
                )} TON (${tonAmountNum} + 0.1 gas) but have ${balanceInTon.toFixed(
                  4
                )} TON`,
              };
            }
          } catch (balanceError) {
            // Log but don't block - let the on-chain transaction handle it
            console.warn(
              "Balance check failed, proceeding anyway:",
              balanceError
            );
          }
        }

        // Get token data
        const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
        if (!tokenDoc.exists()) {
          return { success: false, error: "Token not found" };
        }

        const token = docToToken(tokenDoc);

        if (!token.jettonMasterAddress) {
          return { success: false, error: "Token not deployed on-chain" };
        }

        // Skip contract verification for initial buy - already verified in createToken
        if (!isInitialBuy) {
          // CRITICAL: Verify contract is active on blockchain using TonAPI
          try {
            const isActive = await isContractActive(token.jettonMasterAddress);

            if (!isActive) {
              return {
                success: false,
                error:
                  "Contract not active on blockchain. Deployment may have failed.",
              };
            }
          } catch {
            // Contract verification error, proceeding anyway
          }
        }

        if (token.isGraduated) {
          return { success: false, error: "Token graduated - trade on DEX" };
        }

        // Preview buy to calculate expected tokens
        const preview = await previewBuy(tokenId, tonAmount);
        let minTokensOut = BigInt(0);

        if (preview && preview.tokensReceived) {
          // Calculate minimum tokens with slippage tolerance
          const expectedTokens = BigInt(
            Math.floor(parseFloat(preview.tokensReceived) * 1e9)
          );
          const slippageMultiplier = 1 - slippageTolerance;
          minTokensOut = BigInt(
            Math.floor(Number(expectedTokens) * slippageMultiplier)
          );
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
          return {
            success: false,
            error: result.error || "Transaction failed",
          };
        }

        // NOTE: Trade is NOT logged to Firebase here
        // All trade data should come from on-chain transactions only
        
        // Refresh positions immediately and again after propagation delay
        refreshPositions();
        setTimeout(() => refreshPositions(), 5000);

        return {
          success: true,
          txHash: result.txHash,
        };
      } catch (error) {
        console.error("Buy error:", error);
        return { success: false, error: "Transaction failed" };
      } finally {
        setIsBuying(false);
      }
    },
    [
      walletAddress,
      telegramId,
      docToToken,
      sendTransaction,
      refreshPositions,
      previewBuy,
    ]
  );

  // =====================================================
  // SELL TOKENS (On-Chain)
  // =====================================================
  const sellTokens = useCallback(
    async (tokenId: string, tokenAmount: string): Promise<TradeResult> => {
      if (!walletAddress) {
        return { success: false, error: "Wallet not connected" };
      }

      setIsSelling(true);
      try {
        // CRITICAL: Validate amount
        const tokenAmountNum = parseFloat(tokenAmount);
        if (isNaN(tokenAmountNum) || tokenAmountNum <= 0) {
          return { success: false, error: "Invalid amount" };
        }

        // Check TON balance for gas fees using TonAPI
        try {
          const balanceInNano = await getBalance(walletAddress);
          const balanceInTon = Number(balanceInNano) / 1e9;

          // Require 0.15 TON for gas fees
          const requiredGas = 0.15;
          if (balanceInTon < requiredGas) {
            return {
              success: false,
              error: `Insufficient TON for gas. You need at least ${requiredGas} TON but have ${balanceInTon.toFixed(
                4
              )} TON`,
            };
          }
        } catch (balanceError) {
          console.warn(
            "Balance check failed, proceeding anyway:",
            balanceError
          );
        }

        // Get token data
        const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
        if (!tokenDoc.exists()) {
          return { success: false, error: "Token not found" };
        }

        const token = docToToken(tokenDoc);

        if (!token.jettonMasterAddress) {
          return { success: false, error: "Token not deployed on-chain" };
        }

        // CRITICAL: Verify contract is active using TonAPI
        try {
          const isActive = await isContractActive(token.jettonMasterAddress);

          if (!isActive) {
            return {
              success: false,
              error: "Contract not active on blockchain",
            };
          }
        } catch {
          // Contract verification error, proceeding anyway
        }

        if (token.isGraduated) {
          return { success: false, error: "Token graduated - trade on DEX" };
        }

        // Get user's Jetton wallet address
        const jettonWalletAddress = await getJettonWalletAddress(
          token.jettonMasterAddress,
          walletAddress,
          contractAdapter
        );

        if (!jettonWalletAddress) {
          return { success: false, error: "Jetton wallet not found" };
        }

        // CRITICAL: Check user's token balance before selling
        const userTokenBalance = await getJettonBalance(
          token.jettonMasterAddress,
          walletAddress,
          contractAdapter
        );

        const tokenNano = parseTokenAmount(tokenAmount);
        if (userTokenBalance < tokenNano) {
          const userBalanceFormatted = (Number(userTokenBalance) / 1e9).toFixed(
            4
          );
          const requestedFormatted = (Number(tokenNano) / 1e9).toFixed(4);
          return {
            success: false,
            error: `Insufficient token balance. You have ${userBalanceFormatted} tokens but tried to sell ${requestedFormatted}`,
          };
        }

        // Note: Preview is no longer needed since we don't log trades to Firebase
        // The contract handles the bonding curve calculation on-chain

        // Build burn message (sell = burn tokens to get TON back)
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
          return {
            success: false,
            error: result.error || "Transaction failed",
          };
        }

        // NOTE: Trade is NOT logged to Firebase here
        // All trade data should come from on-chain transactions only
        // This is intentional - logging before confirmation causes fake data

        // Refresh positions immediately and again after propagation delay
        refreshPositions();
        setTimeout(() => refreshPositions(), 5000);

        return {
          success: true,
          txHash: result.txHash,
        };
      } catch (error) {
        console.error("Sell error:", error);
        return { success: false, error: "Transaction failed" };
      } finally {
        setIsSelling(false);
      }
    },
    [
      walletAddress,
      telegramId,
      docToToken,
      contractAdapter,
      sendTransaction,
      refreshPositions,
      previewSell,
    ]
  );

  // =====================================================
  // CREATE TOKEN (Deploy on-chain)
  // =====================================================
  const createToken = useCallback(
    async (params: CreateTokenParams): Promise<Token | null> => {
      if (!walletAddress || !telegramId) {
        return null;
      }

      try {
        const tempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        let imageUrl = params.image;

        // Upload base64 image to R2 if provided
        if (params.image?.startsWith("data:")) {
          const uploaded = await uploadTokenImage(tempId, params.image);
          if (uploaded) {
            imageUrl = uploaded;
          } else {
            console.warn(
              "Image upload failed - token will be created without image"
            );
            imageUrl = ""; // Clear the base64 data since it can't be stored on-chain
          }
        }

        const response = await fetch("/api/deploy-jetton", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: params.name,
            symbol: params.symbol,
            description: params.description,
            image: imageUrl,
            creatorAddress: walletAddress,
          }),
        });

        if (!response.ok) {
          const responseText = await response.text();
          let errorMessage = "Token creation failed";
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            console.error(
              "Token creation failed - raw response:",
              response.status,
              responseText
            );
          }

          // Log with context
          console.error(
            "Token creation failed:",
            response.status,
            errorMessage
          );

          // Throw specific errors that can be shown to users
          if (response.status === 409) {
            throw new Error(
              `Symbol "${params.symbol}" already exists. Please choose a different symbol.`
            );
          } else if (response.status === 429) {
            throw new Error(
              "Rate limit exceeded. You can create max 3 tokens per hour."
            );
          } else {
            throw new Error(errorMessage);
          }
        }

        const { tokenId, jettonAddress, deployTx, success } =
          await response.json();

        if (!success || !deployTx) {
          return null;
        }

        // Send deployment transaction from user's wallet (client-side)
        // This ensures the token is actually deployed on-chain
        try {
          let stateInitCell: Cell | undefined;
          if (deployTx.stateInit) {
            const stateInitBuffer = Buffer.from(deployTx.stateInit, "base64");
            stateInitCell = Cell.fromBoc(stateInitBuffer)[0];
          }

          // Parse the body if provided
          let bodyCell: Cell | undefined;
          if (deployTx.body) {
            const bodyBuffer = Buffer.from(deployTx.body, "base64");
            bodyCell = Cell.fromBoc(bodyBuffer)[0];
          }

          // Send deployment transaction
          const txResult = await sendTransaction({
            to: deployTx.to,
            value: deployTx.value,
            stateInit: stateInitCell,
            body: bodyCell,
          });

          if (txResult.success) {
            // CRITICAL: Wait for on-chain confirmation using TonAPI
            let isDeployedOnChain = false;
            const maxRetries = 10;
            const retryDelay = 3000; // 3 seconds between retries

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              await new Promise((resolve) => setTimeout(resolve, retryDelay));

              try {
                const isActive = await isContractActive(jettonAddress);

                if (isActive) {
                  isDeployedOnChain = true;
                  break;
                }
              } catch {
                // Status check failed, will retry
              }
            }

            if (isDeployedOnChain) {
              // Only confirm deployment if contract is actually active
              await fetch("/api/deploy-jetton", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tokenId,
                  jettonAddress,
                  txHash: txResult.txHash,
                }),
              }).catch(console.error);

              // If initial buy is specified, execute it after CONFIRMED deployment
              if (
                params.initialBuyAmount &&
                parseFloat(params.initialBuyAmount) > 0
              ) {
                // Extra wait for contract indexing
                await new Promise((resolve) => setTimeout(resolve, 2000));

                // Execute initial buy with isInitialBuy flag to skip redundant checks
                const buyResult = await buyTokens(
                  tokenId,
                  params.initialBuyAmount,
                  0.05, // default slippage
                  true // isInitialBuy - skip balance/contract checks already done
                );
                if (!buyResult.success) {
                  console.warn(
                    "Initial buy failed (token still created):",
                    buyResult.error
                  );
                }
              }
            } else {
              console.error(
                "Contract deployment not confirmed after",
                maxRetries,
                "attempts"
              );
              // Don't confirm deployment - leave isDeployed as false
              // This prevents users from trading a non-existent contract
            }
          } else {
            console.error("Deployment transaction failed:", txResult.error);
            // Token doc was created, but deployment failed
            // isDeployed remains false, preventing trades
          }
        } catch (deployError) {
          console.error("Failed to send deployment transaction:", deployError);
          // Continue anyway - server-side deployment may succeed
        }

        // Refresh token lists so the new token appears immediately
        await fetchTokens();
        await fetchMyTokens();

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
    },
    [
      walletAddress,
      telegramId,
      docToToken,
      sendTransaction,
      buyTokens,
      fetchTokens,
      fetchMyTokens,
    ]
  );

  // =====================================================
  // Get position helper
  // =====================================================
  const getPosition = useCallback(
    (tokenId: string): HolderPosition | null => {
      return positions.find((p) => p.tokenId === tokenId) || null;
    },
    [positions]
  );

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

  useEffect(() => {
    if (telegramId || walletAddress) {
      fetchMyTokens();
    }
  }, [telegramId, walletAddress, fetchMyTokens]);

  // Refresh on-chain data for displayed tokens periodically
  useEffect(() => {
    // Initial on-chain refresh after tokens load
    if (trendingTokens.length > 0 || newTokens.length > 0) {
      refreshTokensOnChain();
    }

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      refreshTokensOnChain();
    }, 30000);

    return () => clearInterval(interval);
  }, [trendingTokens.length, newTokens.length, refreshTokensOnChain]);

  // =====================================================
  // Context Value
  // =====================================================
  const value: TradingContextType = {
    trendingTokens,
    newTokens,
    graduatedTokens,
    searchResults,
    isLoading,
    isBuying,
    isSelling,
    myTokens,
    fetchMyTokens,
    retryDeployToken,
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
    <TradingContext.Provider value={value}>{children}</TradingContext.Provider>
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
