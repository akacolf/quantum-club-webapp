"use client";

import Image from "next/image";

const CHAINS = [
  { name: "TON", icon: "/svg/ton-logo.svg" },
  { name: "Ethereum", icon: "/svg/eth-logo.svg" },
  { name: "Bitcoin", icon: "/svg/btc-logo.svg" },
  { name: "Solana", icon: "/svg/sol-logo.svg" },
  { name: "Tron", icon: "/svg/trx-logo.svg" },
];

export default function WalletWelcomeCinematic() {
  const marqueeItems = [...CHAINS, ...CHAINS, ...CHAINS];

  return (
    <div className="relative w-full overflow-hidden py-8">
      <style>{`
        @keyframes wallet-chain-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
      `}</style>
      <div
        className="flex w-max items-center gap-8"
        style={{ animation: "wallet-chain-marquee 18s linear infinite" }}
      >
        {marqueeItems.map((chain, index) => (
          <div
            key={`${chain.name}-${index}`}
            className="flex h-12 items-center gap-3"
          >
            <Image
              src={chain.icon}
              alt={chain.name}
              width={30}
              height={30}
              className="size-7 rounded-full"
              unoptimized
            />
            <span className="whitespace-nowrap text-sm font-semibold text-neutral-200">
              {chain.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
