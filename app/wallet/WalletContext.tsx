"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Address, fromNano, internal, SendMode, Cell, loadStateInit } from "@ton/core";
import { WalletContractV5R1, WalletContractV4, WalletContractV3R2 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { toast } from "sonner";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { deriveEthAddress, deriveBtcAddress, deriveSolAddress, deriveTronAddress, fetchAllMultiChainBalances, ChainType } from "./utils/multichain";
import { useUserContext } from "../(contexts)/UserContext";
import { getAccountJettons } from "@/lib/tonapi-client";

// Default testnet mode - can be overridden by user preference in localStorage
const DEFAULT_TESTNET = false;

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
  walletStatus: string;
  selectedNetwork: ChainType;
  // Multi-chain support
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
  fetchWalletAssets: () => Promise<void>;
  fetchNfts: () => Promise<void>;
  fetchMultiChainBalances: () => Promise<void>;
  setWalletStatus: (walletstatus: string) => void;
  setWalletAddress: (address: string) => void;
  setSelectedNetwork: (network: ChainType) => void;
  toggleHideAsset: (symbol: string) => void;
  toggleHideBalance: () => void;
  toggleTestnet: () => void;
  addWallet: (address: string, name?: string) => void;
  removeWallet: (address: string) => void;
  switchWallet: (address: string) => void;
  renameWallet: (address: string, newName: string) => void;
  clearWallet: () => void; // Clears all wallet state on logout
  // Auto-refresh settings
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number; // in seconds
  toggleAutoRefresh: () => void;
  setAutoRefreshInterval: (seconds: number) => void;
  // Transaction sending for QC Wallet integration
  sendTransaction: (params: {
    to: string;
    value: string; // In nano
    body?: Cell;
    stateInit?: Cell;
  }) => Promise<{ success: boolean; txHash?: string; error?: string }>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const {telegramId} = useUserContext();
  const [walletAddress, setWalletAddress] = useState(() => {
    const wallet = typeof window !== "undefined" ? localStorage.getItem(`quantum_wallet_address_${telegramId}`) : "";
    return wallet || ""; // Default to empty string if null
  });
  const [tonBalance, setTonBalance] = useState("0");
  const [tonPrice, setTonPrice] = useState(0);
  const [tonUsdValue, setTonUsdValue] = useState("0.00");
  const [totalUsdBalance, setTotalUsdBalance] = useState("0.00");
  const [jettons, setJettons] = useState<JettonBalance[]>([]);
  const [nfts, setNfts] = useState<NftItem[]>([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [walletStatus, setWalletStatus] = useState("nonexist");
  // TON Testnet mode
  const [isTestnet, setIsTestnet] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("quantum_ton_testnet") === "true";
    }
    return DEFAULT_TESTNET;
  });
      
  // Re-derive TON address when network changes
  const rederiveTonAddress = useCallback(async (testnet: boolean) => {
    if (!telegramId) return;
    
    const storedMnemonic = localStorage.getItem(`quantum_wallet_mnemonic_${telegramId}`);
    const storedVersion = localStorage.getItem(`quantum_wallet_version_${telegramId}`) || "v5r1";

    if (!storedMnemonic) return;

    try {
      const { mnemonicToWalletKey } = await import("@ton/crypto");
      const { WalletContractV5R1, WalletContractV4, WalletContractV3R2 } = await import("@ton/ton");

      const mnemonic = storedMnemonic.split(" ");
      const keyPair = await mnemonicToWalletKey(mnemonic);

      let wallet;
      switch (storedVersion) {
        case "v4r2":
          wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
          break;
        case "v3r2":
          wallet = WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey });
          break;
        case "v5r1":
        default:
          wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
          break;
      }

      const newAddress = wallet.address.toString({ bounceable: false, testOnly: testnet });
      setWalletAddress(newAddress);
      localStorage.setItem(`quantum_wallet_address_${telegramId}`, newAddress);
    } catch (error) {
      console.error("Failed to re-derive address:", error);
    }
  }, [telegramId]);

  const toggleTestnet = useCallback(() => {
    setIsTestnet(prev => {
      const newValue = !prev;
      localStorage.setItem("quantum_ton_testnet", String(newValue));

      // Reset wallet state when switching networks
      setHasFetched(false);
      setJettons([]);
      setNfts([]);
      setTonBalance("0");
      setTonUsdValue("0.00");
      setTotalUsdBalance("0.00");

      // Clear multi-chain state (ETH/BTC are mainnet-only)
      if (newValue) {
        setEthBalance(0);
        setBtcBalance(0);
        setEthUsdValue(0);
        setBtcUsdValue(0);
      }

      // Re-derive TON address with new network flag
      rederiveTonAddress(newValue);

      toast.success(newValue ? "Switched to TON Testnet" : "Switched to TON Mainnet");
      return newValue;
    });
  }, [rederiveTonAddress]);

  // Selected network for display
  const [selectedNetwork, setSelectedNetworkState] = useState<ChainType>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("quantum_selected_network");
      return (stored as ChainType) || "ton";
    }
    return "ton";
  });

  const setSelectedNetwork = useCallback((network: ChainType) => {
    setSelectedNetworkState(network);
    localStorage.setItem("quantum_selected_network", network);
  }, []);

  // Multi-chain state
  const [ethAddress, setEthAddress] = useState("");
  const [btcAddress, setBtcAddress] = useState("");
  const [solAddress, setSolAddress] = useState("");
  const [trxAddress, setTrxAddress] = useState("");
  const [ethBalance, setEthBalance] = useState(0);
  const [btcBalance, setBtcBalance] = useState(0);
  const [solBalance, setSolBalance] = useState(0);
  const [trxBalance, setTrxBalance] = useState(0);
  const [ethUsdValue, setEthUsdValue] = useState(0);
  const [btcUsdValue, setBtcUsdValue] = useState(0);
  const [solUsdValue, setSolUsdValue] = useState(0);
  const [trxUsdValue, setTrxUsdValue] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);
  const [btcPrice, setBtcPrice] = useState(0);
  const [solPrice, setSolPrice] = useState(0);
  const [trxPrice, setTrxPrice] = useState(0);
  const [isLoadingMultiChain, setIsLoadingMultiChain] = useState(false);

  // Multi-wallet support
  const [storedWallets, setStoredWallets] = useState<StoredWallet[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`quantum_wallets_${telegramId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          localStorage.removeItem(`quantum_wallets_${telegramId}`);
          return [];
        }
      }
      return [];
    }
    return [];
  });

  const [activeWalletIndex, setActiveWalletIndex] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`quantum_active_wallet_index_${telegramId}`);
      return stored ? parseInt(stored) : 0;
    }
    return 0;
  });

  const [hiddenAssets, setHiddenAssets] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`quantum_hidden_assets_${telegramId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          localStorage.removeItem(`quantum_hidden_assets_${telegramId}`);
          return [];
        }
      }
      return [];
    }
    return [];
  });

  const [hideBalance, setHideBalance] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("quantum_hide_balance") === "true";
    }
    return false;
  });

  // Auto-refresh settings
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("quantum_auto_refresh");
      return stored !== "false"; // Default to true
    }
    return true;
  });

  const [autoRefreshInterval, setAutoRefreshIntervalState] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("quantum_auto_refresh_interval");
      return stored ? parseInt(stored) : 60; // Default 60 seconds
    }
    return 60;
  });

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem("quantum_auto_refresh", String(newValue));
      return newValue;
    });
  }, []);

  const setAutoRefreshInterval = useCallback((seconds: number) => {
    const validSeconds = Math.max(30, Math.min(300, seconds)); // Clamp between 30s and 5min
    setAutoRefreshIntervalState(validSeconds);
    localStorage.setItem("quantum_auto_refresh_interval", String(validSeconds));
  }, []);

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
      localStorage.setItem(`quantum_wallets_${telegramId}`, JSON.stringify(updated));
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
        localStorage.setItem(`quantum_wallet_address_${telegramId}`, updated[0].address);
        setHasFetched(false);
      }
      localStorage.setItem(`quantum_wallets_${telegramId}`, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const switchWallet = useCallback((address: string) => {
    setStoredWallets(prev => {
      const updated = prev.map(w => ({
        ...w,
        isActive: w.address === address
      }));
      localStorage.setItem(`quantum_wallets_${telegramId}`, JSON.stringify(updated));
      const newIndex = updated.findIndex(w => w.address === address);
      setActiveWalletIndex(newIndex);
      localStorage.setItem(`quantum_active_wallet_index_${telegramId}`, String(newIndex));
      return updated;
    });
    setWalletAddress(address);
    localStorage.setItem(`quantum_wallet_address_${telegramId}`, address);
    setHasFetched(false);
    toast.success("Wallet switched!");
  }, []);

  const renameWallet = useCallback((address: string, newName: string) => {
    setStoredWallets(prev => {
      const updated = prev.map(w =>
        w.address === address ? { ...w, name: newName } : w
      );
      localStorage.setItem(`quantum_wallets_${telegramId}`, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleHideAsset = useCallback((symbol: string) => {
    setHiddenAssets(prev => {
      const newHidden = prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol];
      localStorage.setItem(`quantum_hidden_assets_${telegramId}`, JSON.stringify(newHidden));
      return newHidden;
    });
  }, [telegramId]);

  const toggleHideBalance = useCallback(() => {
    setHideBalance(prev => {
      const newValue = !prev;
      localStorage.setItem("quantum_hide_balance", String(newValue));
      return newValue;
    });
  }, []);

  // Clear all wallet state on logout
  const clearWallet = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem(`quantum_wallet_address_${telegramId}`);
    localStorage.removeItem(`quantum_wallet_mnemonic_${telegramId}`);
    localStorage.removeItem(`quantum_wallet_pin_hash_${telegramId}`);
    localStorage.removeItem(`quantum_wallet_credential_id_${telegramId}`);
    localStorage.removeItem(`quantum_wallet_version_${telegramId}`);
    localStorage.removeItem(`quantum_wallets_${telegramId}`);
    localStorage.removeItem(`quantum_active_wallet_index_${telegramId}`);
    
    // Reset all state
    setWalletAddress("");
    setTonBalance("0");
    setTonUsdValue("0.00");
    setTotalUsdBalance("0.00");
    setJettons([]);
    setNfts([]);
    setHasFetched(false);
    setWalletStatus("nonexist");
    setStoredWallets([]);
    setActiveWalletIndex(0);
    
    // Clear multi-chain state
    setEthAddress("");
    setBtcAddress("");
    setSolAddress("");
    setTrxAddress("");
    setEthBalance(0);
    setBtcBalance(0);
    setSolBalance(0);
    setTrxBalance(0);
    setEthUsdValue(0);
    setBtcUsdValue(0);
    setSolUsdValue(0);
    setTrxUsdValue(0);
  }, []);

  const fetchTonPrice = useCallback(async () => {
    // On testnet, use a mock price for testing
    if (isTestnet) {
      setTonPrice(5.0); // Mock price for testnet
      return 5.0;
    }

    try {
      // Use DeFiLlama for price data (free, no rate limits)
      const { fetchTonPrice: getTonPrice } = await import("@/lib/price-api");
      const price = await getTonPrice();
      if (price > 0) {
        setTonPrice(price);
        return price;
      }
    } catch (error) {
      console.error("Failed to fetch TON price:", error);
    }
    return tonPrice || 0;
  }, [isTestnet, tonPrice]);

  // Fetch wallet assets (TON balance + Jettons)
  const fetchWalletAssets = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoadingAssets(true);
    try {
      // Fetch TON price first
      const price = await fetchTonPrice();
      
      // Use TonAPI for TON balance
      let tonUsd = 0;
      try {
        const { getAccount } = await import("@/lib/tonapi-client");
        const balanceData = await getAccount(walletAddress, isTestnet);
        const balanceInTon = fromNano(balanceData.balance || "0");
        setTonBalance(parseFloat(balanceInTon).toFixed(4));
        setWalletStatus(balanceData.status);
        tonUsd = parseFloat(balanceInTon) * price;
        setTonUsdValue(tonUsd.toFixed(2));
      } catch (err) {
        console.error("Failed to fetch balance via TonAPI:", err);
      }

      // Fetch Jettons (tokens) balance with USD prices via authenticated proxy
      let jettonsUsdTotal = 0;
      try {
        const jettonsData = await getAccountJettons(walletAddress, isTestnet);
        const jettonBalances: JettonBalance[] = (jettonsData.balances || []).map((jetton) => {
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
      } catch (jettonError) {
        console.error("Failed to fetch jettons:", jettonError);
      }


      // Set total USD balance (TON + all Jettons)
      setTotalUsdBalance((tonUsd + jettonsUsdTotal).toFixed(2));
    } catch (error) {
      console.error("Failed to fetch wallet assets:", error);
    } finally {
      setIsLoadingAssets(false);
      setHasFetched(true);
    }
  }, [walletAddress, fetchTonPrice, isTestnet]);

  // Fetch NFTs from TonAPI via authenticated proxy
  const fetchNfts = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoadingNfts(true);
    try {
      const { getAccountNfts } = await import("@/lib/tonapi-client");
      const data = await getAccountNfts(walletAddress, isTestnet);
      
      const nftItems: NftItem[] = (data.nft_items || []).map((nft) => {
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
    } catch (error) {
      console.error("Failed to fetch NFTs:", error);
    } finally {
      setIsLoadingNfts(false);
    }
  }, [walletAddress, isTestnet]);

  // Derive multi-chain addresses from mnemonic (always mainnet)
  // Re-derive when wallet address changes (e.g., after import or wallet switch)
  useEffect(() => {
    const storedMnemonic = localStorage.getItem(`quantum_wallet_mnemonic_${telegramId}`);
    if (storedMnemonic && walletAddress) {
      try {
        // Always re-derive to ensure addresses match current mnemonic
        const eth = deriveEthAddress(storedMnemonic);
        const btc = deriveBtcAddress(storedMnemonic, false); // Always mainnet (bc1...)
        const sol = deriveSolAddress(storedMnemonic);
        const trx = deriveTronAddress(storedMnemonic);
        setEthAddress(eth);
        setBtcAddress(btc);
        setSolAddress(sol);
        setTrxAddress(trx);
      } catch (error) {
        console.error("Failed to derive multi-chain addresses:", error);
      }
    }
  }, [walletAddress]);

  // Fetch multi-chain balances (always mainnet)
  const fetchMultiChainBalances = useCallback(async () => {
    if (!ethAddress || !btcAddress || !solAddress || !trxAddress) return;

    setIsLoadingMultiChain(true);
    try {
      const balances = await fetchAllMultiChainBalances(ethAddress, btcAddress, solAddress, trxAddress, false);

      setEthBalance(balances.eth.balance);
      setEthUsdValue(balances.eth.usdValue);
      setEthPrice(balances.eth.price);

      setBtcBalance(balances.btc.balance);
      setBtcUsdValue(balances.btc.usdValue);
      setBtcPrice(balances.btc.price);

      setSolBalance(balances.sol.balance);
      setSolUsdValue(balances.sol.usdValue);
      setSolPrice(balances.sol.price);

      setTrxBalance(balances.trx.balance);
      setTrxUsdValue(balances.trx.usdValue);
      setTrxPrice(balances.trx.price);
    } catch (error) {
      console.error("Failed to fetch multi-chain balances:", error);
    } finally {
      setIsLoadingMultiChain(false);
    }
  }, [ethAddress, btcAddress, solAddress, trxAddress]);

  // Auto-fetch multi-chain balances when addresses are ready
  useEffect(() => {
    if (ethAddress && btcAddress && solAddress && trxAddress && hasFetched) {
      fetchMultiChainBalances();
    }
  }, [ethAddress, btcAddress, solAddress, trxAddress, hasFetched, fetchMultiChainBalances]);

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
      }
      setWalletAddress(address);
      setHasFetched(false);
    }
  }, [walletAddress]);

  // Sync wallet address from localStorage on mount (for SSR hydration)
  useEffect(() => {
    const storedWallet = localStorage.getItem(`quantum_wallet_address_${telegramId}`);
    if (storedWallet && storedWallet !== walletAddress) {
      setWalletAddress(storedWallet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  useEffect(() => {
    if (walletAddress && !hasFetched) {
      fetchWalletAssets();
    }
  }, [walletAddress, hasFetched, fetchWalletAssets]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled || !walletAddress || !hasFetched) {
      return;
    }

    const intervalMs = autoRefreshInterval * 1000;
    
    const refreshInterval = setInterval(() => {
      // Only refresh if the page is visible
      if (document.visibilityState === "visible") {
        fetchWalletAssets();
        if (!isTestnet) {
          fetchMultiChainBalances();
        }
      }
    }, intervalMs);

    return () => clearInterval(refreshInterval);
  }, [autoRefreshEnabled, autoRefreshInterval, walletAddress, hasFetched, isTestnet, fetchWalletAssets, fetchMultiChainBalances]);

  // Send transaction using QC Wallet credentials
  const sendTransaction = useCallback(async (params: {
    to: string;
    value: string;
    body?: Cell;
    stateInit?: Cell;
  }): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    const storedMnemonic = localStorage.getItem(`quantum_wallet_mnemonic_${telegramId}`);
    const storedVersion = localStorage.getItem(`quantum_wallet_version_${telegramId}`) || "v5r1";

    if (!storedMnemonic) {
      return { success: false, error: "Wallet not found" };
    }

    try {
      const mnemonic = storedMnemonic.split(" ");
      const keyPair = await mnemonicToPrivateKey(mnemonic);

      // Create wallet based on stored version
      let wallet;
      switch (storedVersion) {
        case "v4r2":
          wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
          break;
        case "v3r2":
          wallet = WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey });
          break;
        case "v5r1":
        default:
          wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
          break;
      }

      // Use TonAPI for reliable access
      const tonApiClient = new TonApiClient({
        baseUrl: isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io",
      });
      const contractAdapter = new ContractAdapter(tonApiClient);
      const contract = contractAdapter.open(wallet);
      const toAddress = Address.parse(params.to);

      // Get seqno with retry logic for rate limits
      let seqno = 0;
      let retries = 3;
      while (retries > 0) {
        try {
          seqno = await contract.getSeqno();
          break;
        } catch (err) {
          const error = err as { response?: { status?: number } };
          if (error?.response?.status === 429 && retries > 1) {
            // Wait and retry for rate limit
            await new Promise(resolve => setTimeout(resolve, 2000));
            retries--;
            continue;
          }
          if (retries === 1) {
            seqno = 0; // New wallet or network issue
            break;
          }
          retries--;
        }
      }

      // Create and send transfer with retry logic
      retries = 3;

      // Parse stateInit if provided
      let init: { code: import("@ton/core").Cell; data: import("@ton/core").Cell } | undefined;
      if (params.stateInit) {
        try {
          const parsedInit = loadStateInit(params.stateInit.beginParse());
          // Ensure code and data are defined
          if (!parsedInit.code || !parsedInit.data) {
            console.error("stateInit missing code or data");
            return { success: false, error: "stateInit missing required code or data" };
          }
          init = { code: parsedInit.code, data: parsedInit.data };
        } catch (parseError) {
          console.error("Failed to parse stateInit:", parseError);
          return { success: false, error: "Failed to parse stateInit: " + (parseError instanceof Error ? parseError.message : String(parseError)) };
        }
      }

      // Create external message manually for more control
      const { beginCell, storeMessage, external } = await import("@ton/core");

      // Build the internal message
      const internalMsg = internal({
        to: toAddress,
        value: BigInt(params.value),
        body: params.body,
        init: init,
        bounce: false,
      });

      // Create transfer body using the opened contract (for proper wallet type handling)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transferCell = (wallet as any).createTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: [internalMsg],
      }) as Cell;

      // Build external message
      const externalMsg = external({
        to: wallet.address,
        init: seqno === 0 ? wallet.init : undefined, // Deploy wallet if needed
        body: transferCell,
      });

      // Serialize to BOC
      const bocCell = beginCell().store(storeMessage(externalMsg)).endCell();
      const bocBase64 = bocCell.toBoc().toString("base64");

      let success = false;
      let lastError = "";

      // Use TonAPI for transaction broadcasting
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        try {
          // Send via TonAPI proxy
          const { sendBlockchainMessage } = await import("@/lib/tonapi-client");
          await sendBlockchainMessage(bocBase64, isTestnet);
          
          success = true;
          break;
        } catch (err) {
          console.error(`TonAPI send attempt ${attempt} failed:`, err);
          lastError = `TonAPI: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      if (!success) {
        throw new Error(lastError || "Failed to send transaction via TonAPI");
      }

      setTimeout(() => {
        fetchWalletAssets();
      }, 3000);

      return { success: true, txHash: `${seqno}` };
    } catch (error) {
      console.error("Transaction failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transaction failed"
      };
    }
  }, [isTestnet, fetchWalletAssets]);

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
      isTestnet,
      storedWallets,
      activeWalletIndex,
      walletStatus,
      selectedNetwork,
      // Multi-chain
      ethAddress,
      btcAddress,
      solAddress,
      trxAddress,
      ethBalance,
      btcBalance,
      solBalance,
      trxBalance,
      ethUsdValue,
      btcUsdValue,
      solUsdValue,
      trxUsdValue,
      ethPrice,
      btcPrice,
      solPrice,
      trxPrice,
      isLoadingMultiChain,
      setWalletStatus,
      fetchWalletAssets,
      fetchNfts,
      fetchMultiChainBalances,
      setWalletAddress: handleSetWalletAddress,
      setSelectedNetwork,
      toggleHideAsset,
      toggleHideBalance,
      toggleTestnet,
      addWallet,
      removeWallet,
      switchWallet,
      renameWallet,
      clearWallet,
      // Auto-refresh
      autoRefreshEnabled,
      autoRefreshInterval,
      toggleAutoRefresh,
      setAutoRefreshInterval,
      sendTransaction,
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

