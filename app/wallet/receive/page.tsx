"use client";

import { useEffect, useMemo } from "react";
import { useQueryState } from "nuqs";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Loader from "@/app/(components)/Loader";
import { useWallet } from "../WalletContext";
import { CHAIN_INFO, ChainType } from "../utils/multichain";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";

export default function ReceivePage() {
  useTelegramBackButton("/wallet");
  const router = useRouter();
  const {
    walletAddress,
    isTestnet,
  } = useWallet();

  const [searchQuery, setSearchQuery] = useQueryState("q", { defaultValue: "" });

  // Filter available chains based on testnet mode and search query
  const availableChains = useMemo(() => (Object.keys(CHAIN_INFO) as ChainType[]).filter(chainKey => {
    if (isTestnet && chainKey !== "ton") return false;

    const chain = CHAIN_INFO[chainKey];
    const query = searchQuery.toLowerCase();
    return (
      chain.name.toLowerCase().includes(query) ||
      chain.symbol.toLowerCase().includes(query)
    );
  }), [isTestnet, searchQuery]);

  useEffect(() => {
    availableChains.forEach((chain) => {
      router.prefetch(`/wallet/receive/${chain}` as Route);
    });
  }, [availableChains, router]);

  if (!walletAddress) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col pt-6">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-left space-y-2 mb-2">
          <h1 className="text-2xl font-bold">Receive assets</h1>
          <p className="text-muted-foreground text-sm">
            Select a network to receive funds
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <Input
            placeholder="Search assets..."
            className="pl-9 bg-secondary border-0 h-11 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Asset List */}
        <div className="space-y-3">
          {availableChains.map((chainKey) => {
            const chain = CHAIN_INFO[chainKey];
            return (
              <Link
                key={chainKey}
                href={`/wallet/receive/${chainKey}` as Route}
                prefetch
                className="block"
              >
                <Card className="bg-secondary border-0 hover:bg-secondary/80 cursor-pointer transition-all active:scale-[0.99] rounded-2xl overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center">
                        <Image
                          src={chain.logo}
                          alt={chain.name}
                          width={44}
                          height={44}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <h3 className="font-bold text-white text-base leading-tight">{chain.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold tracking-tight text-muted-foreground">
                            {chain.symbol}
                          </span>
                          {chain.receiveOnly && (
                            <span className="text-[9px] font-bold text-yellow-500/80">
                              Receive only
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground/30"/>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {availableChains.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No assets found matching &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
