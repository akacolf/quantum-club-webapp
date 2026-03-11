"use client";

import { create } from "zustand";
import type {
  ConnectionRequestEvent,
  SendTransactionRequestEvent,
  SignDataRequestEvent,
  TONConnectSession,
} from "@ton/walletkit";

interface WalletKitStoreState {
  isReady: boolean;
  isTestnet: boolean;
  isWalletRegistered: boolean;
  pendingConnection: ConnectionRequestEvent | null;
  pendingTransaction: SendTransactionRequestEvent | null;
  pendingSignData: SignDataRequestEvent | null;
  sessions: TONConnectSession[];
}

interface WalletKitStoreActions {
  // Actions — set by WalletKitProvider (depend on kitRef/walletRef)
  approveConnection: () => Promise<void>;
  rejectConnection: () => Promise<void>;
  approveTransaction: () => Promise<void>;
  rejectTransaction: () => Promise<void>;
  approveSignData: () => Promise<void>;
  rejectSignData: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  disconnect: (sessionId?: string) => Promise<void>;
  handleTonConnectUrl: (url: string) => Promise<void>;
  registerWallet: (mnemonic: string[]) => Promise<boolean>;
}

export type WalletKitStore = WalletKitStoreState & WalletKitStoreActions;

export const useWalletKitStore = create<WalletKitStore>()(() => ({
  // State defaults
  isReady: false,
  isTestnet: false,
  isWalletRegistered: false,
  pendingConnection: null,
  pendingTransaction: null,
  pendingSignData: null,
  sessions: [],

  // Placeholder actions — overridden by WalletKitProvider (depend on kitRef/walletRef)
  approveConnection: async () => {},
  rejectConnection: async () => {},
  approveTransaction: async () => {},
  rejectTransaction: async () => {},
  approveSignData: async () => {},
  rejectSignData: async () => {},
  refreshSessions: async () => {},
  disconnect: async () => {},
  handleTonConnectUrl: async () => {},
  registerWallet: async () => false,
}));
