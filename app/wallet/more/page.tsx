"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

const SERVICES = [
  {
    title: "Stake",
    description: "Stake TON with Tonstakers",
    href: "/wallet/staking",
    icon: "lucide:circle-dollar-sign",
  },
  {
    title: "NFT",
    description: "Browse and manage collectibles",
    href: "/wallet/marketplace",
    icon: "lucide:image",
  },
  {
    title: "Lending",
    description: "Supply and borrow on EVAA",
    href: "/wallet/lending",
    icon: "lucide:landmark",
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
              className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl bg-secondary px-3 py-4 text-center active:scale-[0.98]"
            >
              <Icon icon={service.icon} className="h-6 w-6 text-neutral-200" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{service.title}</p>
                <p className="text-[11px] leading-snug text-neutral-500">{service.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
