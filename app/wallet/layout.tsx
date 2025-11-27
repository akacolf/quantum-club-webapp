"use client";

import { WalletProvider } from "./WalletContext";

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WalletProvider>{children}</WalletProvider>;
}
