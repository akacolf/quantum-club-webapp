"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ShieldAlert, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Loader from "@/app/(components)/Loader";
import { useWallet } from "../WalletContext";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CHAIN_INFO, ChainType, deriveEthAddress, deriveBtcAddress } from "../utils/multichain";
import QRCodeStyling from "qr-code-styling";

export default function ReceivePage() {
  useTelegramBackButton("/wallet");
  const { walletAddress, isTestnet } = useWallet();
  const [copied, setCopied] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainType>("ton");
  const [ethAddress, setEthAddress] = useState<string>("");
  const [btcAddress, setBtcAddress] = useState<string>("");
  const qrRef = useRef<HTMLDivElement>(null);

  // Reset to TON when entering testnet mode
  useEffect(() => {
    if (isTestnet && selectedChain !== "ton") {
      setSelectedChain("ton");
    }
  }, [isTestnet, selectedChain]);

  // Get the current address based on selected chain
  const getCurrentAddress = useCallback(() => {
    switch (selectedChain) {
      case "ton":
        return walletAddress;
      case "eth":
        return ethAddress;
      case "btc":
        return btcAddress;
      default:
        return walletAddress;
    }
  }, [selectedChain, walletAddress, ethAddress, btcAddress]);

  // Derive ETH/BTC addresses from stored mnemonic (always mainnet)
  useEffect(() => {
    const storedMnemonic = localStorage.getItem("quantum_wallet_mnemonic");
    if (storedMnemonic) {
      try {
        const eth = deriveEthAddress(storedMnemonic);
        const btc = deriveBtcAddress(storedMnemonic, false); // Always mainnet (bc1...)
        setEthAddress(eth);
        setBtcAddress(btc);
      } catch (error) {
        console.error("Failed to derive addresses:", error);
      }
    }
  }, []);

  // Initialize and update QR code
  useEffect(() => {
    const address = getCurrentAddress();
    if (!address || !qrRef.current) return;

    const chainInfo = CHAIN_INFO[selectedChain];

    // Clear and recreate for consistency across chains
    qrRef.current.innerHTML = "";

    const qrCode = new QRCodeStyling({
      width: 250,
      height: 250,
      type: "svg",
      data: address,
      image: chainInfo.logo,
      dotsOptions: {
        color: "#000000",
        type: "rounded",
      },
      cornersSquareOptions: {
        color: "#000000",
        type: "extra-rounded",
      },
      cornersDotOptions: {
        color: "#000000",
        type: "dot",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 5,
        imageSize: 0.3,
      },
      qrOptions: {
        errorCorrectionLevel: "H",
      },
    });

    qrCode.append(qrRef.current);

    // Force SVG to exact dimensions
    const svgElement = qrRef.current.querySelector("svg");
    if (svgElement) {
      svgElement.setAttribute("width", "250");
      svgElement.setAttribute("height", "250");
    }
  }, [selectedChain, getCurrentAddress]);




  const currentAddress = getCurrentAddress();
  const chainInfo = CHAIN_INFO[selectedChain];

  const copyAddress = () => {
    if (currentAddress) {
      navigator.clipboard.writeText(currentAddress);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(currentAddress)}&text=${encodeURIComponent(`My ${chainInfo.name} Wallet Address`)}`;

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
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col items-center pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Receive Assets</h1>
          <p className="text-muted-foreground text-sm">
            {isTestnet ? "Testnet mode - Receive test TON only" : "Select a network and share your address"}
          </p>
        </div>

        {/* Network Selector - Only show all chains in mainnet mode */}
        <Tabs value={selectedChain} onValueChange={(v) => setSelectedChain(v as ChainType)}>
          <TabsList className={`grid w-full bg-muted border border-border ${isTestnet ? 'grid-cols-1' : 'grid-cols-3'}`}>
            <TabsTrigger
              value="ton"
              className="data-[state=active]:bg-[#0098EA] data-[state=active]:text-white data-[state=inactive]:text-muted-foreground"
            >
              TON {isTestnet && "(Testnet)"}
            </TabsTrigger>
            {!isTestnet && (
              <>
                <TabsTrigger
                  value="eth"
                  className="data-[state=active]:bg-[#627EEA] data-[state=active]:text-white data-[state=inactive]:text-muted-foreground"
                >
                  ETH
                </TabsTrigger>
                <TabsTrigger
                  value="btc"
                  className="data-[state=active]:bg-[#F7931A] data-[state=active]:text-white data-[state=inactive]:text-muted-foreground"
                >
                  BTC
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </Tabs>

        <Card className="bg-card border-border backdrop-blur-2xl overflow-hidden rounded-[32px] shadow-sm">
          <CardContent className="flex flex-col items-center p-8 space-y-8">
            <div className="relative group">
              <div className="absolute -inset-4 bg-muted/50 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="bg-white p-4 rounded-2xl shadow-lg relative">
                <div ref={qrRef} className="w-[250px] h-[250px]" />
              </div>
            </div>

            <div className="w-full space-y-3">
              <div className="flex items-center justify-between px-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Your Address
                </Label>
                <Badge
                  className="text-[10px] px-2 py-0.5 rounded-full border-none font-bold tracking-tight"
                  style={{
                    backgroundColor: chainInfo.color,
                    color: "white",
                  }}
                >
                  {chainInfo.symbol}
                </Badge>
              </div>
              <div
                onClick={copyAddress}
                className="w-full bg-muted/50 border border-border rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-muted hover:border-muted-foreground/20 transition-all group cursor-pointer"
              >
                <p className="text-sm text-foreground font-mono break-all leading-relaxed">
                  {currentAddress || (selectedChain !== "ton" ? "Derivation unavailable" : "Loading...")}
                </p>
                <div className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors pl-2">
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={copyAddress}
            disabled={!currentAddress}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-primary/5 disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" /> Copy Address
              </>
            )}
          </Button>
          <Button
            onClick={handleShare}
            disabled={!currentAddress}
            variant="outline"
            className="bg-muted text-muted-foreground hover:text-foreground hover:bg-accent border-border h-12 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
        </div>

        <Alert variant="warning" className="border-yellow-500/20">
          <ShieldAlert className="w-5 h-5" />
          <AlertTitle className="text-sm font-bold">Network Warning</AlertTitle>
          <AlertDescription className="text-xs opacity-80 leading-relaxed">
            {chainInfo.warningText} Sending other assets may result in permanent loss.
          </AlertDescription>
        </Alert>
      </motion.div>
    </div >
  );
}
