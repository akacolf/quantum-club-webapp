"use client";

import { create } from "zustand";
import { Address, internal, SendMode, Cell, loadStateInit } from "@ton/core";
import { WalletContractV5R1, WalletContractV4, WalletContractV3R2 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { toast } from "sonner";
import { getContractAdapter as getCentralAdapter } from "@/lib/ton-api";
import type { ChainType } from "@/app/wallet/utils/multichain";
import { getSecureMnemonic, removeSecureMnemonic } from "@/lib/secure-mnemonic";

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

// =====================================================
// External dependencies injected by WalletProvider
// =====================================================
export interface WalletDeps {
  telegramId: string | null;
  invalidateWalletQueries: (address: string) => void;
  refetchAssets: () => void;
  refetchNfts: () => void;
  refetchMultiChain: () => void;
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
  _deps: WalletDeps;
}

interface WalletActions {
  setDeps: (deps: Partial<WalletDeps>) => void;
  setWalletAddress: (address: string) => void;
  setWalletStatus: (status: string) => void;
  setSelectedNetwork: (network: ChainType) => void;
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
  sendTransaction: (params: {
    to: string;
    value: string;
    body?: Cell;
    stateInit?: Cell;
    bounce?: boolean;
  }) => Promise<{ success: boolean; txHash?: string; error?: string }>;
}

export type WalletStore = WalletState & WalletActions;

const defaultDeps: WalletDeps = {
  telegramId: null,
  invalidateWalletQueries: () => {},
  refetchAssets: () => {},
  refetchNfts: () => {},
  refetchMultiChain: () => {},
};

export const useWalletStore = create<WalletStore>()((set, get) => ({
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
  _deps: defaultDeps,

  setDeps: (deps) => set((s) => ({ _deps: { ...s._deps, ...deps } })),

  setWalletAddress: (address) => {
    const current = get().walletAddress;
    if (address !== current) {
      if (!address) {
        set({
          walletAddress: address,
          tonBalance: "0",
          tonUsdValue: "0.00",
          totalUsdBalance: "0.00",
          jettons: [],
          hasFetched: false,
        });
      } else {
        set({ walletAddress: address, hasFetched: false });
      }
    }
  },

  setWalletStatus: (status) => set({ walletStatus: status }),

  setSelectedNetwork: (network) => {
    set({ selectedNetwork: network });
    localStorage.setItem("quantum_selected_network", network);
  },

  fetchWalletAssets: async () => {
    get()._deps.refetchAssets();
  },

  fetchNfts: async () => {
    get()._deps.refetchNfts();
  },

  fetchMultiChainBalances: async () => {
    get()._deps.refetchMultiChain();
  },

  toggleHideAsset: (symbol) => {
    const { hiddenAssets, _deps } = get();
    if (!_deps.telegramId) return;
    const newHidden = hiddenAssets.includes(symbol)
      ? hiddenAssets.filter((s) => s !== symbol)
      : [...hiddenAssets, symbol];
    localStorage.setItem(
      `quantum_hidden_assets_${_deps.telegramId}`,
      JSON.stringify(newHidden)
    );
    set({ hiddenAssets: newHidden });
  },

  toggleHideBalance: () => {
    const newValue = !get().hideBalance;
    localStorage.setItem("quantum_hide_balance", String(newValue));
    set({ hideBalance: newValue });
  },

  toggleTestnet: () => {
    const { isTestnet, _deps } = get();
    if (!_deps.telegramId) return;
    const newValue = !isTestnet;
    localStorage.setItem("quantum_ton_testnet", String(newValue));

    // Reset wallet state when switching networks
    set({
      isTestnet: newValue,
      hasFetched: false,
      jettons: [],
      nfts: [],
      tonBalance: "0",
      tonUsdValue: "0.00",
      totalUsdBalance: "0.00",
      ...(newValue
        ? {
            ethBalance: 0,
            btcBalance: 0,
            ethUsdValue: 0,
            btcUsdValue: 0,
          }
        : {}),
    });

    // Re-derive TON address with new network flag
    const storedVersion =
      localStorage.getItem(`quantum_wallet_version_${_deps.telegramId}`) ||
      "v5r1";

    if (_deps.telegramId) {
      (async () => {
        try {
          const storedMnemonic = await getSecureMnemonic(_deps.telegramId!);
          if (!storedMnemonic) return;
          const { mnemonicToWalletKey } = await import("@ton/crypto");
          const mnemonic = storedMnemonic.split(" ");
          const keyPair = await mnemonicToWalletKey(mnemonic);

          let wallet;
          switch (storedVersion) {
            case "v4r2":
              wallet = WalletContractV4.create({
                workchain: 0,
                publicKey: keyPair.publicKey,
              });
              break;
            case "v3r2":
              wallet = WalletContractV3R2.create({
                workchain: 0,
                publicKey: keyPair.publicKey,
              });
              break;
            case "v5r1":
            default:
              wallet = WalletContractV5R1.create({
                workchain: 0,
                publicKey: keyPair.publicKey,
              });
              break;
          }

          const newAddress = wallet.address.toString({
            bounceable: false,
            testOnly: newValue,
          });
          set({ walletAddress: newAddress });
          localStorage.setItem(
            `quantum_wallet_address_${_deps.telegramId}`,
            newAddress
          );
        } catch (error) {
          console.error("Failed to re-derive address:", error);
        }
      })();
    }

    toast.success(
      newValue ? "Switched to TON Testnet" : "Switched to TON Mainnet"
    );
  },

  addWallet: (address, name) => {
    const { storedWallets, _deps } = get();
    if (!_deps.telegramId) return;
    if (storedWallets.some((w) => w.address === address)) return;

    const newWallet: StoredWallet = {
      address,
      name: name || `Wallet ${storedWallets.length + 1}`,
      createdAt: Date.now(),
      isActive: storedWallets.length === 0,
    };
    const updated = [
      ...storedWallets.map((w) => ({ ...w, isActive: false })),
      newWallet,
    ];
    localStorage.setItem(
      `quantum_wallets_${_deps.telegramId}`,
      JSON.stringify(updated)
    );
    set({ storedWallets: updated });
  },

  removeWallet: (address) => {
    const { storedWallets, _deps } = get();
    if (!_deps.telegramId) return;
    const updated = storedWallets.filter((w) => w.address !== address);
    if (
      storedWallets.find((w) => w.address === address)?.isActive &&
      updated.length > 0
    ) {
      updated[0].isActive = true;
      set({
        walletAddress: updated[0].address,
        hasFetched: false,
      });
      localStorage.setItem(
        `quantum_wallet_address_${_deps.telegramId}`,
        updated[0].address
      );
    }
    localStorage.setItem(
      `quantum_wallets_${_deps.telegramId}`,
      JSON.stringify(updated)
    );
    set({ storedWallets: updated });
  },

  switchWallet: (address) => {
    const { storedWallets, _deps } = get();
    if (!_deps.telegramId) return;
    const updated = storedWallets.map((w) => ({
      ...w,
      isActive: w.address === address,
    }));
    const newIndex = updated.findIndex((w) => w.address === address);
    localStorage.setItem(
      `quantum_wallets_${_deps.telegramId}`,
      JSON.stringify(updated)
    );
    localStorage.setItem(
      `quantum_active_wallet_index_${_deps.telegramId}`,
      String(newIndex)
    );
    localStorage.setItem(
      `quantum_wallet_address_${_deps.telegramId}`,
      address
    );
    set({
      storedWallets: updated,
      activeWalletIndex: newIndex,
      walletAddress: address,
      hasFetched: false,
    });
    toast.success("Wallet switched!");
  },

  renameWallet: (address, newName) => {
    const { storedWallets, _deps } = get();
    if (!_deps.telegramId) return;
    const updated = storedWallets.map((w) =>
      w.address === address ? { ...w, name: newName } : w
    );
    localStorage.setItem(
      `quantum_wallets_${_deps.telegramId}`,
      JSON.stringify(updated)
    );
    set({ storedWallets: updated });
  },

  clearWallet: () => {
    const { _deps } = get();
    const tid = _deps.telegramId;
    localStorage.removeItem(`quantum_wallet_address_${tid}`);
    if (tid) removeSecureMnemonic(tid);
    localStorage.removeItem(`quantum_wallet_pin_hash_${tid}`);
    localStorage.removeItem(`quantum_wallet_credential_id_${tid}`);
    localStorage.removeItem(`quantum_wallet_version_${tid}`);
    localStorage.removeItem(`quantum_wallets_${tid}`);
    localStorage.removeItem(`quantum_active_wallet_index_${tid}`);

    set({
      walletAddress: "",
      tonBalance: "0",
      tonUsdValue: "0.00",
      totalUsdBalance: "0.00",
      jettons: [],
      nfts: [],
      hasFetched: false,
      walletStatus: "nonexist",
      storedWallets: [],
      activeWalletIndex: 0,
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
    });
  },

  sendTransaction: async (params) => {
    const { isTestnet, _deps } = get();
    const { telegramId } = _deps;

    if (!telegramId) {
      return { success: false, error: "Not authenticated" };
    }

    const storedVersion =
      localStorage.getItem(`quantum_wallet_version_${telegramId}`) || "v5r1";

    try {
      const storedMnemonic = await getSecureMnemonic(telegramId);
      if (!storedMnemonic) {
        return { success: false, error: "Wallet not found" };
      }
      const mnemonic = storedMnemonic.split(" ");
      const keyPair = await mnemonicToPrivateKey(mnemonic);

      let wallet;
      switch (storedVersion) {
        case "v4r2":
          wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
          });
          break;
        case "v3r2":
          wallet = WalletContractV3R2.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
          });
          break;
        case "v5r1":
        default:
          wallet = WalletContractV5R1.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
          });
          break;
      }

      // Reuse central ContractAdapter singleton (includes API key)
      // Note: testnet not supported here — wallet sendTransaction always uses mainnet
      const contractAdapterInstance = getCentralAdapter();
      const contract = contractAdapterInstance.open(wallet);
      const toAddress = Address.parse(params.to);

      // Get seqno with retry logic
      let seqno = 0;
      let retries = 3;
      while (retries > 0) {
        try {
          seqno = await contract.getSeqno();
          break;
        } catch (err) {
          const error = err as { response?: { status?: number } };
          if (error?.response?.status === 429 && retries > 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            retries--;
            continue;
          }
          if (retries === 1) {
            seqno = 0;
            break;
          }
          retries--;
        }
      }

      // Parse stateInit if provided
      let init:
        | {
            code: import("@ton/core").Cell;
            data: import("@ton/core").Cell;
          }
        | undefined;
      if (params.stateInit) {
        try {
          const parsedInit = loadStateInit(params.stateInit.beginParse());
          if (!parsedInit.code || !parsedInit.data) {
            console.error("stateInit missing code or data");
            return {
              success: false,
              error: "stateInit missing required code or data",
            };
          }
          init = { code: parsedInit.code, data: parsedInit.data };
        } catch (parseError) {
          console.error("Failed to parse stateInit:", parseError);
          return {
            success: false,
            error:
              "Failed to parse stateInit: " +
              (parseError instanceof Error
                ? parseError.message
                : String(parseError)),
          };
        }
      }

      const { beginCell, storeMessage, external } = await import("@ton/core");

      // bounce: true (default) ensures failed contract calls return funds.
      // Only use bounce: false for deployments (stateInit) or explicit opt-out.
      const shouldBounce = params.bounce ?? (params.stateInit ? false : true);

      const internalMsg = internal({
        to: toAddress,
        value: BigInt(params.value),
        body: params.body,
        init: init,
        bounce: shouldBounce,
      });

      const transferCell = (wallet as any).createTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: [internalMsg],
      }) as Cell;

      const externalMsg = external({
        to: wallet.address,
        init: seqno === 0 ? wallet.init : undefined,
        body: transferCell,
      });

      const bocCell = beginCell().store(storeMessage(externalMsg)).endCell();
      const bocBase64 = bocCell.toBoc().toString("base64");

      let success = false;
      let lastError = "";
      let messageHash = "";

      const bocHash = bocCell.hash().toString("hex");

      for (let attempt = 1; attempt <= 3; attempt++) {
        if (attempt > 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        try {
          const { sendBlockchainMessage } = await import(
            "@/lib/tonapi-client"
          );
          const result = await sendBlockchainMessage(bocBase64, isTestnet);
          messageHash = result?.hash || bocHash;
          success = true;
          break;
        } catch (err) {
          console.error(`TonAPI send attempt ${attempt} failed:`, err);
          lastError = `TonAPI: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      if (!success) {
        throw new Error(
          lastError || "Failed to send transaction via TonAPI"
        );
      }

      setTimeout(() => {
        const s = get();
        s._deps.invalidateWalletQueries(s.walletAddress);
      }, 3000);

      return { success: true, txHash: messageHash };
    } catch (error) {
      console.error("Transaction failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Transaction failed",
      };
    }
  },
}));
