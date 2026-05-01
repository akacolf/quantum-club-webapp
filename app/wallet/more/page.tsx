"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

const SERVICES = [
  {
    title: "Stake",
    href: "/wallet/staking",
    icon: "lucide:circle-dollar-sign",
  },
  {
    title: "Lend",
    href: "/wallet/lending",
    icon: "lucide:landmark",
  },
  {
    title: "NFT",
    href: "/wallet/marketplace",
    icon: "lucide:image",
  },
] as const;

export default function WalletMorePage() {
  useTelegramBackButton("/wallet");

  return (
    <div className="min-h-screen bg-black px-4 pt-6 pb-28 text-white">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-left">
          <h1 className="text-2xl font-bold tracking-tight">Additional services</h1>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {SERVICES.map((service) => (
            <Link
              key={service.href}
              href={service.href}
              className="group flex flex-col items-center justify-center gap-2 text-center active:scale-[0.98]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-white transition-transform duration-200 group-hover:scale-105">
                <Icon icon={service.icon} className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-white">{service.title}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
