"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { CHAIN_INFO, ChainType } from "@/app/wallet/utils/multichain";

interface NetworkSelectorProps {
    selectedNetwork: ChainType;
    onNetworkChange: (network: ChainType) => void;
    isTestnet?: boolean;
    balances?: {
        ton?: number;
        eth?: number;
        btc?: number;
        sol?: number;
        trx?: number;
    };
}

export function NetworkSelector({
    selectedNetwork,
    onNetworkChange,
    isTestnet = false,
    balances = {},
}: NetworkSelectorProps) {
    const [open, setOpen] = useState(false);

    const currentChain = CHAIN_INFO[selectedNetwork];

    // Filter chains based on testnet mode
    const availableChains = isTestnet
        ? (["ton"] as ChainType[])
        : (Object.keys(CHAIN_INFO) as ChainType[]);

    const handleNetworkSelect = (network: ChainType) => {
        onNetworkChange(network);
        setOpen(false);
    };

    const getBalance = (chain: ChainType): string => {
        const balance = balances[chain as keyof typeof balances];
        if (balance === undefined) return "0";

        // Format based on chain
        switch (chain) {
            case "btc":
                return balance.toFixed(6);
            case "eth":
                return balance.toFixed(4);
            default:
                return balance.toFixed(2);
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    className="h-9 px-3 gap-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10"
                >
                    <div
                        className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: currentChain.color }}
                    >
                        <Image
                            src={currentChain.logo}
                            alt={currentChain.symbol}
                            width={14}
                            height={14}
                            className="w-3.5 h-3.5"
                        />
                    </div>
                    <span className="text-sm font-medium text-white">
                        {currentChain.symbol}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl bg-[#111] border-[#333] pb-8">
                <SheetHeader className="pb-4">
                    <SheetTitle className="text-white text-lg">Select Network</SheetTitle>
                </SheetHeader>
                <div className="space-y-2">
                    {availableChains.map((chainKey) => {
                        const chain = CHAIN_INFO[chainKey];
                        const isSelected = chainKey === selectedNetwork;

                        return (
                            <button
                                key={chainKey}
                                onClick={() => handleNetworkSelect(chainKey)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${isSelected
                                        ? "bg-white/10 border border-white/20"
                                        : "bg-[#1a1a1a] border border-transparent hover:bg-[#222] hover:border-white/10"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shadow-lg"
                                        style={{ backgroundColor: chain.color + "20" }}
                                    >
                                        <Image
                                            src={chain.logo}
                                            alt={chain.symbol}
                                            width={24}
                                            height={24}
                                            className="w-6 h-6"
                                        />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white">{chain.name}</span>
                                            {chain.receiveOnly && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[9px] px-1.5 py-0 h-4 bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                                >
                                                    Receive Only
                                                </Badge>
                                            )}
                                        </div>
                                        <span className="text-sm text-gray-500">{chain.symbol}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="font-medium text-white">
                                        {getBalance(chainKey)} {chain.symbol}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </SheetContent>
        </Sheet>
    );
}
