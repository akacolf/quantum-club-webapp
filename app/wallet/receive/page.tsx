"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Loader from "@/app/(components)/Loader";
import { useWallet } from "../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CHAIN_INFO, ChainType } from "../utils/multichain";
import StyledQRCode from "@/components/StyledQRCode";
import Image from "next/image";

export default function ReceivePage() {
  useTelegramBackButton("/wallet");
  const {
    walletAddress,
    isTestnet,
    ethAddress,
    btcAddress,
    solAddress,
    trxAddress,
  } = useWallet();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChain, setSelectedChain] = useState<ChainType | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { qcUsername } = useUserContext();

  // Filter available chains based on testnet mode and search query
  const availableChains = (Object.keys(CHAIN_INFO) as ChainType[]).filter(chainKey => {
    if (isTestnet && chainKey !== "ton") return false;

    const chain = CHAIN_INFO[chainKey];
    const query = searchQuery.toLowerCase();
    return (
      chain.name.toLowerCase().includes(query) ||
      chain.symbol.toLowerCase().includes(query)
    );
  });

  // Get address for a specific chain
  const getAddressForChain = useCallback((chain: ChainType) => {
    switch (chain) {
      case "ton": return walletAddress;
      case "eth": return ethAddress;
      case "btc": return btcAddress;
      case "sol": return solAddress;
      case "trx": return trxAddress;
      default: return "";
    }
  }, [walletAddress, ethAddress, btcAddress, solAddress, trxAddress]);

  // Handle selection
  const handleSelectChain = (chain: ChainType) => {
    setSelectedChain(chain);
    setSheetOpen(true);
  };


  const copyAddress = () => {
    if (!selectedChain) return;
    const address = getAddressForChain(selectedChain);
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (!selectedChain) return;
    const address = getAddressForChain(selectedChain);
    const chainInfo = CHAIN_INFO[selectedChain];
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(address)}&text=${encodeURIComponent(`My ${chainInfo.name} Wallet Address`)}`;

    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  if (!walletAddress) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col pt-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto space-y-6"
      >
        <div className="text-center space-y-2 mb-2">
          <h1 className="text-2xl font-bold">Receive Assets</h1>
          <p className="text-muted-foreground text-sm">
            Select a network to receive funds
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <Input
            placeholder="Search assets..."
            className="pl-9 bg-muted border-border h-11 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Asset List */}
        <div className="space-y-3">
          {availableChains.map((chainKey) => {
            const chain = CHAIN_INFO[chainKey];
            return (
              <Card
                key={chainKey}
                onClick={() => handleSelectChain(chainKey)}
                className="bg-[#111] border-[#222] hover:bg-[#161616] cursor-pointer transition-all active:scale-[0.99] rounded-2xl overflow-hidden"
              >
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
                        <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 bg-muted/50 text-muted-foreground font-bold tracking-tight">
                          {chain.symbol}
                        </Badge>
                        {chain.receiveOnly && (
                          <Badge variant="outline" className="text-[9px] h-4.5 px-1.5 border-yellow-500/30 text-yellow-500/80 uppercase font-bold">
                            Receive only
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground/30"/>
                </CardContent>
              </Card>
            );
          })}

          {availableChains.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No assets found matching &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </motion.div>

      {/* Receive Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[32px] bg-[#0c0c0c] border-[#222] pb-8 pt-6 px-6 max-h-[85vh] overflow-y-auto scrollbar-hide">
          <SheetHeader className="mb-8 text-center">
            <SheetTitle className="text-2xl font-bold text-white">Receive {selectedChain && (CHAIN_INFO[selectedChain].name === "Tron" ? "TRON" : CHAIN_INFO[selectedChain].name)}</SheetTitle>
            <SheetDescription className="text-gray-400">
              Scan the QR code to deposit funds
            </SheetDescription>
          </SheetHeader>

          {selectedChain && (
            <div className="flex flex-col items-center space-y-8 w-full max-w-sm mx-auto">
              {/* QR Code Container */}
              <div className="relative p-1.5 bg-white rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                <div className="bg-white p-4 rounded-[22px]">
                  <StyledQRCode
                    data={getAddressForChain(selectedChain) || ""}
                    image={CHAIN_INFO[selectedChain].logo}
                    size={200}
                  />
                </div>
              </div>

              {/* Warning */}
              <Alert variant="warning" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500">
                <Icon icon="lucide:shield-alert" className="w-4 h-4"/>
                <AlertTitle className="text-xs font-bold uppercase tracking-wide opacity-80">Warning</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed opacity-90 mt-1">
                  {CHAIN_INFO[selectedChain].warningText}
                </AlertDescription>
              </Alert>

              {/* QC Username (TON only) */}
              {selectedChain === "ton" && qcUsername && (
                <div className="w-full space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold ml-1">
                    Your QC Username
                  </Label>
                  <div
                    onClick={() => {
                      navigator.clipboard.writeText(`@${qcUsername}`);
                      toast.success("Username copied!");
                    }}
                    className="w-full bg-[#161616] border border-[#222] active:border-primary/50 rounded-xl p-4 cursor-pointer transition-colors hover:bg-[#1a1a1a]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon icon="solar:user-id-bold" className="w-4 h-4 text-primary" />
                        <p className="text-base font-bold text-foreground">
                          @{qcUsername}
                        </p>
                      </div>
                      <Icon icon="solar:copy-bold" className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Others can send TON to your @username
                    </p>
                  </div>
                </div>
              )}

              {/* Address Box */}
              <div className="w-full space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold ml-1">
                  Your {CHAIN_INFO[selectedChain].symbol} Address
                </Label>
                <div
                  onClick={copyAddress}
                  className="w-full bg-[#161616] border border-[#222] active:border-primary/50 rounded-xl p-4 cursor-pointer transition-colors hover:bg-[#1a1a1a]"
                >
                  <p className="text-sm font-mono break-all text-gray-300 leading-relaxed">
                    {getAddressForChain(selectedChain)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 w-full pt-2">
                <Button
                  onClick={copyAddress}
                  className="bg-white text-black hover:bg-gray-200 h-12 rounded-xl font-bold shadow-lg shadow-white/5 active:scale-[0.98] transition-transform"
                >
                  {copied ? <><Icon icon="lucide:check" className="w-4 h-4 mr-2"/> Copied</> : <><Icon icon="lucide:copy" className="w-4 h-4 mr-2"/> Copy</>}
                </Button>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="bg-[#161616] border-[#222] text-white hover:bg-[#222] h-12 rounded-xl font-bold active:scale-[0.98] transition-transform"
                >
                  <Icon icon="lucide:share-2" className="w-4 h-4 mr-2"/> Share
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
