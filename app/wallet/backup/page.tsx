"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Copy, Check, Eye, EyeOff, ShieldAlert, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

export default function BackupPhrasePage() {
  useTelegramBackButton("/wallet");
  const router = useRouter();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Get the pending wallet data from session storage
    const pendingMnemonic = sessionStorage.getItem("pending_wallet_mnemonic");
    const pendingAddress = sessionStorage.getItem("pending_wallet_address");
    
    if (!pendingMnemonic || !pendingAddress) {
      // No pending wallet, redirect back
      router.push("/wallet");
      return;
    }

    setMnemonic(pendingMnemonic.split(" "));
  }, [router]);

  const copyMnemonic = () => {
    if (mnemonic.length > 0) {
      navigator.clipboard.writeText(mnemonic.join(" "));
      toast.success("Recovery phrase copied! Store it safely.");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinue = () => {
    // Generate 3 random word indices for verification and store them
    const indices: number[] = [];
    while (indices.length < 3) {
      const randomIndex = Math.floor(Math.random() * 24);
      if (!indices.includes(randomIndex)) {
        indices.push(randomIndex);
      }
    }
    indices.sort((a, b) => a - b);
    
    // Store verification indices
    sessionStorage.setItem("verification_indices", JSON.stringify(indices));
    
    router.push("/wallet/verify");
  };

  if (mnemonic.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pt-6">
      <div className="max-w-lg mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center ring-1 ring-blue-500/20">
              <ShieldAlert className="w-7 h-7 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold">Secret Recovery Phrase</h1>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              This is the only way to recover your wallet. Write it down and keep it safe.
            </p>
          </div>

          {/* Mnemonic Grid */}
          <div className="relative">
            <ScrollArea className="h-64 rounded-xl border border-[#222] bg-[#0a0a0a]">
              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 transition-all duration-500 ${!isRevealed ? 'blur-md select-none opacity-50' : 'opacity-100'}`}>
                {mnemonic.map((word, i) => (
                  <div key={i} className="flex items-center space-x-2 bg-[#111] border border-[#222] rounded-lg px-3 py-2.5">
                    <span className="text-[10px] font-mono text-gray-600 w-4 select-none">{i + 1}.</span>
                    <span className="text-sm font-medium text-gray-200 font-mono">{word}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {!isRevealed && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Button 
                  onClick={() => setIsRevealed(true)}
                  variant="secondary"
                  className="bg-[#222] border border-[#333] text-white hover:bg-[#333] shadow-xl"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Reveal Phrase
                </Button>
              </div>
            )}
            
            {isRevealed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRevealed(false)}
                className="absolute -top-3 -right-3 text-gray-500 hover:text-white h-8 w-8 p-0 bg-[#111] rounded-full border border-[#333]"
              >
                <EyeOff className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={copyMnemonic}
              variant="outline"
              className="w-full bg-[#111] border-[#222] text-gray-300 hover:text-white hover:bg-[#1a1a1a] h-12 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied to Clipboard" : "Copy to Clipboard"}
            </Button>

            <Button
              onClick={handleContinue}
              className="w-full bg-white text-black hover:bg-gray-200 h-12 font-bold transition-all"
            >
              Continue to Verify
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
