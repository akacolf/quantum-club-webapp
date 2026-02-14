"use client";

import dynamic from "next/dynamic";
import { WalletProvider } from "./WalletContext";
import { WalletKitProvider } from "@/lib/walletkit-provider";
import WalletNavigation from "./(navigation)/WalletNavigation";

const AIChatDrawer = dynamic(() => import("@/app/(components)/AIChatDrawer"), { ssr: false });

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
          <AIChatDrawer />
        </div>
      </WalletKitProvider>
    </WalletProvider>
  );
}
