"use client";

import dynamic from "next/dynamic";
import { WalletKitProvider } from "@/lib/walletkit-provider";
import { useWalletStore } from "@/stores/wallet-store";
import WalletNavigation from "./(navigation)/WalletNavigation";

const AIChatDrawer = dynamic(() => import("@/app/(components)/AIChatDrawer"), { ssr: false });

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isTestnet = useWalletStore((s) => s.isTestnet);

  return (
    <WalletKitProvider isTestnet={isTestnet}>
      <div className="wallet-app">
        {children}
        <WalletNavigation />
        <AIChatDrawer />
      </div>
    </WalletKitProvider>
  );
}
