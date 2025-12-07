"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import { Copy, Check, ShieldAlert, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Loader from "@/app/(components)/Loader";
import { useWallet } from "../WalletContext";
import toast from "react-hot-toast";

export default function ReceivePage() {
  useTelegramBackButton("/wallet");
  const { walletAddress } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(walletAddress)}&text=${encodeURIComponent("My Quantum Club Wallet Address")}`;

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
    <div className="min-h-screen bg-black text-white p-4 flex flex-col items-center pt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Receive Assets</h1>
          <p className="text-gray-400 text-sm">
            Scan QR code or copy address to receive tokens and NFTs
          </p>
        </div>

        <Card className="bg-[#111] border-[#222] overflow-hidden">
          <CardContent className="flex flex-col items-center p-8 space-y-8">
            <div className="relative group">
              <div className="absolute -inset-4 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-white p-4 rounded-2xl shadow-xl">
                <QRCode
                  value={walletAddress}
                  size={200}
                  level="H"
                  className="w-full h-full"
                />
              </div>
            </div>

            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-400 px-1">
                <span>Your Address</span>
                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">TON</span>
              </div>
              <div
                onClick={copyAddress}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 flex items-center justify-between gap-3 hover:bg-[#222] hover:border-[#444] transition-all group cursor-pointer"
              >
                <p className="text-sm text-gray-300 font-mono break-all leading-relaxed">
                  {walletAddress}
                </p>
                <div className="shrink-0 text-gray-500 group-hover:text-white transition-colors pl-2">
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={copyAddress}
            className="bg-white text-black hover:bg-gray-200 h-12 rounded-xl font-bold transition-all shadow-lg shadow-white/5"
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
            variant="outline"
            className="bg-[#1a1a1a] border-[#333] text-white hover:bg-[#222] hover:text-white h-12 rounded-xl font-bold transition-all"
          >
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-yellow-500">Network Warning</h4>
            <p className="text-xs text-yellow-500/80 leading-relaxed">
              Send only TON, TON-based tokens, and NFTs to this address. Sending other assets may result in permanent loss.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
