"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { fromNano } from "@ton/core";

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
}

interface WalletContextType {
  walletAddress: string;
  tonBalance: string;
  tonPrice: number;
  tonUsdValue: string;
  totalUsdBalance: string;
  jettons: JettonBalance[];
  isLoadingAssets: boolean;
  hasFetched: boolean;
  fetchWalletAssets: () => Promise<void>;
  setWalletAddress: (address: string) => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [tonBalance, setTonBalance] = useState("0");
  const [tonPrice, setTonPrice] = useState(0);
  const [tonUsdValue, setTonUsdValue] = useState("0.00");
  const [totalUsdBalance, setTotalUsdBalance] = useState("0.00");
  const [jettons, setJettons] = useState<JettonBalance[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch TON price
  const fetchTonPrice = useCallback(async () => {
    try {
      const response = await fetch("https://tonapi.io/v2/rates?tokens=ton&currencies=usd");
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
      
      // Fetch TON balance using TON API
      let tonUsd = 0;
      const balanceResponse = await fetch(`https://tonapi.io/v2/accounts/${walletAddress}`);
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
      const jettonsResponse = await fetch(`https://tonapi.io/v2/accounts/${walletAddress}/jettons?currencies=usd`);
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
      setHasFetched(false); // Trigger refetch for new wallet
    }
  }, [walletAddress]);

  // Initialize wallet address from localStorage
  useEffect(() => {
    const storedWallet = localStorage.getItem("quantum_wallet_address");
    if (storedWallet && storedWallet !== walletAddress) {
      setWalletAddress(storedWallet);
    }
  }, [walletAddress]);

  // Fetch assets when wallet address changes
  useEffect(() => {
    if (walletAddress && !hasFetched) {
      fetchWalletAssets();
    }
  }, [walletAddress, hasFetched, fetchWalletAssets]);

  return (
    <WalletContext.Provider value={{
      walletAddress,
      tonBalance,
      tonPrice,
      tonUsdValue,
      totalUsdBalance,
      jettons,
      isLoadingAssets,
      hasFetched,
      fetchWalletAssets,
      setWalletAddress: handleSetWalletAddress,
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
