"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  Settings, 
  Key, 
  HelpCircle, 
  ChevronRight, 
  Trash2,
  AlertTriangle,
  Lock,
  FileText,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useGameContext } from "@/app/(contexts)/MiningContext";

export default function WalletSettingsPage() {
  useTelegramBackButton("/wallet");
  const router = useRouter();
  const { telegramId } = useGameContext();
  
  const [showResetPinConfirm, setShowResetPinConfirm] = useState(false);
  const [showDeleteWalletConfirm, setShowDeleteWalletConfirm] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleResetPin = useCallback(() => {
    if (telegramId) {
      localStorage.removeItem("quantum_wallet_pin_hash");
      localStorage.removeItem("quantum_wallet_credential_id");
      toast.success("PIN reset. You'll set a new PIN on next transaction.");
      setShowResetPinConfirm(false);
    }
  }, [telegramId]);

  const handleDeleteWallet = useCallback(() => {
    localStorage.removeItem("quantum_wallet_address");
    localStorage.removeItem("quantum_wallet_mnemonic");
    localStorage.removeItem("quantum_wallet_pin_hash");
    localStorage.removeItem("quantum_wallet_credential_id");
    toast.success("Wallet removed from this device");
    router.push("/wallet");
  }, [router]);

  const faqItems = [
    {
      question: "What is a recovery phrase?",
      answer: "A recovery phrase (also called seed phrase) is a 24-word sequence that can be used to restore your wallet on any device. It's the only way to recover your wallet if you lose access, so store it securely offline."
    },
    {
      question: "What is QNTM?",
      answer: "QNTM is the native points/token of Quantum Club. You can earn QNTM through mining, referrals, and completing tasks. QNTM can be transferred to other Quantum Club users instantly and for free."
    },
    {
      question: "What are network fees?",
      answer: "Network fees (gas fees) are small payments made to the TON blockchain to process your transactions. Fees vary based on network congestion and transaction complexity. Simple TON transfers cost ~0.003-0.007 TON, while Jetton transfers cost ~0.03-0.06 TON."
    },
    {
      question: "What is the QC service fee?",
      answer: "Quantum Club charges a 0.5% service fee on TON and Jetton transactions to support platform development and maintenance. QNTM transfers between users are completely free."
    },
    {
      question: "How do I backup my wallet?",
      answer: "Go to your wallet page and tap 'Backup Wallet' to view your 24-word recovery phrase. Write it down on paper and store it in a safe place. Never share it with anyone or store it digitally."
    },
    {
      question: "Is my wallet secure?",
      answer: "Your wallet is protected by biometric authentication (Face ID/Touch ID) or a PIN code. Your private keys are encrypted and stored locally on your device. We never have access to your funds or recovery phrase."
    },
    {
      question: "How do I send QNTM to another user?",
      answer: "Go to Wallet > Send QNTM. Enter the recipient's QC ID (they can find it in their Frens section or wallet) and the amount you want to send. QNTM transfers are instant and free!"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 pt-6 pb-24">
      <div className="max-w-lg mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center ring-1 ring-blue-500/20">
              <Settings className="w-7 h-7 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold">Wallet Settings</h1>
            <p className="text-gray-400 text-sm">Manage security and preferences</p>
          </div>

          {/* Security Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider ml-1">Security</h2>
            
            <Card className="bg-[#111] border-[#222] overflow-hidden">
              <CardContent className="p-0">
                <button
                  onClick={() => router.push("/wallet/backup")}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">Backup Recovery Phrase</p>
                      <p className="text-xs text-gray-500">View your 24-word seed phrase</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
                
                <div className="border-t border-[#222]" />
                
                <button
                  onClick={() => setShowResetPinConfirm(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                      <Key className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">Reset PIN / Biometrics</p>
                      <p className="text-xs text-gray-500">Set up new authentication</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Danger Zone */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider ml-1">Danger Zone</h2>
            
            <Card className="bg-[#111] border-red-500/20 overflow-hidden">
              <CardContent className="p-0">
                <button
                  onClick={() => setShowDeleteWalletConfirm(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-red-500/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-red-400">Remove Wallet</p>
                      <p className="text-xs text-gray-500">Delete wallet from this device</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-2">
              {faqItems.map((item, index) => (
                <Card 
                  key={index}
                  className="bg-[#111] border-[#222] overflow-hidden cursor-pointer"
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-white text-sm">{item.question}</p>
                      <ChevronRight 
                        className={`w-5 h-5 text-gray-500 shrink-0 transition-transform ${
                          expandedFaq === index ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                    {expandedFaq === index && (
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-xs text-gray-400 mt-3 leading-relaxed"
                      >
                        {item.answer}
                      </motion.p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="flex justify-center gap-4 pt-4">
            <a 
              href="https://t.me/QuantumClubAnn" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Announcements
            </a>
            <a 
              href="https://t.me/QuantumClubChat" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Community
            </a>
          </div>
        </motion.div>

        {/* Reset PIN Confirmation Modal */}
        {showResetPinConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowResetPinConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111] border border-[#333] rounded-2xl p-6 max-w-sm w-full space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
                  <Lock className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Reset PIN?</h3>
                  <p className="text-xs text-gray-400">You&apos;ll set a new PIN on next transaction</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowResetPinConfirm(false)}
                  className="bg-[#1a1a1a] border-[#333] text-white hover:opacity-80"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResetPin}
                  className="bg-orange-500 text-white hover:opacity-90"
                >
                  Reset
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Wallet Confirmation Modal */}
        {showDeleteWalletConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteWalletConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Remove Wallet?</h3>
                  <p className="text-xs text-gray-400">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs text-red-400 leading-relaxed">
                  <strong>Warning:</strong> Make sure you have backed up your recovery phrase. Without it, you will permanently lose access to your funds.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteWalletConfirm(false)}
                  className="bg-[#1a1a1a] border-[#333] text-white hover:opacity-80"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteWallet}
                  className="bg-red-500 text-white hover:opacity-90"
                >
                  Remove
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
