"use client";

import { useState, ClipboardEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Trash2, ShieldCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import { mnemonicToWalletKey, mnemonicValidate } from "@ton/crypto";
import { WalletContractV5R1 } from "@ton/ton";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useWallet } from "../WalletContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { analyticsEvents } from "@/lib/telegramAnalytics";

export default function ImportWalletPage() {
  useTelegramBackButton("/wallet");
  const router = useRouter();
  const { setWalletAddress } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string[]>(Array(24).fill(""));
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [isValidPhrase, setIsValidPhrase] = useState<boolean | null>(null);

  // Validate the entire phrase when all 24 words are filled
  useEffect(() => {
    const cleanedPhrase = seedPhrase.map(word => word.trim().toLowerCase());
    const allFilled = cleanedPhrase.every(word => word.length > 0);
    
    if (allFilled) {
      mnemonicValidate(cleanedPhrase).then(setIsValidPhrase);
    } else {
      setIsValidPhrase(null);
    }
  }, [seedPhrase]);

  const handleWordChange = (index: number, value: string) => {
    const newPhrase = [...seedPhrase];
    newPhrase[index] = value;
    setSeedPhrase(newPhrase);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>, index: number) => {
    const pastedText = e.clipboardData.getData("text");
    const words = pastedText.trim().split(/\s+/).filter(word => word.length > 0);

    if (words.length > 1) {
      e.preventDefault();
      const newPhrase = [...seedPhrase];
      words.forEach((word, i) => {
        const targetIndex = index + i;
        if (targetIndex < 24) {
          newPhrase[targetIndex] = word.toLowerCase().trim();
        }
      });
      setSeedPhrase(newPhrase);
      
      if (words.length >= 24) {
        toast.success("Recovery phrase pasted successfully!");
      }
    }
  };

  const handleClear = () => {
    setSeedPhrase(Array(24).fill(""));
    toast.success("All fields cleared");
  };

  const handleImport = async () => {
    setIsLoading(true);
    
    const cleanedPhrase = seedPhrase.map(word => word.trim().toLowerCase());
    
    if (cleanedPhrase.some(word => !word)) {
      toast.error("Please fill in all 24 words");
      setIsLoading(false);
      return;
    }

    try {
      const isValid = await mnemonicValidate(cleanedPhrase);
      if (!isValid) {
        toast.error("Invalid recovery phrase. Please check your words.");
        setIsLoading(false);
        return;
      }

      const keyPair = await mnemonicToWalletKey(cleanedPhrase);
      const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      
      const address = wallet.address.toString({ bounceable: false });
      
      localStorage.setItem("quantum_wallet_address", address);
      localStorage.setItem("quantum_wallet_mnemonic", cleanedPhrase.join(" "));
      setWalletAddress(address);
      
      // Track wallet import event
      analyticsEvents.walletImported(address);
      
      toast.success("Wallet imported successfully!");
      router.push("/wallet");
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import wallet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
              <ShieldCheck className="w-7 h-7 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold">Import Wallet</h1>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              Enter your 24-word secret recovery phrase
            </p>
          </div>

          {/* Header Row with Clear Button */}
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="bg-[#111] border-[#222] text-gray-300 hover:text-white hover:bg-[#1a1a1a] gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          </div>

          {/* Seed Phrase Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {seedPhrase.map((word, i) => (
              <div 
                key={i} 
                className={`relative transition-all duration-200 ${
                  activeWordIndex === i ? 'scale-105 z-10' : ''
                }`}
              >
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono select-none pointer-events-none z-10">
                  {i + 1}.
                </span>
                <Input
                  type="text"
                  value={word}
                  onFocus={() => setActiveWordIndex(i)}
                  onBlur={() => setActiveWordIndex(null)}
                  onChange={(e) => handleWordChange(i, e.target.value)}
                  onPaste={(e) => handlePaste(e, i)}
                  className={`
                    bg-[#0a0a0a] border-[#222] pl-8 pr-2 h-10 text-xs font-medium text-white rounded-lg
                    transition-all duration-200
                    focus:border-blue-500/50 focus:bg-[#111] focus:ring-1 focus:ring-blue-500/20
                    ${word ? 'border-white/20' : ''}
                  `}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>
            ))}
          </div>

          {/* Validation Status */}
          {isValidPhrase !== null && (
            <div className={`p-3 rounded-xl flex items-center gap-2 ${
              isValidPhrase 
                ? 'bg-green-500/10 border border-green-500/20' 
                : 'bg-red-500/10 border border-red-500/20'
            }`}>
              {isValidPhrase ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-400">Valid recovery phrase</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-400">Invalid recovery phrase - please check your words</span>
                </>
              )}
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-yellow-500 shrink-0" />
            <p className="text-xs text-yellow-200/80 leading-relaxed">
              Ensure you are in a private location. Never share your recovery phrase with anyone. 
              Quantum Club support will never ask for it.
            </p>
          </div>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={isLoading}
            className="w-full bg-white text-black hover:bg-gray-200 h-12 font-bold rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <ButtonLoader /> : "Import Wallet"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
