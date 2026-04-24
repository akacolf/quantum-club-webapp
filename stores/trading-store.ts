"use client";

import { create } from "zustand";
import { dbfs } from "@/app/(firebase)/client";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { Address, toNano, Cell } from "@ton/core";
import type {
  Token,
  HolderPosition,
  CreateTokenParams,
  TradeResult,
  BondingCurveParams,
} from "@/types/trading";
import {
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
import { deployJetton as deployJettonAction, confirmJettonDeployment } from "@/app/ecosystem/trade/actions";
import { FEE_CONFIG, ROCKETSTART_TESTNET } from "@/lib/platform-config";
import { getBalance, isContractActive } from "@/lib/ton-api";
import { analyticsEvents } from "@/lib/telegramAnalytics";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

// =====================================================
// External dependencies injected by TradingProvider
// =====================================================
export interface TradingDeps {
  walletAddress: string;
  telegramId: string | null;
  sendTransaction: (params: {
    to: string;
    value: string;
    body?: Cell;
    stateInit?: Cell;
    bounce?: boolean;
  }) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  invalidateTokenQueries: () => void;
  refetchMyTokens: () => void;
  queryClient: QueryClient;
}

// =====================================================
// Helper: Convert Firestore doc to Token (pure function)
// =====================================================
function docToToken(d: { id: string; data: () => Record<string, unknown> }): Token {
  const data = d.data();
  return {
    id: d.id,
    name: (data.name as string) || "",
    nameLower: (data.nameLower as string) || ((data.name as string) || "").toLowerCase(),
    symbol: (data.symbol as string) || "",
    symbolLower: (data.symbolLower as string) || ((data.symbol as string) || "").toLowerCase(),
    description: (data.description as string) || "",
    image: (data.image as string) || "",
    creatorId: (data.creatorId as string) || (data.creatorUserId as string) || "",
    creatorWallet: (data.creatorWallet as string) || (data.creatorAddress as string) || "",
    creatorUsername: (data.creatorUsername as string) || "",
    jettonMasterAddress: (data.jettonMasterAddress as string) || "",
    isOnChain: (data.isOnChain as boolean) || false,
    isDeployed: (data.isDeployed as boolean) || false,
    maxSupply: (data.maxSupply as string) || "1000000000000000000",
    totalSupply: (data.totalSupply as string) || "0",
    circulatingSupply: (data.circulatingSupply as string) || (data.totalSupply as string) || "0",
    tonReserve: (data.tonReserve as string) || (data.marketCap as string) || "0",
    currentPrice: (data.currentPrice as string) || "0",
    marketCap: (data.marketCap as string) || "0",
    holders: (data.holders as number) || 0,
    trades: (data.trades as number) || 0,
    volume24h: (data.volume24h as number) || 0,
    priceChange24h: (data.priceChange24h as number) || 0,
    creatorEarnings: (data.creatorEarnings as string) || "0",
    communityChatId: (data.communityChatId as string) || undefined,
    bondingCurve: (data.bondingCurve as BondingCurveParams) || DEFAULT_BONDING_CURVE,
    graduationThreshold: (data.graduationThreshold as string) || DEFAULT_GRADUATION_THRESHOLD_TON,
    isGraduated: (data.isGraduated as boolean) || false,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
  };
}

// Contract adapter (testnet for RocketStart)
const contractAdapter = getContractAdapter(ROCKETSTART_TESTNET);

// =====================================================
// Store
// =====================================================

interface TradingState {
  trendingTokens: Token[];
  newTokens: Token[];
  graduatedTokens: Token[];
  searchResults: Token[];
  isLoading: boolean;
  isSearching: boolean;
  isBuying: boolean;
  isSelling: boolean;
  myTokens: Token[];
  positions: HolderPosition[];
  selectedToken: Token | null;
  _deps: TradingDeps;
}

interface TradingActions {
  setDeps: (deps: Partial<TradingDeps>) => void;
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
  refreshTokensOnChain: () => Promise<void>;
  getPosition: (tokenId: string) => HolderPosition | null;
}

export type TradingStore = TradingState & TradingActions;

const defaultDeps: TradingDeps = {
  walletAddress: "",
  telegramId: null,
  sendTransaction: async () => ({ success: false, error: "Not initialized" }),
  invalidateTokenQueries: () => {},
  refetchMyTokens: () => {},
  queryClient: null as unknown as QueryClient,
};

type TokenPage = {
  tokens: Token[];
  lastDoc?: unknown;
};

type TokenQueryData = Token[] | InfiniteData<TokenPage>;

function updateTokenQueryData(
  data: TokenQueryData | undefined,
  updateToken: (token: Token) => Token,
): TokenQueryData | undefined {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(updateToken);
  }

  if (Array.isArray(data.pages)) {
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        tokens: Array.isArray(page.tokens) ? page.tokens.map(updateToken) : page.tokens,
      })),
    };
  }

  return data;
}

export const useTradingStore = create<TradingStore>()((set, get) => ({
  // State defaults
  trendingTokens: [],
  newTokens: [],
  graduatedTokens: [],
  searchResults: [],
  isLoading: false,
  isSearching: false,
  isBuying: false,
  isSelling: false,
  myTokens: [],
  positions: [],
  selectedToken: null,
  _deps: defaultDeps,

  setDeps: (deps) => set((s) => ({ _deps: { ...s._deps, ...deps } })),

  // =====================================================
  // Actions
  // =====================================================

  fetchMyTokens: async () => {
    get()._deps.refetchMyTokens();
  },

  refreshTokens: async () => {
    get()._deps.invalidateTokenQueries();
  },

  searchTokens: async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      set({ searchResults: [] });
      return;
    }

    // Track request ID to prevent stale search results from overwriting newer ones
    const requestId = Date.now();
    (useTradingStore as any)._lastSearchRequestId = requestId;

    set({ isSearching: true });
    try {
      const q = searchQuery.toLowerCase();
      const networkFilter = ROCKETSTART_TESTNET ? "testnet" : "mainnet";
      const searchQ = query(
        collection(dbfs, "tokens"),
        where("network", "==", networkFilter),
        where("nameLower", ">=", q),
        where("nameLower", "<=", q + "\uf8ff"),
        limit(30)
      );
      const snapshot = await getDocs(searchQ);
      // Abort if a newer search was made while we were fetching
      if ((useTradingStore as any)._lastSearchRequestId !== requestId) return;
      const tokens = snapshot.docs.map(docToToken).filter((t) => t.isOnChain);
      set({ searchResults: tokens.slice(0, 20) });
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      if ((useTradingStore as any)._lastSearchRequestId === requestId) {
        set({ isSearching: false });
      }
    }
  },

  clearSearch: () => set({ searchResults: [] }),

  selectToken: async (tokenId: string) => {
    // Clear previous token immediately to prevent stale data during transitions
    const prev = get().selectedToken;
    if (prev?.id !== tokenId) {
      set({ selectedToken: null });
    }

    // Track request ID to prevent stale async responses from overwriting newer selections
    const requestId = Date.now();
    (useTradingStore as any)._lastSelectRequestId = requestId;

    try {
      const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
      // Abort if a newer selectToken call was made while we were fetching
      if ((useTradingStore as any)._lastSelectRequestId !== requestId) return;

      if (!tokenDoc.exists()) {
        set({ selectedToken: null });
        return;
      }

      let token = docToToken(tokenDoc);

      if (token.isOnChain && token.jettonMasterAddress) {
        try {
          const curveData = await getBondingCurveData(
            token.jettonMasterAddress,
            contractAdapter
          );
          // Abort if a newer selectToken call was made
          if ((useTradingStore as any)._lastSelectRequestId !== requestId) return;

          if (curveData) {
            token = {
              ...token,
              totalSupply: curveData.totalSupply.toString(),
              currentPrice: curveData.currentPrice.toString(),
              isGraduated: curveData.graduated,
              tonReserve: curveData.tonReserve.toString(),
              marketCap: curveData.tonReserve.toString(),
              graduationThreshold: curveData.graduationTarget.toString(),
            };
          }
        } catch (error) {
          console.warn(
            "Could not fetch on-chain data (contract may still be deploying):",
            error instanceof Error ? error.message : error
          );
        }
      }

      // Final check before writing to state
      if ((useTradingStore as any)._lastSelectRequestId !== requestId) return;
      set({ selectedToken: token });
    } catch (error) {
      console.error("Error selecting token:", error);
      if ((useTradingStore as any)._lastSelectRequestId === requestId) {
        set({ selectedToken: null });
      }
    }
  },

  previewBuy: async (tokenId: string, tonAmount: string) => {
    try {
      const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
      if (!tokenDoc.exists()) return null;

      const token = docToToken(tokenDoc);
      if (!token.jettonMasterAddress) return null;

      const tonNano = toNano(tonAmount);
      const tonAmountNum = parseFloat(tonAmount);

      const currentPriceNano = Number(token.currentPrice || "1000");
      const currentPriceTon = currentPriceNano / 1e9;

      let tokensOut = await previewBuyOnChain(
        token.jettonMasterAddress,
        tonNano,
        contractAdapter
      );

      if (tokensOut === BigInt(0)) {
        const feePercent = FEE_CONFIG.totalTradingFeePercent / 100;
        const tonAfterFee = tonAmountNum * (1 - feePercent);
        if (currentPriceTon > 0) {
          const tokensNumeric = tonAfterFee / currentPriceTon;
          tokensOut = BigInt(Math.floor(tokensNumeric * 1e9));
        }
      }

      if (tokensOut === BigInt(0)) return null;

      const fee = ((tonAmountNum * FEE_CONFIG.totalTradingFeePercent) / 100).toFixed(4);
      const tokensFormatted = formatTokenAmount(tokensOut);

      return {
        tokensReceived: tokensFormatted,
        averagePrice: currentPriceTon.toFixed(9),
        fee,
        newPrice: currentPriceTon.toFixed(9),
      };
    } catch (error) {
      console.error("Preview buy error:", error);
      return null;
    }
  },

  previewSell: async (tokenId: string, tokenAmount: string) => {
    try {
      const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
      if (!tokenDoc.exists()) return null;

      const token = docToToken(tokenDoc);
      if (!token.jettonMasterAddress) return null;

      const tokenNano = parseTokenAmount(tokenAmount);
      const tokenAmountNum = parseFloat(tokenAmount);

      const currentPriceNano = Number(token.currentPrice || "1000");
      const currentPriceTon = currentPriceNano / 1e9;

      let tonOut = await previewSellOnChain(
        token.jettonMasterAddress,
        tokenNano,
        contractAdapter
      );

      if (tonOut === BigInt(0)) {
        if (currentPriceTon > 0) {
          const feePercent = FEE_CONFIG.totalTradingFeePercent / 100;
          const tonNumeric = tokenAmountNum * currentPriceTon * (1 - feePercent);
          tonOut = BigInt(Math.floor(tonNumeric * 1e9));
        }
      }

      if (tonOut === BigInt(0)) return null;

      const tonFormatted = formatTokenAmount(tonOut);
      const grossTonValue = tokenAmountNum * currentPriceTon;
      const fee = ((grossTonValue * FEE_CONFIG.totalTradingFeePercent) / 100).toFixed(4);

      return {
        tonReceived: tonFormatted,
        averagePrice: currentPriceTon.toFixed(9),
        fee,
        newPrice: currentPriceTon.toFixed(9),
      };
    } catch (error) {
      console.error("Preview sell error:", error);
      return null;
    }
  },

  buyTokens: async (
    tokenId: string,
    tonAmount: string,
    slippageTolerance: number = 0.15,
    isInitialBuy: boolean = false
  ): Promise<TradeResult> => {
    const { _deps } = get();
    const { walletAddress, sendTransaction } = _deps;

    if (!walletAddress) {
      return { success: false, error: "Wallet not connected" };
    }

    if (get().isBuying) {
      return { success: false, error: "Buy already in progress" };
    }

    if (slippageTolerance < 0.001 || slippageTolerance > 0.5) {
      return { success: false, error: "Invalid slippage tolerance. Must be between 0.1% and 50%" };
    }

    set({ isBuying: true });
    try {
      const tonAmountNum = parseFloat(tonAmount);
      if (isNaN(tonAmountNum) || tonAmountNum <= 0) {
        return { success: false, error: "Invalid amount" };
      }

      const MIN_BUY = 0.15;
      if (tonAmountNum < MIN_BUY) {
        return { success: false, error: `Minimum buy amount is ${MIN_BUY} TON` };
      }

      if (!isInitialBuy) {
        try {
          const balanceInNano = await getBalance(walletAddress, ROCKETSTART_TESTNET);
          const balanceInTon = Number(balanceInNano) / 1e9;
          const requiredTon = tonAmountNum + 0.1;
          if (balanceInTon < requiredTon) {
            return {
              success: false,
              error: `Insufficient balance. You need ${requiredTon.toFixed(2)} TON (${tonAmountNum} + 0.1 gas) but have ${balanceInTon.toFixed(4)} TON`,
            };
          }
        } catch (balanceError) {
          console.warn("Balance check failed, proceeding anyway:", balanceError);
        }
      }

      const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
      if (!tokenDoc.exists()) {
        return { success: false, error: "Token not found" };
      }

      const token = docToToken(tokenDoc);
      if (!token.jettonMasterAddress) {
        return { success: false, error: "Token not deployed on-chain" };
      }

      if (!isInitialBuy) {
        try {
          const isActive = await isContractActive(token.jettonMasterAddress, ROCKETSTART_TESTNET);
          if (!isActive) {
            return { success: false, error: "Contract not active on blockchain. Deployment may have failed." };
          }
        } catch {
          // Contract verification error, proceeding anyway
        }
      }

      if (token.isGraduated) {
        return { success: false, error: "Token graduated - trade on DEX" };
      }

      const preview = await get().previewBuy(tokenId, tonAmount);
      let minTokensOut = BigInt(0);
      if (preview && preview.tokensReceived) {
        // Use BigInt arithmetic to avoid precision loss on large amounts
        const expectedTokens = parseTokenAmount(preview.tokensReceived);
        // slippageTolerance is e.g. 0.15 for 15%. Scale to basis points for integer math.
        const slippageBps = BigInt(Math.round(slippageTolerance * 10000));
        minTokensOut = expectedTokens * (BigInt(10000) - slippageBps) / BigInt(10000);
      }

      const tonNano = toNano(tonAmount);
      const buyBody = buildBuyMessage({ minTokensOut });

      const result = await sendTransaction({
        to: token.jettonMasterAddress,
        value: tonNano.toString(),
        body: buyBody,
      });

      if (!result.success) {
        return { success: false, error: result.error || "Transaction failed" };
      }

      analyticsEvents.tokenBought(tokenId, tonAmount);

      get().refreshPositions();
      get()._deps.invalidateTokenQueries();
      setTimeout(() => get().refreshPositions(), 5000);

      return { success: true, txHash: result.txHash };
    } catch (error) {
      console.error("Buy error:", error);
      return { success: false, error: "Transaction failed" };
    } finally {
      set({ isBuying: false });
    }
  },

  sellTokens: async (tokenId: string, tokenAmount: string): Promise<TradeResult> => {
    const { _deps } = get();
    const { walletAddress, sendTransaction } = _deps;

    if (!walletAddress) {
      return { success: false, error: "Wallet not connected" };
    }

    if (get().isSelling) {
      return { success: false, error: "Sell already in progress" };
    }

    set({ isSelling: true });
    try {
      const tokenAmountNum = parseFloat(tokenAmount);
      if (isNaN(tokenAmountNum) || tokenAmountNum <= 0) {
        return { success: false, error: "Invalid amount" };
      }

      try {
        const balanceInNano = await getBalance(walletAddress, ROCKETSTART_TESTNET);
        const balanceInTon = Number(balanceInNano) / 1e9;
        const requiredGas = 0.15;
        if (balanceInTon < requiredGas) {
          return {
            success: false,
            error: `Insufficient TON for gas. You need at least ${requiredGas} TON but have ${balanceInTon.toFixed(4)} TON`,
          };
        }
      } catch (balanceError) {
        console.warn("Balance check failed, proceeding anyway:", balanceError);
      }

      const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
      if (!tokenDoc.exists()) {
        return { success: false, error: "Token not found" };
      }

      const token = docToToken(tokenDoc);
      if (!token.jettonMasterAddress) {
        return { success: false, error: "Token not deployed on-chain" };
      }

      try {
        const isActive = await isContractActive(token.jettonMasterAddress, ROCKETSTART_TESTNET);
        if (!isActive) {
          return { success: false, error: "Contract not active on blockchain" };
        }
      } catch {
        // Contract verification error, proceeding anyway
      }

      if (token.isGraduated) {
        return { success: false, error: "Token graduated - trade on DEX" };
      }

      const jettonWalletAddress = await getJettonWalletAddress(
        token.jettonMasterAddress,
        walletAddress,
        contractAdapter,
        ROCKETSTART_TESTNET
      );
      if (!jettonWalletAddress) {
        return { success: false, error: "Jetton wallet not found" };
      }

      const userTokenBalance = await getJettonBalance(
        token.jettonMasterAddress,
        walletAddress,
        contractAdapter
      );
      const tokenNano = parseTokenAmount(tokenAmount);
      if (userTokenBalance < tokenNano) {
        const userBalanceFormatted = (Number(userTokenBalance) / 1e9).toFixed(4);
        const requestedFormatted = (Number(tokenNano) / 1e9).toFixed(4);
        return {
          success: false,
          error: `Insufficient token balance. You have ${userBalanceFormatted} tokens but tried to sell ${requestedFormatted}`,
        };
      }

      const burnBody = buildBurnMessage({
        amount: tokenNano,
        responseDestination: Address.parse(walletAddress),
      });

      const result = await sendTransaction({
        to: jettonWalletAddress,
        value: toNano("0.1").toString(),
        body: burnBody,
      });

      if (!result.success) {
        return { success: false, error: result.error || "Transaction failed" };
      }

      analyticsEvents.tokenSold(tokenId, tokenAmount);

      get().refreshPositions();
      get()._deps.invalidateTokenQueries();
      setTimeout(() => get().refreshPositions(), 5000);

      return { success: true, txHash: result.txHash };
    } catch (error) {
      console.error("Sell error:", error);
      return { success: false, error: "Transaction failed" };
    } finally {
      set({ isSelling: false });
    }
  },

  createToken: async (params: CreateTokenParams): Promise<Token | null> => {
    const { _deps } = get();
    const { walletAddress, telegramId, sendTransaction } = _deps;

    if (!walletAddress || !telegramId) return null;

    try {
      const tempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let imageUrl = params.image;

      if (params.image?.startsWith("data:")) {
        const uploaded = await uploadTokenImage(tempId, params.image);
        if (uploaded) {
          imageUrl = uploaded;
        } else {
          console.warn("Image upload failed - token will be created without image");
          imageUrl = "";
        }
      }

      const deployResult = await deployJettonAction({
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        image: imageUrl,
        creatorAddress: walletAddress,
      });

      if (deployResult?.serverError) {
        throw new Error(deployResult.serverError);
      }

      const deployData = deployResult?.data;
      if (!deployData?.success || !deployData.deployTx || !deployData.tokenId || !deployData.jettonAddress) return null;

      const { tokenId, jettonAddress, deployTx } = deployData;

      try {
        let stateInitCell: Cell | undefined;
        if (deployTx.stateInit) {
          const stateInitBuffer = Buffer.from(deployTx.stateInit, "base64");
          stateInitCell = Cell.fromBoc(stateInitBuffer)[0];
        }

        let bodyCell: Cell | undefined;
        if (deployTx.body) {
          const bodyBuffer = Buffer.from(deployTx.body, "base64");
          bodyCell = Cell.fromBoc(bodyBuffer)[0];
        }

        if (!deployTx.to || !deployTx.value) return null;

        const txResult = await sendTransaction({
          to: deployTx.to,
          value: deployTx.value,
          stateInit: stateInitCell,
          body: bodyCell,
        });

        if (txResult.success) {
          let isDeployedOnChain = false;
          const maxRetries = 10;
          const retryDelay = 3000;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            try {
              const isActive = await isContractActive(jettonAddress, ROCKETSTART_TESTNET);
              if (isActive) {
                isDeployedOnChain = true;
                break;
              }
            } catch {
              // Status check failed, will retry
            }
          }

          if (isDeployedOnChain) {
            await confirmJettonDeployment({ tokenId, jettonAddress, txHash: txResult.txHash }).catch(console.error);

            if (params.initialBuyAmount && parseFloat(params.initialBuyAmount) > 0) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              const buyResult = await get().buyTokens(tokenId, params.initialBuyAmount, 0.05, true);
              if (!buyResult.success) {
                console.warn("Initial buy failed (token still created):", buyResult.error);
              }
            }
          } else {
            console.error("Contract deployment not confirmed after", maxRetries, "attempts");
          }
        } else {
          console.error("Deployment transaction failed:", txResult.error);
        }
      } catch (deployError) {
        console.error("Failed to send deployment transaction:", deployError);
      }

      await get().refreshTokens();
      await get().fetchMyTokens();

      analyticsEvents.tokenCreated(tokenId, params.name);

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

  retryDeployToken: async (tokenId: string): Promise<{ success: boolean; error?: string }> => {
    const { _deps } = get();
    const { walletAddress, telegramId, sendTransaction } = _deps;

    if (!walletAddress || !telegramId) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      const tokenDoc = await getDoc(doc(dbfs, `tokens/${tokenId}`));
      if (!tokenDoc.exists()) {
        return { success: false, error: "Token not found" };
      }

      const tokenData = tokenDoc.data();
      if (tokenData.isDeployed && tokenData.isOnChain) {
        return { success: false, error: "Token is already deployed" };
      }

      const retryResult = await deployJettonAction({
        name: tokenData.name,
        symbol: tokenData.symbol,
        description: tokenData.description || "",
        image: tokenData.image || "",
        creatorAddress: walletAddress,
        tokenId: tokenId,
      });

      if (retryResult?.serverError) {
        return { success: false, error: retryResult.serverError };
      }

      const retryData = retryResult?.data;
      if (!retryData?.success || !retryData.deployTx || !retryData.jettonAddress) {
        return { success: false, error: "Failed to build deployment transaction" };
      }

      const { jettonAddress, deployTx } = retryData;

      let stateInitCell: Cell | undefined;
      if (deployTx.stateInit) {
        const stateInitBuffer = Buffer.from(deployTx.stateInit, "base64");
        stateInitCell = Cell.fromBoc(stateInitBuffer)[0];
      }

      let bodyCell: Cell | undefined;
      if (deployTx.body) {
        const bodyBuffer = Buffer.from(deployTx.body, "base64");
        bodyCell = Cell.fromBoc(bodyBuffer)[0];
      }

      if (!deployTx.to || !deployTx.value) {
        return { success: false, error: "Invalid deployment transaction" };
      }

      const txResult = await sendTransaction({
        to: deployTx.to,
        value: deployTx.value,
        stateInit: stateInitCell,
        body: bodyCell,
      });

      if (!txResult.success) {
        return { success: false, error: txResult.error || "Transaction failed" };
      }

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
        await confirmJettonDeployment({ tokenId, jettonAddress, txHash: txResult.txHash }).catch(console.error);

        await new Promise((resolve) => setTimeout(resolve, 500));
        await get().fetchMyTokens();
        await get().refreshTokens();

        return { success: true };
      } else {
        return { success: false, error: "Deployment not confirmed. Please try again." };
      }
    } catch (error) {
      console.error("Retry deploy error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Deployment failed" };
    }
  },

  refreshPositions: async () => {
    const { walletAddress } = get()._deps;
    if (!walletAddress) {
      set({ positions: [] });
      return;
    }

    try {
      const networkFilter = ROCKETSTART_TESTNET ? "testnet" : "mainnet";
      const tokensSnapshot = await getDocs(
        query(collection(dbfs, "tokens"), where("network", "==", networkFilter), where("isOnChain", "==", true))
      );

      const tokens = tokensSnapshot.docs.map(docToToken).filter((t) => t.jettonMasterAddress);
      const results: HolderPosition[] = [];
      const BATCH_SIZE = 10;

      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (token) => {
            try {
              const balance = await getJettonBalance(
                token.jettonMasterAddress,
                walletAddress,
                contractAdapter
              );
              if (balance > BigInt(0)) {
                // Calculate current value in nanoTON
                const currentPriceNano = BigInt(token.currentPrice || "0");
                const currentValueNano = (balance * currentPriceNano) / BigInt(1e9);

                // Try to compute totalInvested from on-chain buy history
                let totalInvestedNano = BigInt(0);
                try {
                  const { tonApiGet } = await import("@/lib/tonapi-client");
                  const txData = await tonApiGet<{ transactions?: Array<{
                    success?: boolean;
                    in_msg?: { op_code?: string; value?: number; source?: { address?: string } };
                  }> }>(
                    `/v2/blockchain/accounts/${token.jettonMasterAddress}/transactions?limit=100`,
                    { testnet: ROCKETSTART_TESTNET }
                  );
                  for (const tx of txData.transactions || []) {
                    if (!tx.success) continue;
                    const inMsg = tx.in_msg;
                    if (inMsg?.op_code === "0xaf750d34") {
                      // Check if sender is current user
                      const senderAddr = inMsg.source?.address || "";
                      try {
                        const senderParsed = Address.parse(senderAddr).toString({ bounceable: false });
                        const userParsed = Address.parse(walletAddress).toString({ bounceable: false });
                        if (senderParsed === userParsed) {
                          totalInvestedNano += BigInt(Math.floor((inMsg.value || 0)));
                        }
                      } catch { /* address parse error */ }
                    }
                  }
                } catch {
                  // TonAPI fetch failed, P/L will show as unavailable
                }

                const pnlNano = totalInvestedNano > BigInt(0) ? Number(currentValueNano) - Number(totalInvestedNano) : 0;
                const pnlPercent = totalInvestedNano > BigInt(0) ? (pnlNano / Number(totalInvestedNano)) * 100 : 0;

                return {
                  tokenId: token.id,
                  balance: balance.toString(),
                  averageBuyPrice: "0",
                  totalInvested: totalInvestedNano.toString(),
                  currentValue: formatTokenAmount(balance),
                  pnl: pnlNano / 1e9,
                  pnlPercent,
                  token,
                } as HolderPosition;
              }
            } catch {
              // Token might not be deployed yet
            }
            return null;
          })
        );
        results.push(...batchResults.filter((r): r is HolderPosition => r !== null));
      }

      set({ positions: results });
    } catch (error) {
      console.error("Error refreshing positions:", error);
    }
  },

  refreshTokensOnChain: async () => {
    const { trendingTokens, newTokens, _deps } = get();
    const { queryClient } = _deps;
    if (!queryClient) return;

    const allTokens = [...(trendingTokens ?? []), ...(newTokens ?? [])].filter(
      (t, i, arr) => t.jettonMasterAddress && arr.findIndex((x) => x.id === t.id) === i
    );

    const enrichedUpdates: { id: string; data: Partial<Token> }[] = [];

    // Lazy-load tonApiGet (server action) for on-chain stats
    const { tonApiGet } = await import("@/lib/tonapi-client");

    await Promise.all(
      allTokens.map(async (token) => {
        try {
          if (!token.jettonMasterAddress) return;

          // Fetch curve data + TONAPI transaction stats in parallel
          const [curveData, txData] = await Promise.all([
            getBondingCurveData(token.jettonMasterAddress, contractAdapter),
            tonApiGet<{ transactions?: Array<{
              success?: boolean;
              in_msg?: { op_code?: string; value?: number };
              utime?: number;
            }> }>(
              `/v2/blockchain/accounts/${token.jettonMasterAddress}/transactions?limit=100`,
              { testnet: ROCKETSTART_TESTNET },
            ).catch(() => ({ transactions: [] as Array<{ success?: boolean; in_msg?: { op_code?: string; value?: number }; utime?: number }> })),
          ]);

          const update: Partial<Token> = {};

          if (curveData) {
            update.totalSupply = curveData.totalSupply.toString();
            update.currentPrice = curveData.currentPrice.toString();
            update.tonReserve = curveData.tonReserve.toString();
            update.marketCap = curveData.tonReserve.toString();
            update.graduationThreshold = curveData.graduationTarget.toString();
            update.isGraduated = curveData.graduated;
          }

          // Calculate volume24h + trades from TONAPI transactions
          let trades = 0;
          let volume24h = 0;
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          for (const tx of txData.transactions ?? []) {
            if (!tx.success) continue;
            const op = tx.in_msg?.op_code;
            if (op === "0xaf750d34" || op === "0x7bdd97de") {
              trades++;
              if ((tx.utime || 0) * 1000 > oneDayAgo) {
                volume24h += (tx.in_msg?.value || 0) / 1e9;
              }
            }
          }
          update.trades = trades;
          update.volume24h = volume24h;

          enrichedUpdates.push({ id: token.id, data: update });
        } catch (error) {
          console.warn(`Failed to fetch on-chain data for ${token.symbol}:`, error);
        }
      })
    );

    if (enrichedUpdates.length > 0) {
      const updateTokenList = (data: TokenQueryData | undefined) =>
        updateTokenQueryData(data, (token) => {
          const update = enrichedUpdates.find((u) => u.id === token.id);
          return update ? { ...token, ...update.data } : token;
        });

      queryClient.setQueryData<TokenQueryData>(["tokens", "trending"], updateTokenList);
      queryClient.setQueryData<TokenQueryData>(["tokens", "new"], updateTokenList);
    }
  },

  getPosition: (tokenId) => get().positions.find((p) => p.tokenId === tokenId) || null,
}));
