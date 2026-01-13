"use client";

import { WalletProvider } from "./WalletContext";
import { WalletKitProvider } from "@/lib/walletkit-provider";

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use mainnet by default; could be made configurable
  const isTestnet = false;
  
  return (
    <WalletProvider>
      <WalletKitProvider isTestnet={isTestnet}>
        {children}
      </WalletKitProvider>
    </WalletProvider>
  );
}
