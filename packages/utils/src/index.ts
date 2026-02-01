// Shared utilities for Quantum Club
// These utilities are shared between web and mobile apps

/**
 * Format a number with specified decimal places
 */
export function formatNumber(
  value: number | string,
  decimals: number = 2,
  locale: string = "en-US"
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return num.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a token amount with appropriate precision
 */
export function formatTokenAmount(
  amount: string | number,
  decimals: number = 9
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";
  
  const value = num / Math.pow(10, decimals);
  
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + "M";
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(2) + "K";
  }
  if (value >= 1) {
    return value.toFixed(2);
  }
  if (value >= 0.0001) {
    return value.toFixed(4);
  }
  return value.toExponential(2);
}

/**
 * Format USD value
 */
export function formatUsd(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0.00";
  return "$" + formatNumber(num, 2);
}

/**
 * Shorten an address for display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Convert nanoTON to TON
 */
export function fromNano(amount: string | bigint): number {
  const value = typeof amount === "string" ? BigInt(amount) : amount;
  return Number(value) / 1e9;
}

/**
 * Convert TON to nanoTON
 */
export function toNano(amount: number | string): bigint {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return BigInt(Math.floor(num * 1e9));
}

/**
 * Validate a TON address
 */
export function isValidTonAddress(address: string): boolean {
  // Basic validation for TON addresses (EQ... or UQ... format)
  const tonAddressRegex = /^(EQ|UQ)[a-zA-Z0-9_-]{46}$/;
  return tonAddressRegex.test(address);
}

/**
 * Validate an Ethereum address
 */
export function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Format a timestamp as relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}
