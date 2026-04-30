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
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden pb-4 pt-2">
      <motion.div
        className="flex w-[240%] items-center"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 20, ease: "linear", repeat: Infinity }}
      >
        {[0, 1].map((group) => (
          <div key={group} className="flex min-w-[50%] items-center justify-around px-5">
            {CHAINS.map((chain) => (
              <div
                key={`${chain.name}-${group}`}
                className="mx-4 flex h-12 items-center gap-3 px-4"
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
        ))}
      </motion.div>
    </div>
  );
}
