"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { analyticsEvents } from "@/lib/telegramAnalytics";
import { useWallet } from "../WalletContext";

export default function VerifyPhrasePage() {
  useTelegramBackButton("/wallet/backup");
  const router = useRouter();
  const { addWallet, switchWallet, storedWallets } = useWallet();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [verificationWords, setVerificationWords] = useState<{ index: number, word: string }[]>([]);
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

      // Add to multi-wallet storage
      const walletName = `Wallet ${storedWallets.length + 1}`;
      addWallet(walletAddress, walletName);
      switchWallet(walletAddress);

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
    <div className="min-h-screen bg-background text-foreground p-4 pt-6">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center ring-1 ring-primary/20">
              <Check className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Verify Your Phrase</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Enter the correct words from your recovery phrase to verify you saved it.
            </p>
          </div>

          {/* Verification Inputs */}
          <div className="space-y-4">
            {verificationWords.map((item, i) => (
              <div key={item.index} className="space-y-2">
                <Label className="text-sm text-muted-foreground ml-1">
                  Word #{item.index + 1}
                </Label>
                <Input
                  type="text"
                  value={userInputs[i]}
                  onChange={(e) => {
                    const newInputs = [...userInputs];
                    newInputs[i] = e.target.value;
                    setUserInputs(newInputs);
                  }}
                  placeholder={`Enter word #${item.index + 1}`}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-6 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-mono transition-colors"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full bg-card border-border text-foreground hover:bg-muted h-12 transition-colors"
            >
              Go Back
            </Button>

            <Button
              onClick={verifyAndSaveWallet}
              disabled={userInputs.some(input => !input.trim())}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verify & Create Wallet
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
