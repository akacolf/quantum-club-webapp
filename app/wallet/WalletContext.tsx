"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { fromNano, Address } from "@ton/core";

// Testnet mode - affects API endpoints and address format
// Testnet addresses: 0Q... (non-bounceable) or kQ... (bounceable)
// Mainnet addresses: UQ... (non-bounceable) or EQ... (bounceable)
export const IS_TESTNET = false;

interface JettonBalance {
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

interface NftItem {
  address: string;
  name: string;
  description?: string;
  image?: string;
  collectionName?: string;
  collectionAddress?: string;
}

export interface PendingTransaction {
  event_id: string;
  type: string;
  amount?: string;
  symbol?: string;
  timestamp: number;
  in_progress: boolean;
}

export interface StoredWallet {
  address: string;
  name: string;
  createdAt: number;
  isActive: boolean;
}

interface WalletContextType {
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
  pendingTransactions: PendingTransaction[];
  isLoadingPending: boolean;
  fetchWalletAssets: () => Promise<void>;
  fetchNfts: () => Promise<void>;
  fetchPendingTransactions: () => Promise<void>;
  setWalletAddress: (address: string) => void;
  toggleHideAsset: (symbol: string) => void;
  toggleHideBalance: () => void;
  addWallet: (address: string, name?: string) => void;
  removeWallet: (address: string) => void;
  switchWallet: (address: string) => void;
  renameWallet: (address: string, newName: string) => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

// API URLs based on network
const getApiBaseUrl = () => IS_TESTNET ? "https://testnet.tonapi.io" : "https://tonapi.io";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [tonBalance, setTonBalance] = useState("0");
  const [tonPrice, setTonPrice] = useState(0);
  const [tonUsdValue, setTonUsdValue] = useState("0.00");
  const [totalUsdBalance, setTotalUsdBalance] = useState("0.00");
  const [jettons, setJettons] = useState<JettonBalance[]>([]);
  const [nfts, setNfts] = useState<NftItem[]>([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  // Multi-wallet support
  const [storedWallets, setStoredWallets] = useState<StoredWallet[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("quantum_wallets");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const [activeWalletIndex, setActiveWalletIndex] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("quantum_active_wallet_index");
      return stored ? parseInt(stored) : 0;
    }
    return 0;
  });

  const [hiddenAssets, setHiddenAssets] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("quantum_hidden_assets");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const [hideBalance, setHideBalance] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("quantum_hide_balance") === "true";
    }
    return false;
  });

  // Multi-wallet management functions
  const addWallet = useCallback((address: string, name?: string) => {
    setStoredWallets(prev => {
      // Check if wallet already exists
      if (prev.some(w => w.address === address)) {
        return prev;
      }
      const newWallet: StoredWallet = {
        address,
        name: name || `Wallet ${prev.length + 1}`,
        createdAt: Date.now(),
        isActive: prev.length === 0, // First wallet is active
      };
      const updated = [...prev.map(w => ({ ...w, isActive: false })), newWallet];
      localStorage.setItem("quantum_wallets", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeWallet = useCallback((address: string) => {
    setStoredWallets(prev => {
      const updated = prev.filter(w => w.address !== address);
      // If we removed the active wallet, make the first remaining one active
      if (prev.find(w => w.address === address)?.isActive && updated.length > 0) {
        updated[0].isActive = true;
        setWalletAddress(updated[0].address);
        localStorage.setItem("quantum_wallet_address", updated[0].address);
        setHasFetched(false);
      }
      localStorage.setItem("quantum_wallets", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const switchWallet = useCallback((address: string) => {
    setStoredWallets(prev => {
      const updated = prev.map(w => ({
        ...w,
        isActive: w.address === address
      }));
      localStorage.setItem("quantum_wallets", JSON.stringify(updated));
      const newIndex = updated.findIndex(w => w.address === address);
      setActiveWalletIndex(newIndex);
      localStorage.setItem("quantum_active_wallet_index", String(newIndex));
      return updated;
    });
    setWalletAddress(address);
    localStorage.setItem("quantum_wallet_address", address);
    setHasFetched(false);
  }, []);

  const renameWallet = useCallback((address: string, newName: string) => {
    setStoredWallets(prev => {
      const updated = prev.map(w =>
        w.address === address ? { ...w, name: newName } : w
      );
      localStorage.setItem("quantum_wallets", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleHideAsset = useCallback((symbol: string) => {
    setHiddenAssets(prev => {
      const newHidden = prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol];
      localStorage.setItem("quantum_hidden_assets", JSON.stringify(newHidden));
      return newHidden;
    });
  }, []);

  const toggleHideBalance = useCallback(() => {
    setHideBalance(prev => {
      const newValue = !prev;
      localStorage.setItem("quantum_hide_balance", String(newValue));
      return newValue;
    });
  }, []);

  const fetchTonPrice = useCallback(async () => {
    // On testnet, use a mock price for testing
    if (IS_TESTNET) {
      setTonPrice(5.0); // Mock price for testnet
      return 5.0;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/v2/rates?tokens=ton&currencies=usd`);
      if (response.ok) {
        const data = await response.json();
        const price = data.rates?.TON?.prices?.USD || 0;
        setTonPrice(price);
        return price;
      }
    } catch (error) {
      console.error("Failed to fetch TON price:", error);
    }
    return tonPrice || 0;
  }, [tonPrice]);

  // Fetch wallet assets (TON balance + Jettons)
  const fetchWalletAssets = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoadingAssets(true);
    try {
      // Fetch TON price first
      const price = await fetchTonPrice();
      const apiBase = getApiBaseUrl();

      // Fetch TON balance using TON API
      let tonUsd = 0;
      const balanceResponse = await fetch(`${apiBase}/v2/accounts/${walletAddress}`);
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        const balanceInNano = balanceData.balance || "0";
        const balanceInTon = fromNano(balanceInNano);
        setTonBalance(parseFloat(balanceInTon).toFixed(4));

        // Calculate USD value
        tonUsd = parseFloat(balanceInTon) * price;
        setTonUsdValue(tonUsd.toFixed(2));
      }

      // Fetch Jettons (tokens) balance with USD prices
      let jettonsUsdTotal = 0;
      const jettonsResponse = await fetch(`${apiBase}/v2/accounts/${walletAddress}/jettons?currencies=usd`);
      if (jettonsResponse.ok) {
        const jettonsData = await jettonsResponse.json();
        const jettonBalances: JettonBalance[] = (jettonsData.balances || []).map((jetton: {
          balance: string;
          wallet_address?: { address?: string };
          price?: {
            prices?: { USD?: number };
          };
          jetton: {
            address?: string;
            symbol?: string;
            name?: string;
            decimals?: number;
            image?: string;
          }
        }) => {
          const decimals = jetton.jetton?.decimals || 9;
          const rawBalance = parseFloat(jetton.balance || "0");
          const actualBalance = rawBalance / Math.pow(10, decimals);
          const priceUsd = jetton.price?.prices?.USD || 0;
          const usdValue = actualBalance * priceUsd;

          jettonsUsdTotal += usdValue;

          return {
            symbol: jetton.jetton?.symbol || "Unknown",
            name: jetton.jetton?.name || "Unknown Token",
            balance: jetton.balance || "0",
            decimals: decimals,
            image: jetton.jetton?.image,
            usdValue: usdValue,
            priceUsd: priceUsd,
            jettonAddress: jetton.jetton?.address,
            walletAddress: jetton.wallet_address?.address,
          };
        });
        setJettons(jettonBalances);
      }

      // Set total USD balance (TON + all Jettons)
      setTotalUsdBalance((tonUsd + jettonsUsdTotal).toFixed(2));
    } catch (error) {
      console.error("Failed to fetch wallet assets:", error);
    } finally {
      setIsLoadingAssets(false);
      setHasFetched(true);
    }
  }, [walletAddress, fetchTonPrice]);

  // Fetch NFTs from TonAPI
  const fetchNfts = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoadingNfts(true);
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/v2/accounts/${walletAddress}/nfts?limit=100`);

      if (response.ok) {
        const data = await response.json();
        const nftItems: NftItem[] = (data.nft_items || []).map((nft: {
          address: string;
          metadata?: {
            name?: string;
            description?: string;
            image?: string;
          };
          collection?: {
            address?: string;
            name?: string;
          };
          previews?: Array<{ resolution: string; url: string }>;
        }) => {
          // Get the best preview image (prefer 500x500)
          const preview = nft.previews?.find(p => p.resolution === '500x500')
            || nft.previews?.find(p => p.resolution === '100x100')
            || nft.previews?.[0];

          return {
            address: nft.address,
            name: nft.metadata?.name || 'Unnamed NFT',
            description: nft.metadata?.description,
            image: preview?.url || nft.metadata?.image,
            collectionName: nft.collection?.name,
            collectionAddress: nft.collection?.address,
          };
        });
        setNfts(nftItems);
      }
    } catch (error) {
      console.error("Failed to fetch NFTs:", error);
    } finally {
      setIsLoadingNfts(false);
    }
  }, [walletAddress]);

  // Fetch pending/in-progress OUTGOING transactions only
  const fetchPendingTransactions = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoadingPending(true);
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/v2/accounts/${walletAddress}/events?limit=10`);

      if (response.ok) {
        const data = await response.json();

        // Normalize wallet address for comparison
        let normalizedWalletAddress = "";
        try {
          normalizedWalletAddress = Address.parse(walletAddress).toRawString();
        } catch {
          normalizedWalletAddress = walletAddress;
        }

        const pending: PendingTransaction[] = (data.events || [])
          .filter((event: { in_progress?: boolean }) => event.in_progress)
          .map((event: {
            event_id: string;
            timestamp: number;
            in_progress?: boolean;
            actions?: Array<{
              type: string;
              TonTransfer?: { amount?: string; sender?: { address?: string } };
              JettonTransfer?: { amount?: string; sender?: { address?: string }; jetton?: { symbol?: string; decimals?: number } };
              NftItemTransfer?: { sender?: { address?: string } };
            }>
          }) => {
            const action = event.actions?.[0];
            let type = action?.type || 'Unknown';
            let amount: string | undefined;
            let symbol: string | undefined;
            let isOutgoing = false;

            if (action?.type === 'TonTransfer' && action.TonTransfer) {
              // Check if this is outgoing
              let senderRaw = "";
              try {
                if (action.TonTransfer.sender?.address) {
                  senderRaw = Address.parse(action.TonTransfer.sender.address).toRawString();
                }
              } catch {
                senderRaw = action.TonTransfer.sender?.address || "";
              }
              isOutgoing = senderRaw === normalizedWalletAddress;

              if (isOutgoing) {
                amount = parseFloat(fromNano(action.TonTransfer.amount || "0")).toFixed(4);
                symbol = 'TON';
                type = 'Sending TON';
              }
            } else if (action?.type === 'JettonTransfer' && action.JettonTransfer) {
              let senderRaw = "";
              try {
                if (action.JettonTransfer.sender?.address) {
                  senderRaw = Address.parse(action.JettonTransfer.sender.address).toRawString();
                }
              } catch {
                senderRaw = action.JettonTransfer.sender?.address || "";
              }
              isOutgoing = senderRaw === normalizedWalletAddress;

              if (isOutgoing) {
                const decimals = action.JettonTransfer.jetton?.decimals || 9;
                const rawAmount = parseFloat(action.JettonTransfer.amount || '0');
                amount = (rawAmount / Math.pow(10, decimals)).toFixed(4);
                symbol = action.JettonTransfer.jetton?.symbol || 'TOKEN';
                type = 'Sending Token';
              }
            } else if (action?.type === 'NftItemTransfer' && action.NftItemTransfer) {
              let senderRaw = "";
              try {
                if (action.NftItemTransfer.sender?.address) {
                  senderRaw = Address.parse(action.NftItemTransfer.sender.address).toRawString();
                }
              } catch {
                senderRaw = action.NftItemTransfer.sender?.address || "";
              }
              isOutgoing = senderRaw === normalizedWalletAddress;

              if (isOutgoing) {
                type = 'Sending NFT';
                symbol = 'NFT';
              }
            }

            // Only return if it's an outgoing transaction
            if (!isOutgoing) return null;

            return {
              event_id: event.event_id,
              type,
              amount,
              symbol,
              timestamp: event.timestamp,
              in_progress: event.in_progress || false,
            };
          })
          .filter((tx: PendingTransaction | null): tx is PendingTransaction => tx !== null);

        setPendingTransactions(pending);
      }
    } catch (error) {
      console.error("Failed to fetch pending transactions:", error);
    } finally {
      setIsLoadingPending(false);
    }
  }, [walletAddress]);

  // Handle wallet address changes - reset state and refetch
  const handleSetWalletAddress = useCallback((address: string) => {
    if (address !== walletAddress) {
      // Reset all data when wallet changes
      if (!address) {
        setTonBalance("0");
        setTonUsdValue("0.00");
        setTotalUsdBalance("0.00");
        setJettons([]);
        setHasFetched(false);
        setPendingTransactions([]);
      }
      setWalletAddress(address);
      setHasFetched(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    const storedWallet = localStorage.getItem("quantum_wallet_address");
    if (storedWallet && storedWallet !== walletAddress) {
      setWalletAddress(storedWallet);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress && !hasFetched) {
      fetchWalletAssets();
      fetchPendingTransactions();
    }
  }, [walletAddress, hasFetched, fetchWalletAssets, fetchPendingTransactions]);

  // Auto-poll for pending transactions when they exist
  useEffect(() => {
    if (!walletAddress || pendingTransactions.length === 0) return;

    const interval = setInterval(() => {
      fetchPendingTransactions();
      // Also refresh assets when pending transactions clear
      if (pendingTransactions.length > 0) {
        fetchWalletAssets();
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [walletAddress, pendingTransactions.length, fetchPendingTransactions, fetchWalletAssets]);

  return (
    <WalletContext.Provider value={{
      walletAddress,
      tonBalance,
      tonPrice,
      tonUsdValue,
      totalUsdBalance,
      jettons,
      nfts,
      hiddenAssets,
      isLoadingAssets,
      isLoadingNfts,
      hasFetched,
      hideBalance,
      isTestnet: IS_TESTNET,
      storedWallets,
      activeWalletIndex,
      pendingTransactions,
      isLoadingPending,
      fetchWalletAssets,
      fetchNfts,
      fetchPendingTransactions,
      setWalletAddress: handleSetWalletAddress,
      toggleHideAsset,
      toggleHideBalance,
      addWallet,
      removeWallet,
      switchWallet,
      renameWallet,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
