"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const CHAINS = [
  { name: "TON", icon: "/svg/ton-logo.svg" },
  { name: "Ethereum", icon: "/svg/eth-logo.svg" },
  { name: "Bitcoin", icon: "/svg/btc-logo.svg" },
  { name: "Solana", icon: "/svg/sol-logo.svg" },
  { name: "Tron", icon: "/svg/trx-logo.svg" },
];

export default function WalletWelcomeCinematic() {
  const marqueeChains = [...CHAINS, ...CHAINS, ...CHAINS, ...CHAINS];

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden py-2">
      <motion.div
        className="flex w-max items-center will-change-transform"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 46,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        }}
      >
        {[0, 1].map((group) => (
          <div key={group} className="flex shrink-0 items-center gap-14 px-[5vw]">
            {marqueeChains.map((chain, index) => (
              <div
                key={`${chain.name}-${group}-${index}`}
                className="flex h-12 shrink-0 items-center gap-3.5"
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
