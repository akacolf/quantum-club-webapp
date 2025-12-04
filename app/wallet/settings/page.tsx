"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  Settings, 
  HelpCircle, 
  ChevronRight, 
  Trash2,
  AlertTriangle,
  FileText,
  Shield,
  ExternalLink,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

export default function WalletSettingsPage() {
  useTelegramBackButton("/wallet");
  const router = useRouter();
  
  const [showDeleteWalletConfirm, setShowDeleteWalletConfirm] = useState(false);

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
      question: "How do I reset my PIN?",
      answer: "To reset your PIN, go to Wallet Settings > Remove Wallet. Then re-import your wallet using your 24-word recovery phrase. During the import process, you'll be prompted to set up a new PIN. Make sure you have your recovery phrase backed up before removing your wallet."
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
      answer: "Go to Wallet Settings > Backup Recovery Phrase to view your 24-word seed phrase. Write it down on paper and store it in a safe place. Never share it with anyone or store it digitally."
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
                  onClick={() => router.push("/wallet/settings/recovery-phrase")}
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
                  onClick={() => router.push("/wallet/settings/wallets")}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">Manage Wallets</p>
                      <p className="text-xs text-gray-500">Add, switch, or remove wallets</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Legal Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider ml-1">Legal</h2>
            
            <Card className="bg-[#111] border-[#222] overflow-hidden">
              <CardContent className="p-0">
                <button
                  onClick={() => router.push("/wallet/settings/terms")}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">Terms of Service</p>
                      <p className="text-xs text-gray-500">Read our terms and conditions</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
                
                <div className="border-t border-[#222]" />
                
                <button
                  onClick={() => router.push("/wallet/settings/privacy")}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">Privacy Policy</p>
                      <p className="text-xs text-gray-500">How we handle your data</p>
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
            
            <Accordion type="single" collapsible className="space-y-2">
              {faqItems.map((item, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-[#111] border border-[#222] rounded-xl overflow-hidden px-4"
                >
                  <AccordionTrigger className="text-sm font-medium text-white hover:no-underline py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-gray-400 leading-relaxed pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Links */}
          <div className="flex justify-center pt-4">
            <a 
              href="https://t.me/quantumclubinc" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Announcements and community
            </a>
          </div>
        </motion.div>

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
