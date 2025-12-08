"use client";

import { WalletProvider } from "./WalletContext";
import { Toaster } from "@/components/ui/sonner";

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletProvider>
      <Toaster />
      {children}
    </WalletProvider>
  );
}
