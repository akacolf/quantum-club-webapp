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
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16"
        style={{ backgroundImage: "linear-gradient(to right, #000, transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16"
        style={{ backgroundImage: "linear-gradient(to left, #000, transparent)" }}
      />
      <div
        className="flex w-max gap-3"
        style={{ animation: "wallet-chain-marquee 18s linear infinite" }}
      >
        {marqueeItems.map((chain, index) => (
          <div
            key={`${chain.name}-${index}`}
            className="flex h-16 items-center gap-3 rounded-2xl bg-secondary px-4 shadow-sm"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-black">
              <Image
                src={chain.icon}
                alt={chain.name}
                width={24}
                height={24}
                className="size-6 rounded-full"
                unoptimized
              />
            </span>
            <span className="whitespace-nowrap text-sm font-semibold text-neutral-200">
              {chain.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
