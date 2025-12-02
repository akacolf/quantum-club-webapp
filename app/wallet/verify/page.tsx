"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { analyticsEvents } from "@/lib/telegramAnalytics";

export default function VerifyPhrasePage() {
  useTelegramBackButton("/wallet/backup");
  const router = useRouter();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [verificationWords, setVerificationWords] = useState<{index: number, word: string}[]>([]);
  const [userInputs, setUserInputs] = useState<string[]>(["", "", ""]);

  useEffect(() => {
    // Get the pending wallet data and verification indices from session storage
    const pendingMnemonic = sessionStorage.getItem("pending_wallet_mnemonic");
    const pendingAddress = sessionStorage.getItem("pending_wallet_address");
    const indices = sessionStorage.getItem("verification_indices");
    
    if (!pendingMnemonic || !pendingAddress || !indices) {
      // No pending wallet or indices, redirect back
      router.push("/wallet");
      return;
    }

    const mnemonicArr = pendingMnemonic.split(" ");
    const indicesArr: number[] = JSON.parse(indices);
    
    setMnemonic(mnemonicArr);
    setWalletAddress(pendingAddress);
    setVerificationWords(indicesArr.map(i => ({ index: i, word: mnemonicArr[i] })));
  }, [router]);

  const verifyAndSaveWallet = () => {
    // Check if all inputs match the expected words
    const allCorrect = verificationWords.every((item, i) => 
      userInputs[i].toLowerCase().trim() === item.word.toLowerCase()
    );
    
    if (!allCorrect) {
      toast.error("Incorrect words. Please check your recovery phrase and try again.");
      return;
    }

    // Save to local storage ONLY after user confirms they have saved the phrase
    if (walletAddress && mnemonic.length > 0) {
      localStorage.setItem("quantum_wallet_address", walletAddress);
      localStorage.setItem("quantum_wallet_mnemonic", mnemonic.join(" "));
      
      // Clean up session storage
      sessionStorage.removeItem("pending_wallet_mnemonic");
      sessionStorage.removeItem("pending_wallet_address");
      sessionStorage.removeItem("verification_indices");
      
      // Track wallet creation event
      analyticsEvents.walletCreated(walletAddress);
      
      toast.success("Wallet created successfully!");
      router.push("/wallet");
    } else {
      toast.error("Error confirming wallet. Please try again.");
    }
  };

  const handleGoBack = () => {
    setUserInputs(["", "", ""]);
    router.push("/wallet/backup");
  };

  if (verificationWords.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pt-6">
      <div className="max-w-lg mx-auto">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
        >
          <Card className="bg-[#111] border-[#333] text-white shadow-2xl overflow-hidden">
            <CardHeader className="pb-4 text-center border-b border-[#222] bg-[#151515]">
              <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-3 ring-1 ring-green-500/20">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <CardTitle className="text-xl font-bold">Verify Your Phrase</CardTitle>
              <CardDescription className="text-gray-400 max-w-xs mx-auto mt-2 text-sm">
                Enter the correct words from your recovery phrase to verify you saved it.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                {verificationWords.map((item, i) => (
                  <div key={item.index} className="space-y-2">
                    <label className="text-sm text-gray-400">
                      Word #{item.index + 1}
                    </label>
                    <input
                      type="text"
                      value={userInputs[i]}
                      onChange={(e) => {
                        const newInputs = [...userInputs];
                        newInputs[i] = e.target.value;
                        setUserInputs(newInputs);
                      }}
                      placeholder={`Enter word #${item.index + 1}`}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-mono"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 pb-20">
                <Button
                  onClick={handleGoBack}
                  variant="outline"
                  className="w-full bg-[#1a1a1a] border-[#333] text-gray-300 hover:text-white hover:bg-[#222] h-11 transition-colors"
                >
                  Go Back
                </Button>

                <Button
                  onClick={verifyAndSaveWallet}
                  disabled={userInputs.some(input => !input.trim())}
                  className="w-full bg-white text-black hover:bg-gray-200 h-11 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify & Create Wallet
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
