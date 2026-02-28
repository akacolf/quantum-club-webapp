"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { Address, internal, SendMode, Cell, loadStateInit } from "@ton/core";
import { WalletContractV5R1, WalletContractV4, WalletContractV3R2 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { toast } from "sonner";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { deriveEthAddress, deriveBtcAddress, deriveSolAddress, deriveTronAddress, ChainType } from "./utils/multichain";
import { useUserContext } from "../(contexts)/UserContext";
import { useWalletAssetsQuery, useNftsQuery, useMultiChainBalancesQuery, useInvalidateWalletQueries } from "@/app/(hooks)/queries/use-wallet";
import { useWalletStore } from "@/stores/wallet-store";
import { useShallow } from "zustand/shallow";

// Re-export types from store for backward compatibility
export type { StoredWallet } from "@/stores/wallet-store";

// Default testnet mode - can be overridden by user preference in localStorage
const DEFAULT_TESTNET = false;

export function WalletProvider({ children }: { children: ReactNode }) {
  const {telegramId} = useUserContext();
  const [walletAddress, setWalletAddress] = useState("");
  const [tonBalance, setTonBalance] = useState("0");
  const [tonPrice, setTonPrice] = useState(0);
  const [tonUsdValue, setTonUsdValue] = useState("0.00");
  const [totalUsdBalance, setTotalUsdBalance] = useState("0.00");
  const [jettons, setJettons] = useState<import("@/stores/wallet-store").JettonBalance[]>([]);
  const [nfts, setNfts] = useState<import("@/stores/wallet-store").NftItem[]>([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [walletStatus, setWalletStatus] = useState("nonexist");
  const [isTestnet, setIsTestnet] = useState(DEFAULT_TESTNET);

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
  const [selectedNetwork, setSelectedNetworkState] = useState<ChainType>("ton");

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
  const [storedWallets, setStoredWallets] = useState<import("@/stores/wallet-store").StoredWallet[]>([]);
  const [activeWalletIndex, setActiveWalletIndex] = useState(0);
  const [hiddenAssets, setHiddenAssets] = useState<string[]>([]);
  const [hideBalance, setHideBalance] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [autoRefreshInterval, setAutoRefreshIntervalState] = useState(60);

  // Hydrate all wallet settings from localStorage after mount
  useEffect(() => {
    if (!telegramId) return;
    setWalletAddress(localStorage.getItem(`quantum_wallet_address_${telegramId}`) || "");
    setIsTestnet(localStorage.getItem("quantum_ton_testnet") === "true");
    const storedNetwork = localStorage.getItem("quantum_selected_network");
    if (storedNetwork) setSelectedNetworkState(storedNetwork as ChainType);
    setHideBalance(localStorage.getItem("quantum_hide_balance") === "true");
    const storedAutoRefresh = localStorage.getItem("quantum_auto_refresh");
    setAutoRefreshEnabled(storedAutoRefresh !== "false");
    const storedInterval = localStorage.getItem("quantum_auto_refresh_interval");
    if (storedInterval) setAutoRefreshIntervalState(parseInt(storedInterval));
    const storedIdx = localStorage.getItem(`quantum_active_wallet_index_${telegramId}`);
    if (storedIdx) setActiveWalletIndex(parseInt(storedIdx));
    try {
      const w = localStorage.getItem(`quantum_wallets_${telegramId}`);
      if (w) setStoredWallets(JSON.parse(w));
    } catch {}
    try {
      const h = localStorage.getItem(`quantum_hidden_assets_${telegramId}`);
      if (h) setHiddenAssets(JSON.parse(h));
    } catch {}
  }, [telegramId]);

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
      const newWallet: import("@/stores/wallet-store").StoredWallet = {
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

  // ---- TanStack Query integration ----
  const invalidateWalletQueries = useInvalidateWalletQueries();
  const refetchIntervalMs = autoRefreshEnabled ? autoRefreshInterval * 1000 : false;

  const walletAssetsQuery = useWalletAssetsQuery(walletAddress, isTestnet, refetchIntervalMs);
  const nftsQuery = useNftsQuery(walletAddress, isTestnet);
  const multiChainQuery = useMultiChainBalancesQuery(
    { eth: ethAddress, btc: btcAddress, sol: solAddress, trx: trxAddress },
    hasFetched && !isTestnet
  );

  // Sync query data → local state
  useEffect(() => {
    if (walletAssetsQuery.data) {
      const d = walletAssetsQuery.data;
      setTonBalance(d.tonBalance);
      setTonPrice(d.tonPrice);
      setTonUsdValue(d.tonUsdValue);
      setTotalUsdBalance(d.totalUsdBalance);
      setWalletStatus(d.walletStatus);
      setJettons(d.jettons);
      setHasFetched(true);
    }
  }, [walletAssetsQuery.data]);

  useEffect(() => {
    if (nftsQuery.data) {
      setNfts(nftsQuery.data);
    }
  }, [nftsQuery.data]);

  useEffect(() => {
    if (multiChainQuery.data) {
      const b = multiChainQuery.data;
      setEthBalance(b.eth.balance);
      setEthUsdValue(b.eth.usdValue);
      setEthPrice(b.eth.price);
      setBtcBalance(b.btc.balance);
      setBtcUsdValue(b.btc.usdValue);
      setBtcPrice(b.btc.price);
      setSolBalance(b.sol.balance);
      setSolUsdValue(b.sol.usdValue);
      setSolPrice(b.sol.price);
      setTrxBalance(b.trx.balance);
      setTrxUsdValue(b.trx.usdValue);
      setTrxPrice(b.trx.price);
    }
  }, [multiChainQuery.data]);

  // Sync loading states from queries
  useEffect(() => {
    setIsLoadingAssets(walletAssetsQuery.isFetching);
  }, [walletAssetsQuery.isFetching]);

  useEffect(() => {
    setIsLoadingNfts(nftsQuery.isFetching);
  }, [nftsQuery.isFetching]);

  useEffect(() => {
    setIsLoadingMultiChain(multiChainQuery.isFetching);
  }, [multiChainQuery.isFetching]);

  // Imperative refetch wrappers (preserve existing interface)
  const fetchWalletAssets = useCallback(async () => {
    await walletAssetsQuery.refetch();
  }, [walletAssetsQuery]);

  const fetchNfts = useCallback(async () => {
    await nftsQuery.refetch();
  }, [nftsQuery]);

  const fetchMultiChainBalances = useCallback(async () => {
    await multiChainQuery.refetch();
  }, [multiChainQuery]);

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

  // Derive multi-chain addresses from mnemonic (always mainnet)
  useEffect(() => {
    const storedMnemonic = localStorage.getItem(`quantum_wallet_mnemonic_${telegramId}`);
    if (storedMnemonic && walletAddress) {
      try {
        const eth = deriveEthAddress(storedMnemonic);
        const btc = deriveBtcAddress(storedMnemonic, false);
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

  // Handle wallet address changes - reset state and refetch
  const handleSetWalletAddress = useCallback((address: string) => {
    if (address !== walletAddress) {
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
      let messageHash = "";

      // Compute the BOC hash as fallback tx identifier
      const bocHash = bocCell.hash().toString("hex");

      // Use TonAPI for transaction broadcasting
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        try {
          // Send via TonAPI proxy
          const { sendBlockchainMessage } = await import("@/lib/tonapi-client");
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
        throw new Error(lastError || "Failed to send transaction via TonAPI");
      }

      setTimeout(() => {
        invalidateWalletQueries(walletAddress);
      }, 3000);

      return { success: true, txHash: messageHash };
    } catch (error) {
      console.error("Transaction failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transaction failed"
      };
    }
  }, [isTestnet, invalidateWalletQueries, walletAddress]);

  // =====================================================
  // Bridge: Sync state and actions into Zustand store
  // =====================================================
  useEffect(() => {
    useWalletStore.setState({
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
    });
  }, [
    walletAddress, tonBalance, tonPrice, tonUsdValue, totalUsdBalance,
    jettons, nfts, hiddenAssets, isLoadingAssets, isLoadingNfts,
    hasFetched, hideBalance, isTestnet, storedWallets, activeWalletIndex,
    walletStatus, selectedNetwork,
  ]);

  useEffect(() => {
    useWalletStore.setState({
      ethAddress, btcAddress, solAddress, trxAddress,
      ethBalance, btcBalance, solBalance, trxBalance,
      ethUsdValue, btcUsdValue, solUsdValue, trxUsdValue,
      ethPrice, btcPrice, solPrice, trxPrice,
      isLoadingMultiChain,
      autoRefreshEnabled,
      autoRefreshInterval,
    });
  }, [
    ethAddress, btcAddress, solAddress, trxAddress,
    ethBalance, btcBalance, solBalance, trxBalance,
    ethUsdValue, btcUsdValue, solUsdValue, trxUsdValue,
    ethPrice, btcPrice, solPrice, trxPrice,
    isLoadingMultiChain, autoRefreshEnabled, autoRefreshInterval,
  ]);

  useEffect(() => {
    useWalletStore.setState({
      fetchWalletAssets,
      fetchNfts,
      fetchMultiChainBalances,
      setWalletAddress: handleSetWalletAddress,
      setWalletStatus,
      setSelectedNetwork,
      toggleHideAsset,
      toggleHideBalance,
      toggleTestnet,
      addWallet,
      removeWallet,
      switchWallet,
      renameWallet,
      clearWallet,
      toggleAutoRefresh,
      setAutoRefreshInterval,
      sendTransaction,
    });
  }, [
    fetchWalletAssets, fetchNfts, fetchMultiChainBalances,
    handleSetWalletAddress, setWalletStatus, setSelectedNetwork,
    toggleHideAsset, toggleHideBalance, toggleTestnet,
    addWallet, removeWallet, switchWallet, renameWallet, clearWallet,
    toggleAutoRefresh, setAutoRefreshInterval, sendTransaction,
  ]);

  return <>{children}</>;
}

// =====================================================
// Compatibility hook — consumers continue using useWallet() unchanged
// =====================================================
export const useWallet = () =>
  useWalletStore(
    useShallow((s) => ({
      walletAddress: s.walletAddress,
      tonBalance: s.tonBalance,
      tonPrice: s.tonPrice,
      tonUsdValue: s.tonUsdValue,
      totalUsdBalance: s.totalUsdBalance,
      jettons: s.jettons,
      nfts: s.nfts,
      hiddenAssets: s.hiddenAssets,
      isLoadingAssets: s.isLoadingAssets,
      isLoadingNfts: s.isLoadingNfts,
      hasFetched: s.hasFetched,
      hideBalance: s.hideBalance,
      isTestnet: s.isTestnet,
      storedWallets: s.storedWallets,
      activeWalletIndex: s.activeWalletIndex,
      walletStatus: s.walletStatus,
      selectedNetwork: s.selectedNetwork,
      ethAddress: s.ethAddress,
      btcAddress: s.btcAddress,
      solAddress: s.solAddress,
      trxAddress: s.trxAddress,
      ethBalance: s.ethBalance,
      btcBalance: s.btcBalance,
      solBalance: s.solBalance,
      trxBalance: s.trxBalance,
      ethUsdValue: s.ethUsdValue,
      btcUsdValue: s.btcUsdValue,
      solUsdValue: s.solUsdValue,
      trxUsdValue: s.trxUsdValue,
      ethPrice: s.ethPrice,
      btcPrice: s.btcPrice,
      solPrice: s.solPrice,
      trxPrice: s.trxPrice,
      isLoadingMultiChain: s.isLoadingMultiChain,
      fetchWalletAssets: s.fetchWalletAssets,
      fetchNfts: s.fetchNfts,
      fetchMultiChainBalances: s.fetchMultiChainBalances,
      setWalletAddress: s.setWalletAddress,
      setWalletStatus: s.setWalletStatus,
      setSelectedNetwork: s.setSelectedNetwork,
      toggleHideAsset: s.toggleHideAsset,
      toggleHideBalance: s.toggleHideBalance,
      toggleTestnet: s.toggleTestnet,
      addWallet: s.addWallet,
      removeWallet: s.removeWallet,
      switchWallet: s.switchWallet,
      renameWallet: s.renameWallet,
      clearWallet: s.clearWallet,
      autoRefreshEnabled: s.autoRefreshEnabled,
      autoRefreshInterval: s.autoRefreshInterval,
      toggleAutoRefresh: s.toggleAutoRefresh,
      setAutoRefreshInterval: s.setAutoRefreshInterval,
      sendTransaction: s.sendTransaction,
    }))
  );
