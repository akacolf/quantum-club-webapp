"use client";

/**
 * Wallet Provider (thin wrapper)
 *
 * All state and action logic lives in stores/wallet-store.ts.
 * This Provider only:
 * 1. Hydrates state from localStorage on mount
 * 2. Derives multi-chain addresses from mnemonic
 * 3. Runs TanStack Query hooks and syncs results into the store
 * 4. Syncs external dependencies (telegramId, query refetch functions)
 */

import { useEffect, ReactNode } from "react";
import { deriveEthAddress, deriveBtcAddress, deriveSolAddress, deriveTronAddress, type ChainType } from "./utils/multichain";
import { useUserContext } from "../(contexts)/UserContext";
import { getSecureMnemonic } from "@/lib/secure-mnemonic";
import { useWalletAssetsQuery, useNftsQuery, useMultiChainBalancesQuery, useInvalidateWalletQueries } from "@/app/(hooks)/queries/use-wallet";
import { useWalletStore } from "@/stores/wallet-store";
import { useUserStore } from "@/stores/user-store";
import { useShallow } from "zustand/shallow";

// Re-export types from store for backward compatibility
export type { StoredWallet } from "@/stores/wallet-store";

export function WalletProvider({ children }: { children: ReactNode }) {
  const { telegramId } = useUserContext();
  const invalidateWalletQueries = useInvalidateWalletQueries();

  // Read current store state for query hook params
  const walletAddress = useWalletStore((s) => s.walletAddress);
  const isTestnet = useWalletStore((s) => s.isTestnet);
  const hasFetched = useWalletStore((s) => s.hasFetched);
  const ethAddress = useWalletStore((s) => s.ethAddress);
  const btcAddress = useWalletStore((s) => s.btcAddress);
  const solAddress = useWalletStore((s) => s.solAddress);
  const trxAddress = useWalletStore((s) => s.trxAddress);

  // TanStack Query hooks
  const walletAssetsQuery = useWalletAssetsQuery(walletAddress, isTestnet, false);
  const nftsQuery = useNftsQuery(walletAddress, isTestnet);
  const multiChainQuery = useMultiChainBalancesQuery(
    { eth: ethAddress, btc: btcAddress, sol: solAddress, trx: trxAddress },
    hasFetched && !isTestnet
  );

  // Sync external dependencies into the store
  const refetchAssets = walletAssetsQuery.refetch;
  const refetchNfts = nftsQuery.refetch;
  const refetchMultiChain = multiChainQuery.refetch;
  useEffect(() => {
    useWalletStore.getState().setDeps({
      telegramId,
      invalidateWalletQueries,
      refetchAssets,
      refetchNfts,
      refetchMultiChain,
    });
  }, [telegramId, invalidateWalletQueries, refetchAssets, refetchNfts, refetchMultiChain]);

  // Hydrate all wallet settings from localStorage after mount.
  // Falls back to UserStore walletAddress (set by Login.tsx from Firestore)
  // if localStorage is empty (e.g. cleared between sessions).
  const userStoreWalletAddress = useUserStore((s) => s.walletAddress);
  useEffect(() => {
    if (!telegramId) return;

    let storedAddress = localStorage.getItem(`quantum_wallet_address_${telegramId}`) || "";

    // Fallback: if localStorage doesn't have the address, use UserStore
    // (populated by Login.tsx from Firestore). Also persist it so future
    // hydrations find it directly.
    if (!storedAddress && userStoreWalletAddress) {
      storedAddress = userStoreWalletAddress;
      localStorage.setItem(`quantum_wallet_address_${telegramId}`, storedAddress);
    }

    const storedTestnet = localStorage.getItem("quantum_ton_testnet") === "true";
    const storedNetwork = localStorage.getItem("quantum_selected_network");
    const storedHideBalance = localStorage.getItem("quantum_hide_balance") === "true";
    const storedIdx = localStorage.getItem(`quantum_active_wallet_index_${telegramId}`);

    let storedWallets: import("@/stores/wallet-store").StoredWallet[] = [];
    try {
      const w = localStorage.getItem(`quantum_wallets_${telegramId}`);
      if (w) storedWallets = JSON.parse(w);
    } catch {}

    let hiddenAssets: string[] = [];
    try {
      const h = localStorage.getItem(`quantum_hidden_assets_${telegramId}`);
      if (h) hiddenAssets = JSON.parse(h);
    } catch {}

    useWalletStore.setState({
      walletAddress: storedAddress,
      isTestnet: storedTestnet,
      ...(storedNetwork ? { selectedNetwork: storedNetwork as ChainType } : {}),
      hideBalance: storedHideBalance,
      ...(storedIdx ? { activeWalletIndex: parseInt(storedIdx) } : {}),
      storedWallets,
      hiddenAssets,
    });

    // Force-invalidate wallet queries so fresh data is fetched from TonAPI.
    // This handles the case where queries were in error/stale state from a
    // previous session (e.g. queryClient.clear() during logout triggered
    // re-fetches that failed with expired auth).
    if (storedAddress) {
      invalidateWalletQueries(storedAddress);
    }
  }, [telegramId, userStoreWalletAddress, invalidateWalletQueries]);

  // Derive multi-chain addresses from mnemonic
  useEffect(() => {
    if (!telegramId || !walletAddress) return;
    // Skip if addresses were already pre-derived (e.g. during wallet import)
    const { ethAddress: existingEth } = useWalletStore.getState();
    if (existingEth) return;
    let stale = false;
    (async () => {
      try {
        const storedMnemonic = await getSecureMnemonic(telegramId);
        if (!storedMnemonic || stale) return;
        const [eth, trx, btc, sol] = await Promise.all([
          deriveEthAddress(storedMnemonic),
          deriveTronAddress(storedMnemonic),
          Promise.resolve(deriveBtcAddress(storedMnemonic, false)),
          Promise.resolve(deriveSolAddress(storedMnemonic)),
        ]);
        if (stale) return;
        useWalletStore.setState({
          ethAddress: eth,
          btcAddress: btc,
          solAddress: sol,
          trxAddress: trx,
        });
      } catch (error) {
        console.error("Failed to derive multi-chain addresses:", error);
      }
    })();
    return () => { stale = true; };
  }, [walletAddress, telegramId]);

  // Sync TanStack Query results → store
  useEffect(() => {
    if (walletAssetsQuery.data) {
      const d = walletAssetsQuery.data;
      useWalletStore.setState({
        tonBalance: d.tonBalance,
        tonPrice: d.tonPrice,
        tonUsdValue: d.tonUsdValue,
        totalUsdBalance: d.totalUsdBalance,
        walletStatus: d.walletStatus,
        change24h: d.change24h,
        jettons: d.jettons,
        hasFetched: true,
      });
    }
  }, [walletAssetsQuery.data]);

  useEffect(() => {
    if (nftsQuery.data) {
      useWalletStore.setState({ nfts: nftsQuery.data });
    }
  }, [nftsQuery.data]);

  useEffect(() => {
    if (multiChainQuery.data) {
      const b = multiChainQuery.data;
      useWalletStore.setState({
        ethBalance: b.eth.balance,
        ethUsdValue: b.eth.usdValue,
        ethPrice: b.eth.price,
        btcBalance: b.btc.balance,
        btcUsdValue: b.btc.usdValue,
        btcPrice: b.btc.price,
        solBalance: b.sol.balance,
        solUsdValue: b.sol.usdValue,
        solPrice: b.sol.price,
        trxBalance: b.trx.balance,
        trxUsdValue: b.trx.usdValue,
        trxPrice: b.trx.price,
      });
    }
  }, [multiChainQuery.data]);

  // Sync loading states
  useEffect(() => {
    useWalletStore.setState({ isLoadingAssets: walletAssetsQuery.isFetching });
  }, [walletAssetsQuery.isFetching]);

  useEffect(() => {
    useWalletStore.setState({ isLoadingNfts: nftsQuery.isFetching });
  }, [nftsQuery.isFetching]);

  useEffect(() => {
    useWalletStore.setState({ isLoadingMultiChain: multiChainQuery.isFetching });
  }, [multiChainQuery.isFetching]);

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
      change24h: s.change24h,
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
      sendTransaction: s.sendTransaction,
    }))
  );
