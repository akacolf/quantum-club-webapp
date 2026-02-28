"use client";

import { create } from "zustand";
import type { Cell } from "@ton/core";
import type { ChainType } from "@/app/wallet/utils/multichain";

export interface JettonBalance {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  image?: string;
  usdValue?: number;
  priceUsd?: number;
  jettonAddress?: string;
  walletAddress?: string;
  isHidden?: boolean;
}

export interface NftItem {
  address: string;
  name: string;
  description?: string;
  image?: string;
  collectionName?: string;
  collectionAddress?: string;
}

export interface StoredWallet {
  address: string;
  name: string;
  createdAt: number;
  isActive: boolean;
}

interface WalletState {
  walletAddress: string;
  tonBalance: string;
  tonPrice: number;
  tonUsdValue: string;
  totalUsdBalance: string;
  jettons: JettonBalance[];
  nfts: NftItem[];
  hiddenAssets: string[];
  isLoadingAssets: boolean;
  isLoadingNfts: boolean;
  hasFetched: boolean;
  hideBalance: boolean;
  isTestnet: boolean;
  storedWallets: StoredWallet[];
  activeWalletIndex: number;
  walletStatus: string;
  selectedNetwork: ChainType;
  // Multi-chain
  ethAddress: string;
  btcAddress: string;
  solAddress: string;
  trxAddress: string;
  ethBalance: number;
  btcBalance: number;
  solBalance: number;
  trxBalance: number;
  ethUsdValue: number;
  btcUsdValue: number;
  solUsdValue: number;
  trxUsdValue: number;
  ethPrice: number;
  btcPrice: number;
  solPrice: number;
  trxPrice: number;
  isLoadingMultiChain: boolean;
  // Auto-refresh
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number;
}

interface WalletActions {
  // Setters for bridge sync
  setWalletAddress: (address: string) => void;
  setWalletStatus: (status: string) => void;
  setSelectedNetwork: (network: ChainType) => void;
  // Actions — set by bridge hook (depend on React hooks)
  fetchWalletAssets: () => Promise<void>;
  fetchNfts: () => Promise<void>;
  fetchMultiChainBalances: () => Promise<void>;
  toggleHideAsset: (symbol: string) => void;
  toggleHideBalance: () => void;
  toggleTestnet: () => void;
  addWallet: (address: string, name?: string) => void;
  removeWallet: (address: string) => void;
  switchWallet: (address: string) => void;
  renameWallet: (address: string, newName: string) => void;
  clearWallet: () => void;
  toggleAutoRefresh: () => void;
  setAutoRefreshInterval: (seconds: number) => void;
  sendTransaction: (params: {
    to: string;
    value: string;
    body?: Cell;
    stateInit?: Cell;
  }) => Promise<{ success: boolean; txHash?: string; error?: string }>;
}

export type WalletStore = WalletState & WalletActions;

export const useWalletStore = create<WalletStore>()((set) => ({
  // State defaults
  walletAddress: "",
  tonBalance: "0",
  tonPrice: 0,
  tonUsdValue: "0.00",
  totalUsdBalance: "0.00",
  jettons: [],
  nfts: [],
  hiddenAssets: [],
  isLoadingAssets: false,
  isLoadingNfts: false,
  hasFetched: false,
  hideBalance: false,
  isTestnet: false,
  storedWallets: [],
  activeWalletIndex: 0,
  walletStatus: "nonexist",
  selectedNetwork: "ton" as ChainType,
  // Multi-chain
  ethAddress: "",
  btcAddress: "",
  solAddress: "",
  trxAddress: "",
  ethBalance: 0,
  btcBalance: 0,
  solBalance: 0,
  trxBalance: 0,
  ethUsdValue: 0,
  btcUsdValue: 0,
  solUsdValue: 0,
  trxUsdValue: 0,
  ethPrice: 0,
  btcPrice: 0,
  solPrice: 0,
  trxPrice: 0,
  isLoadingMultiChain: false,
  // Auto-refresh
  autoRefreshEnabled: true,
  autoRefreshInterval: 60,

  // Setters
  setWalletAddress: (address) => set({ walletAddress: address }),
  setWalletStatus: (status) => set({ walletStatus: status }),
  setSelectedNetwork: (network) => set({ selectedNetwork: network }),

  // Placeholder actions — overridden by useWalletBridge in WalletProvider
  fetchWalletAssets: async () => {},
  fetchNfts: async () => {},
  fetchMultiChainBalances: async () => {},
  toggleHideAsset: () => {},
  toggleHideBalance: () => {},
  toggleTestnet: () => {},
  addWallet: () => {},
  removeWallet: () => {},
  switchWallet: () => {},
  renameWallet: () => {},
  clearWallet: () => {},
  toggleAutoRefresh: () => {},
  setAutoRefreshInterval: () => {},
  sendTransaction: async () => ({ success: false, error: "Not initialized" }),
}));
