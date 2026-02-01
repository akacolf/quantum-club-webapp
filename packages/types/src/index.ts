// Shared types for Quantum Club
// These types are shared between web and mobile apps

export interface WalletAddress {
  chain: "TON" | "ETH" | "SOL" | "BTC" | "TRX";
  address: string;
  balance?: string;
  balanceUsd?: number;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  address?: string;
  chain: "TON" | "ETH" | "SOL" | "BTC" | "TRX";
  image?: string;
  price?: number;
  priceChange24h?: number;
}

export interface Transaction {
  hash: string;
  type: "send" | "receive" | "swap" | "stake" | "unstake" | "nft_transfer";
  amount: string;
  symbol: string;
  from: string;
  to: string;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
  fee?: string;
}

export interface NftItem {
  address: string;
  name: string;
  description?: string;
  image?: string;
  collectionAddress?: string;
  collectionName?: string;
  ownerAddress?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: "above" | "below";
  createdAt: number;
  triggered?: boolean;
  triggeredAt?: number;
}

export interface UserProfile {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  walletAddress?: string;
  createdAt: number;
  isPremium?: boolean;
}
