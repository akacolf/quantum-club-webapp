"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function TopNav() {
  const pathname = usePathname();
  const isWallet = pathname.startsWith("/wallet");

  return (
    <div className="w-full flex justify-center mt-2 mb-4">
      <div className="h-11 bg-[#111] border border-[#333] rounded-xl p-1 gap-1 flex">
        <Link
          href="/home"
          className={cn(
            "rounded-lg px-8 py-2 text-sm font-medium transition-colors flex items-center justify-center",
            !isWallet
              ? "bg-[#222] text-white"
              : "text-gray-500 hover:text-gray-300"
          )}
        >
          Platform
        </Link>
        <Link
          href="/wallet"
          className={cn(
            "rounded-lg px-8 py-2 text-sm font-medium transition-colors flex items-center justify-center",
            isWallet
              ? "bg-[#222] text-white"
              : "text-gray-500 hover:text-gray-300"
          )}
        >
          Wallet
        </Link>
      </div>
    </div>
  );
}
