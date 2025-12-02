"use client";

import { useState, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, User, Info, ArrowRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { useGameContext } from "@/app/(contexts)/MiningContext";

export default function SendQNTMPage() {
  useTelegramBackButton("/wallet");
  const router = useRouter();
  const { telegramId, MainQuantAmount, SetMainQuantAmount } = useGameContext();
  
  // Biometric authentication hook
  const { isOpen: isAuthOpen, requestAuth, handleSuccess: handleAuthSuccess, handleCancel: handleAuthCancel } = useBiometricAuth();

  // State
  const [step, setStep] = useState<"input" | "confirm" | "processing" | "success">("input");
  const [recipientQcId, setRecipientQcId] = useState("");
  const [amount, setAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState(false);

  // Parse balance (remove commas)
  const currentBalance = parseFloat(MainQuantAmount.replace(/,/g, '')) || 0;

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      // Check if exceeds balance
      const numValue = parseFloat(value) || 0;
      setInsufficientFunds(numValue > currentBalance);
    }
  };

  const handleMaxAmount = () => {
    setAmount(currentBalance.toString());
    setInsufficientFunds(false);
  };

  const validateInput = () => {
    if (!recipientQcId.trim()) {
      toast.error("Please enter recipient's QC ID");
      return false;
    }
    if (recipientQcId.trim() === telegramId) {
      toast.error("Cannot transfer to yourself");
      return false;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return false;
    }
    if (parseFloat(amount) > currentBalance) {
      toast.error("Insufficient QNTM balance");
      setInsufficientFunds(true);
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (validateInput()) {
      setStep("confirm");
    }
  };

  const handleConfirmTransfer = async () => {
    // Request biometric/PIN authentication
    const authenticated = await requestAuth();
    
    if (authenticated) {
      await executeTransfer();
    } else {
      toast.error("Authentication required to transfer QNTM");
    }
  };

  const executeTransfer = async () => {
    setIsTransferring(true);
    setStep("processing");

    try {
      const response = await fetch("/api/transfer-qntm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderTelegramId: telegramId,
          recipientQcId: recipientQcId.trim(),
          amount: parseFloat(amount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transfer failed");
      }

      // Update local balance
      const newBalance = data.newBalance;
      const formattedBalance = newBalance.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      SetMainQuantAmount(formattedBalance);
      localStorage.setItem("QAmount", formattedBalance);

      setStep("success");
      toast.success("QNTM transferred successfully!");
    } catch (error) {
      console.error("Transfer failed:", error);
      toast.error(error instanceof Error ? error.message : "Transfer failed");
      setStep("confirm");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 pt-6">
      <div className="max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">Send QNTM</h1>
          <p className="text-sm text-gray-500 mt-1">Transfer to another Quantum Club user</p>
        </div>

        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Current Balance */}
              <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center border border-orange-500/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32" className="text-white">
                        <path fill="currentColor" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Your QNTM Balance</h4>
                      <p className="text-xs text-gray-400">Available to send</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-orange-400 text-lg">{MainQuantAmount}</h4>
                  </div>
                </CardContent>
              </Card>

              {/* Recipient QC ID */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Recipient&apos;s QC ID</label>
                <div className="relative">
                  <Input
                    value={recipientQcId}
                    onChange={(e) => setRecipientQcId(e.target.value)}
                    placeholder="Enter recipient's Quantum Club ID"
                    className="bg-[#111] border-[#222] h-14 pl-4 pr-10 text-white placeholder:text-gray-600 rounded-xl focus:border-orange-500/50 transition-all"
                  />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>
                <p className="text-xs text-gray-500 ml-1">Ask the recipient to share their QC ID from the Frens section</p>
              </div>

              {/* Your QC ID - for sharing */}
              <div className="bg-[#111] rounded-xl p-4 border border-[#222]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Your QC ID (share to receive QNTM)</span>
                  <button
                    onClick={() => {
                      if (telegramId) {
                        navigator.clipboard.writeText(telegramId);
                        toast.success("Copy successful");
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <p className="text-sm text-white font-mono break-all select-all">{telegramId || "Loading..."}</p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm text-gray-400">Amount</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{MainQuantAmount} QNTM</span>
                    <button 
                      onClick={handleMaxAmount}
                      className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors uppercase"
                    >
                      Max
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className={`bg-[#111] border-[#222] h-14 pl-4 pr-20 text-2xl font-bold text-white placeholder:text-gray-700 rounded-xl transition-all ${
                      insufficientFunds ? 'border-red-500 focus:border-red-500' : 'focus:border-orange-500/50'
                    }`}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="text-sm font-bold text-orange-400">QNTM</div>
                  </div>
                </div>
                {insufficientFunds && (
                  <p className="text-xs text-red-500 ml-1 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Insufficient funds. You have {MainQuantAmount} QNTM available.
                  </p>
                )}
              </div>

              <Button
                onClick={handleContinue}
                disabled={!recipientQcId || !amount || parseFloat(amount) <= 0 || insufficientFunds}
                className="w-full h-14 bg-gradient-to-r from-orange-500 to-yellow-500 text-black hover:from-orange-600 hover:to-yellow-600 rounded-xl font-bold text-lg mt-8 disabled:opacity-50"
              >
                Continue
              </Button>
            </motion.div>
          )}

          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card className="bg-[#111] border-[#222] overflow-hidden">
                <CardContent className="p-6 space-y-6">
                  <div className="text-center space-y-1">
                    <div className="text-sm text-gray-400">You are sending</div>
                    <div className="text-3xl font-bold text-white">
                      {parseFloat(amount).toLocaleString()} <span className="text-orange-400">QNTM</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4 py-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-[#222] rounded-full flex items-center justify-center mx-auto mb-2">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                      <span className="text-xs text-gray-500">You</span>
                    </div>
                    <ArrowRight className="w-6 h-6 text-orange-400" />
                    <div className="text-center">
                      <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <User className="w-6 h-6 text-orange-400" />
                      </div>
                      <span className="text-xs text-gray-500">Recipient</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[#222]">
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-gray-400">To (QC ID)</span>
                      <div className="text-right flex-1 pl-8">
                        <div className="text-sm font-mono text-white break-all">{recipientQcId}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Network Fee</span>
                      <span className="text-sm text-green-400">Free</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-400/90 leading-relaxed">
                  QNTM transfers between Quantum Club users are instant and free. Please verify the recipient&apos;s QC ID carefully.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setStep("input")}
                  className="h-14 bg-[#111] border-[#333] text-white hover:bg-[#1a1a1a] rounded-xl font-bold"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmTransfer}
                  disabled={isTransferring}
                  className="h-14 bg-gradient-to-r from-orange-500 to-yellow-500 text-black hover:from-orange-600 hover:to-yellow-600 rounded-xl font-bold"
                >
                  {isTransferring ? (
                    <div className="flex items-center gap-2">
                      <ButtonLoader />
                      Sending...
                    </div>
                  ) : (
                    "Confirm & Send"
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 space-y-6"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" className="text-orange-500">
                    <path fill="currentColor" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-white">Processing Transfer</h3>
                <p className="text-sm text-gray-500 mt-1">Please wait...</p>
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 space-y-6"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white">Transfer Complete!</h3>
                <p className="text-gray-400 text-sm">
                  {parseFloat(amount).toLocaleString()} QNTM sent successfully
                </p>
              </div>
              <Button
                onClick={() => router.push("/wallet")}
                className="w-full h-14 bg-white text-black hover:bg-gray-200 rounded-xl font-bold mt-4"
              >
                Back to Wallet
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Biometric Auth Modal */}
        <BiometricAuth
          isOpen={isAuthOpen}
          onSuccess={handleAuthSuccess}
          onCancel={handleAuthCancel}
        />
      </div>
    </div>
  );
}
