"use client";

import { WalletProvider } from "./WalletContext";
import { WalletKitProvider } from "@/lib/walletkit-provider";
import WalletNavigation from "./(navigation)/WalletNavigation";

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
        <div className="wallet-app">
          {children}
          <WalletNavigation />
        </div>
      </WalletKitProvider>
    </WalletProvider>
  );
}
