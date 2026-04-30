"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const CHAINS = [
  { name: "TON", icon: "/svg/ton-logo.svg" },
  { name: "Ethereum", icon: "/svg/eth-logo.svg" },
  { name: "Bitcoin", icon: "/svg/btc-logo.svg" },
  { name: "Solana", icon: "/svg/sol-logo.svg" },
  { name: "Tron", icon: "/svg/trx-logo.svg" },
];

export default function WalletWelcomeCinematic() {
  const marqueeItems = [...CHAINS, ...CHAINS];

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden py-6">
      <motion.div
        className="flex w-max items-center gap-8"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 20, ease: "linear", repeat: Infinity }}
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
      </motion.div>
    </div>
  );
}
